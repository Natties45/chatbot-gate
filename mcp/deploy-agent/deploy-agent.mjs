import http from 'http';
import fs from 'fs/promises';
import { spawn } from 'child_process';

const PORT = Number(process.env.PORT || 4105);
const REPO_PATH = process.env.DEPLOY_REPO_PATH || '/root/chatbot-gate';
const COMPOSE_FILE = `${REPO_PATH}/docker-compose.yml`;
const HISTORY_FILE = process.env.DEPLOY_HISTORY_FILE || '/tmp/deploy-agent-history.json';
const HEALTH_URL = process.env.APP2_HEALTH_URL || 'http://app2:3001/app2/api/health';
const TAG_PATTERN = /^v?\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9._-]+)?$/;

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function run(command, args, cwd = REPO_PATH) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function readHistory() {
  try {
    return JSON.parse(await fs.readFile(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function writeHistory(entry) {
  const history = await readHistory();
  history.unshift(entry);
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history.slice(0, 10), null, 2));
}

async function latestTag() {
  const result = await run('git', ['tag', '--sort=-creatordate']);
  return result.stdout.split('\n').map((line) => line.trim()).filter(Boolean)[0] || '';
}

async function currentVersion() {
  try {
    const content = await fs.readFile(`${REPO_PATH}/apps/app2/package.json`, 'utf8');
    return JSON.parse(content).version || '';
  } catch {
    return '';
  }
}

async function healthCheck() {
  try {
    const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(10000) });
    const data = await response.json().catch(() => ({}));
    return response.ok && data.status === 'ok';
  } catch {
    return false;
  }
}

async function deploy(tag) {
  if (!TAG_PATTERN.test(tag)) {
    return { success: false, error: 'Invalid tag format' };
  }

  const startedAt = Date.now();
  const log = [];
  const step = async (label, command, args) => {
    log.push(`[deploy-agent] ${label}`);
    const result = await run(command, args);
    log.push(result.stdout.trim());
    if (result.stderr.trim()) log.push(result.stderr.trim());
    if (result.code !== 0) throw new Error(`${label} failed`);
  };

  try {
    await step('git fetch --tags', 'git', ['fetch', '--tags']);
    await step(`git checkout ${tag}`, 'git', ['checkout', tag]);
    await step('docker compose build app2', 'docker', ['compose', '-f', COMPOSE_FILE, 'build', 'app2']);
    await step('docker compose up -d app2', 'docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d', 'app2']);
    log.push('[deploy-agent] wait 15s');
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const healthy = await healthCheck();
    if (!healthy) {
      log.push('[deploy-agent] health check failed, rolling back to cached app2 image');
      await run('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d', 'app2']);
      throw new Error('Health check failed');
    }

    const entry = { tag, status: 'success', timestamp: new Date().toISOString(), duration: Date.now() - startedAt };
    await writeHistory(entry);
    return { success: true, version: tag, builtAt: new Date().toISOString(), healthCheck: 'ok', log: log.filter(Boolean).join('\n') };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Deploy failed';
    const entry = { tag, status: 'failed', timestamp: new Date().toISOString(), duration: Date.now() - startedAt, error: message };
    await writeHistory(entry);
    return { success: false, version: tag, error: message, healthCheck: 'failed', log: log.filter(Boolean).join('\n') };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/status') {
    const [version, tag] = await Promise.all([currentVersion(), latestTag()]);
    return json(res, 200, { currentVersion: version, latestTag: tag, updateAvailable: Boolean(tag && !tag.endsWith(version)), repoStatus: 'unknown' });
  }

  if (req.method === 'GET' && url.pathname === '/history') {
    return json(res, 200, { deploys: await readHistory() });
  }

  const match = url.pathname.match(/^\/deploy\/app2\/(.+)$/);
  if (req.method === 'POST' && match) {
    const result = await deploy(decodeURIComponent(match[1]));
    return json(res, result.success ? 200 : 500, result);
  }

  return json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[deploy-agent] listening on ${PORT}`);
});
