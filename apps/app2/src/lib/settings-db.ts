import { prisma } from './db';

export const SETTING_DEFAULTS: Record<string, string> = {
  'llm.primaryProvider': 'groq',
  'llm.primaryModel': 'qwen/qwen3-32b',
  'llm.fallbackProvider': 'ollama',
  'llm.fallbackModel': 'qwen3:4b',
  'llm.enableFallback': 'true',
  'llm.maxToolSteps': '4',
  'llm.maxOutputTokens': '2048',
  'noc.model': 'qwen/qwen3-32b',
  'operation.model': 'qwen/qwen3-32b',
  'noc-agent.temperature': '0.2',
  'noc-agent.top_p': '0.95',
  'operation-agent.temperature': '0.2',
  'operation-agent.top_p': '0.95',
  'noc-closer.temperature': '0.1',
  'git.repoUrl': 'https://github.com/Natties45/openstack-support.git',
  'git.branch': 'main',
  'git.localPath': '/root/openstack-support',
  'git.lastSyncAt': '',
  'git.lastCommit': '',
  'git.lastStatus': 'not_configured',
  'git.lastLog': '',
  'knowledge.repoPath': '/root/openstack-support',
  'knowledge.branch': 'main',
  'knowledge.lastSyncAt': '',
  'knowledge.lastCommit': '',
  'knowledge.lastLog': '',
  'knowledge.indexStatus': 'not_built',
  'knowledge.indexLastBuiltAt': '',
  'kb-auto.enabled': 'false',
  'kb-auto.scheduleTime': '23:59',
  'kb-auto.lastRunAt': '',
  'kb-auto.running': 'false',
  'kb-auto.lastResult': '',
  'kb-auto.lastError': '',
  'kb-auto.lastLog': '',
};

export async function getSetting(key: string): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });
  return setting ? setting.value : (SETTING_DEFAULTS[key] || '');
}

export async function getSettings(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany();
  const result = { ...SETTING_DEFAULTS };
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function saveSettings(settings: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
