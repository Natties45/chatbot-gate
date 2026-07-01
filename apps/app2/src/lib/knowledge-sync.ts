import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { getSettings, saveSetting } from './settings-db';
import { getErrorMessage } from './api-error';

const execAsync = promisify(exec);

export interface KnowledgeSyncStatus {
  repoPath: string;
  lastSyncAt: string;
  lastCommit: string;
  status: 'synced' | 'syncing' | 'error' | 'not_configured';
  lastLog: string;
  indexStatus: 'ready' | 'building' | 'error' | 'not_built';
  indexLastBuiltAt: string;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  error?: Error;
}

async function runGitCmd(cmd: string, cwd: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      timeout: 120000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return { stdout, stderr };
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || '',
      error: err,
    };
  }
}

export async function getKnowledgeSyncStatus(): Promise<KnowledgeSyncStatus> {
  const settings = await getSettings();
  const repoPath = settings['knowledge.repoPath'] || process.env.KNOWLEDGE_REPO_PATH || '/root/openstack-support';
  const lastSyncAt = settings['knowledge.lastSyncAt'] || '';
  const lastCommit = settings['knowledge.lastCommit'] || 'None';
  const lastLog = settings['knowledge.lastLog'] || '';
  const indexStatus = (settings['knowledge.indexStatus'] || 'not_built') as KnowledgeSyncStatus['indexStatus'];
  const indexLastBuiltAt = settings['knowledge.indexLastBuiltAt'] || '';

  let status: KnowledgeSyncStatus['status'] = 'not_configured';

  try {
    await fs.access(path.join(repoPath, '.git'));
    status = 'synced';
  } catch {
    return {
      repoPath,
      lastSyncAt,
      lastCommit,
      status: 'not_configured',
      lastLog: 'Knowledge repo path does not exist or is not a git repository.',
      indexStatus,
      indexLastBuiltAt,
    };
  }

  const statusRes = await runGitCmd('git status --porcelain', repoPath);
  if (statusRes.error) {
    status = 'error';
  } else if (statusRes.stdout.trim() !== '') {
    status = 'synced';
  }

  return {
    repoPath,
    lastSyncAt,
    lastCommit,
    status,
    lastLog,
    indexStatus,
    indexLastBuiltAt,
  };
}

export async function pullLatestKnowledge(): Promise<KnowledgeSyncStatus> {
  const settings = await getSettings();
  const repoPath = settings['knowledge.repoPath'] || process.env.KNOWLEDGE_REPO_PATH || '/root/openstack-support';
  const branch = settings['knowledge.branch'] || 'main';

  let logOutput = `[${new Date().toISOString()}] Pulling latest knowledge...\n`;

  try {
    const fetchRes = await runGitCmd(`git fetch origin ${branch}`, repoPath);
    logOutput += `Fetch: ${fetchRes.stdout}\n${fetchRes.stderr}\n`;
    if (fetchRes.error) throw new Error(`Fetch failed: ${fetchRes.stderr}`);

    const pullRes = await runGitCmd(`git pull origin ${branch} --ff-only`, repoPath);
    logOutput += `Pull: ${pullRes.stdout}\n${pullRes.stderr}\n`;
    if (pullRes.error) throw new Error(`Pull failed: ${pullRes.stderr}`);

    const commitRes = await runGitCmd('git log -1 --format="%h - %s (%ci)"', repoPath);
    const lastCommit = commitRes.error ? 'Unknown' : commitRes.stdout.trim();

    await saveSetting('knowledge.lastSyncAt', new Date().toISOString());
    await saveSetting('knowledge.lastCommit', lastCommit);
    await saveSetting('knowledge.lastLog', logOutput.slice(-5000));

    return {
      repoPath,
      lastSyncAt: new Date().toISOString(),
      lastCommit,
      status: 'synced',
      lastLog: logOutput,
      indexStatus: (settings['knowledge.indexStatus'] || 'not_built') as KnowledgeSyncStatus['indexStatus'],
      indexLastBuiltAt: settings['knowledge.indexLastBuiltAt'] || '',
    };
  } catch (error) {
    const message = getErrorMessage(error);
    logOutput += `[ERROR] ${message}\n`;
    await saveSetting('knowledge.lastLog', logOutput.slice(-5000));

    return {
      repoPath,
      lastSyncAt: settings['knowledge.lastSyncAt'] || '',
      lastCommit: settings['knowledge.lastCommit'] || 'None',
      status: 'error',
      lastLog: logOutput,
      indexStatus: (settings['knowledge.indexStatus'] || 'not_built') as KnowledgeSyncStatus['indexStatus'],
      indexLastBuiltAt: settings['knowledge.indexLastBuiltAt'] || '',
    };
  }
}

export async function rebuildKnowledgeIndex(): Promise<KnowledgeSyncStatus> {
  const settings = await getSettings();
  const repoPath = settings['knowledge.repoPath'] || process.env.KNOWLEDGE_REPO_PATH || '/root/openstack-support';

  let logOutput = `[${new Date().toISOString()}] Rebuilding knowledge index...\n`;

  try {
    // For now, just verify the repo exists and is readable
    // In the future, this could trigger actual index building via kb-mcp
    await fs.access(repoPath);
    const files = await fs.readdir(repoPath);
    logOutput += `Found ${files.length} files/directories in knowledge repo.\n`;

    await saveSetting('knowledge.indexStatus', 'ready');
    await saveSetting('knowledge.indexLastBuiltAt', new Date().toISOString());

    const currentStatus = await getKnowledgeSyncStatus();
    return {
      ...currentStatus,
      indexStatus: 'ready',
      indexLastBuiltAt: new Date().toISOString(),
      lastLog: logOutput,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    logOutput += `[ERROR] ${message}\n`;
    await saveSetting('knowledge.indexStatus', 'error');
    await saveSetting('knowledge.lastLog', logOutput.slice(-5000));

    const currentStatus = await getKnowledgeSyncStatus();
    return {
      ...currentStatus,
      indexStatus: 'error',
      lastLog: logOutput,
    };
  }
}

export async function executeKnowledgeSyncAction(
  action: 'check_status' | 'pull_latest' | 'rebuild_index',
  adminUsername: string
): Promise<KnowledgeSyncStatus> {
  const settings = await getSettings();
  const repoPath = settings['knowledge.repoPath'] || process.env.KNOWLEDGE_REPO_PATH || '/root/openstack-support';

  // Ensure repo path exists
  try {
    await fs.mkdir(repoPath, { recursive: true });
  } catch {
    // Ignore if already exists
  }

  switch (action) {
    case 'check_status':
      return getKnowledgeSyncStatus();

    case 'pull_latest':
      return pullLatestKnowledge();

    case 'rebuild_index':
      return rebuildKnowledgeIndex();

    default:
      throw new Error(`Unknown knowledge sync action: ${action}`);
  }
}
