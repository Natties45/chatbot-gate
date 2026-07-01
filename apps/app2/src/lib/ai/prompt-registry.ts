import fs from 'fs/promises';
import path from 'path';

export type AppPromptRole = 'noc' | 'operation';

const PROMPT_ROOT = path.join(process.cwd(), 'gate-answer-app2');

const ROLE_FILE_CANDIDATES: Record<AppPromptRole, string[]> = {
  noc: ['roles/noc.md', 'agents/noc-agent.md'],
  operation: ['roles/operation.md', 'agents/operation-agent.md'],
};

async function readFirstExisting(relativePaths: string[]): Promise<string> {
  for (const relativePath of relativePaths) {
    try {
      return await fs.readFile(path.join(PROMPT_ROOT, relativePath), 'utf-8');
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String((error as NodeJS.ErrnoException).code) : '';
      if (code !== 'ENOENT') throw error;
    }
  }
  throw new Error(`Prompt file not found: ${relativePaths.join(', ')}`);
}

export async function loadRolePrompt(role: AppPromptRole): Promise<string> {
  return readFirstExisting(ROLE_FILE_CANDIDATES[role]);
}

export async function loadActionPrompt(role: AppPromptRole, promptType: string): Promise<string> {
  if (role === 'operation') {
    return readFirstExisting([promptType === 'close' ? 'prompts/op-close.md' : 'prompts/op-send.md']);
  }

  return readFirstExisting([`prompts/noc-${promptType}.md`]);
}

export function interpolatePrompt(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}
