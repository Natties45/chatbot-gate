import { prisma } from './db';
import { opencodeService } from './opencode-service';

export const SETTING_DEFAULTS: Record<string, string> = {
  'noc.model': '',
  'operation.model': '',
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

  // Automatically patch opencode configuration if an agent setting is updated
  if (
    key.startsWith('noc-agent.') ||
    key.startsWith('operation-agent.') ||
    key.startsWith('noc-closer.')
  ) {
    await syncAgentConfigToOpencode();
  }
}

export async function saveSettings(settings: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  await syncAgentConfigToOpencode();
}

export async function syncAgentConfigToOpencode(): Promise<void> {
  try {
    const settings = await getSettings();
    const configPatch = {
      agent: {
        'noc-agent': {
          temperature: parseFloat(settings['noc-agent.temperature']),
          top_p: parseFloat(settings['noc-agent.top_p']),
        },
        'operation-agent': {
          temperature: parseFloat(settings['operation-agent.temperature']),
          top_p: parseFloat(settings['operation-agent.top_p']),
        },
        'noc-closer': {
          temperature: parseFloat(settings['noc-closer.temperature']),
        },
      },
    };
    
    // Also inject model overrides if they are set
    if (settings['noc.model']) {
      (configPatch.agent['noc-agent'] as any).model = settings['noc.model'];
      (configPatch.agent['noc-closer'] as any).model = settings['noc.model'];
    }
    if (settings['operation.model']) {
      (configPatch.agent['operation-agent'] as any).model = settings['operation.model'];
    }

    await opencodeService.patchConfig(configPatch);
  } catch (error) {
    console.error('Failed to sync agent config to opencode:', error);
  }
}
