import { getPrisma } from './db';

export const DEFAULT_SETTINGS = {
  KB_REPO_URL: 'file:///knowledge-base',
  AI_MODEL: 'deepseek-flash',
  CASE_PUSH_ENDPOINT: '',
};

export async function getSettings() {
  const prisma = getPrisma();
  const rows = await prisma.setting.findMany();
  const values = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    values[row.key as keyof typeof values] = row.value;
  }

  return {
    ...values,
    OPENCODE_API_CONFIGURED: Boolean(process.env.OPENCODE_API_KEY),
    OPENCODE_API_URL: process.env.OPENCODE_API_URL || 'https://api.opencode.ai/v1/chat/completions',
  };
}

export async function updateSettings(updates: Partial<typeof DEFAULT_SETTINGS>) {
  const prisma = getPrisma();
  const allowedKeys = Object.keys(DEFAULT_SETTINGS) as Array<keyof typeof DEFAULT_SETTINGS>;

  for (const key of allowedKeys) {
    const value = updates[key];
    if (typeof value !== 'string') continue;

    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return getSettings();
}
