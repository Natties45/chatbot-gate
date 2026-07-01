import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { getSettings, saveSetting } from './settings-db';
import { getErrorMessage } from './api-error';

const execAsync = promisify(exec);

interface CommandError extends Error {
  stdout?: string;
  stderr?: string;
}

export interface GitStatusResult {
  repoUrl: string;
  branch: string;
  localPath: string;
  lastSyncAt: string;
  lastCommit: string;
  status: 'synced' | 'dirty' | 'syncing' | 'error' | 'not_configured';
  lastLog: string;
}

// Safely execute a shell command with a timeout (default 120s)
async function runGitCmd(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; error?: Error }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      timeout: 120000, // 120 seconds
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } // Disable prompts
    });
    return { stdout, stderr };
  } catch (error) {
    const commandError = error as CommandError;
    return {
      stdout: commandError.stdout || '',
      stderr: commandError.stderr || commandError.message || '',
      error: commandError
    };
  }
}

export async function getGitStatus(): Promise<GitStatusResult> {
  const settings = await getSettings();
  const repoUrl = settings['git.repoUrl'];
  const branch = settings['git.branch'] || 'main';
  const localPath = settings['git.localPath'] || '/root/openstack-support';
  const lastSyncAt = settings['git.lastSyncAt'];
  
  let status: GitStatusResult['status'] = 'not_configured';
  let lastCommit = settings['git.lastCommit'];
  let lastLog = settings['git.lastLog'];

  // Check if directory exists and is a git repo
  try {
    await fs.access(path.join(localPath, '.git'));
    status = 'synced';
  } catch {
    return {
      repoUrl,
      branch,
      localPath,
      lastSyncAt,
      lastCommit: 'None',
      status: 'not_configured',
      lastLog: 'Directory is not a git repository. Re-clone is required.'
    };
  }

  // Get current status & check if dirty
  const statusRes = await runGitCmd('git status --porcelain', localPath);
  if (statusRes.error) {
    status = 'error';
    lastLog = `Git status failed: ${statusRes.stderr}`;
  } else if (statusRes.stdout.trim() !== '') {
    status = 'dirty';
    lastLog = `Repository has local changes:\n${statusRes.stdout}`;
  }

  // Get last commit
  const commitRes = await runGitCmd('git log -1 --format="%h - %s (%ci)"', localPath);
  if (!commitRes.error) {
    lastCommit = commitRes.stdout.trim();
  }

  return {
    repoUrl,
    branch,
    localPath,
    lastSyncAt,
    lastCommit,
    status,
    lastLog
  };
}

export async function executeGitAction(
  action: 'check_status' | 'pull_latest' | 'force_reset_pull' | 'reclone' | 'change_repo',
  adminUsername: string,
  extraParams?: { repoUrl?: string; branch?: string; confirm?: string }
): Promise<GitStatusResult> {
  const settings = await getSettings();
  const localPath = settings['git.localPath'] || '/root/openstack-support';
  const repoUrl = extraParams?.repoUrl || settings['git.repoUrl'];
  const branch = extraParams?.branch || settings['git.branch'] || 'main';

  // Ensure localPath exists
  await fs.mkdir(localPath, { recursive: true });

  let logOutput = `[${new Date().toISOString()}] Action: ${action} triggered by ${adminUsername}\n`;
  let success = true;

  try {
    switch (action) {
      case 'check_status': {
        const currentStatus = await getGitStatus();
        return currentStatus;
      }

      case 'pull_latest': {
        // Verify clean first
        const current = await getGitStatus();
        if (current.status === 'dirty') {
          throw new Error('Cannot pull because the local repository is dirty (has changes). Use Force Reset instead.');
        }
        
        logOutput += `Fetching origin and pulling branch: ${branch}...\n`;
        const fetchRes = await runGitCmd(`git fetch origin && git checkout ${branch} && git pull origin ${branch} --ff-only`, localPath);
        logOutput += `stdout: ${fetchRes.stdout}\nstderr: ${fetchRes.stderr}\n`;
        if (fetchRes.error) throw new Error(`Pull failed: ${fetchRes.stderr}`);
        break;
      }

      case 'force_reset_pull': {
        if (extraParams?.confirm !== 'RESET') {
          throw new Error('Confirmation "RESET" is required for force reset.');
        }
        logOutput += `Force resetting to origin/${branch}...\n`;
        const resetRes = await runGitCmd(`git fetch origin && git checkout ${branch} && git reset --hard origin/${branch} && git clean -fd`, localPath);
        logOutput += `stdout: ${resetRes.stdout}\nstderr: ${resetRes.stderr}\n`;
        if (resetRes.error) throw new Error(`Force reset failed: ${resetRes.stderr}`);
        break;
      }

      case 'reclone': {
        if (extraParams?.confirm !== 'RECLONE') {
          throw new Error('Confirmation "RECLONE" is required for fresh clone.');
        }
        logOutput += `Deleting existing files and cloning fresh from ${repoUrl} (branch: ${branch})...\n`;
        
        // Clean folder safely without removing the mount directory itself
        const files = await fs.readdir(localPath);
        for (const file of files) {
          await fs.rm(path.join(localPath, file), { recursive: true, force: true });
        }

        const cloneRes = await runGitCmd(`git clone -b ${branch} ${repoUrl} .`, localPath);
        logOutput += `stdout: ${cloneRes.stdout}\nstderr: ${cloneRes.stderr}\n`;
        if (cloneRes.error) throw new Error(`Clone failed: ${cloneRes.stderr}`);
        break;
      }

      case 'change_repo': {
        if (!repoUrl) throw new Error('Repo URL is required to change repo');
        
        logOutput += `Validating new repo ${repoUrl} on branch ${branch}...\n`;
        
        // Validate by cloning to a temp folder first
        const tempPath = `/tmp/openstack-support-temp-${Date.now()}`;
        await fs.mkdir(tempPath, { recursive: true });
        
        const testRes = await runGitCmd(`git clone --depth 1 -b ${branch} ${repoUrl} .`, tempPath);
        // Clean temp folder immediately
        await fs.rm(tempPath, { recursive: true, force: true });

        if (testRes.error) {
          throw new Error(`Repository validation failed. Check URL or branch. Error: ${testRes.stderr}`);
        }

        logOutput += `Validation succeeded. Cleaning local directory and switching active repo...\n`;
        
        // Save new settings
        await saveSetting('git.repoUrl', repoUrl);
        await saveSetting('git.branch', branch);

        // Re-clone at the local path
        const cleanFiles = await fs.readdir(localPath);
        for (const file of cleanFiles) {
          await fs.rm(path.join(localPath, file), { recursive: true, force: true });
        }

        const cloneRes = await runGitCmd(`git clone -b ${branch} ${repoUrl} .`, localPath);
        logOutput += `stdout: ${cloneRes.stdout}\nstderr: ${cloneRes.stderr}\n`;
        if (cloneRes.error) throw new Error(`Final clone failed: ${cloneRes.stderr}`);
        break;
      }
    }
  } catch (error) {
    success = false;
    logOutput += `[ERROR] ${getErrorMessage(error)}\n`;
  }

  // Update status in settings DB
  const nextStatus = await getGitStatus();
  const finalStatus = success ? nextStatus.status : 'error';
  
  await saveSetting('git.lastSyncAt', success ? new Date().toISOString() : settings['git.lastSyncAt'] || '');
  await saveSetting('git.lastCommit', nextStatus.lastCommit);
  await saveSetting('git.lastStatus', finalStatus);
  await saveSetting('git.lastLog', logOutput.slice(-5000)); // Cap log size

  return {
    ...nextStatus,
    status: finalStatus,
    lastLog: logOutput
  };
}
