import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { getSettings, saveSettings } from '../../../lib/settings-db';
import { apiErrorResponse } from '../../../lib/api-error';

const PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq Free',
    models: ['qwen/qwen3-32b'],
  },
  {
    id: 'ollama',
    name: 'Ollama Local',
    models: ['qwen3:4b'],
  },
];

export async function GET() {
  try {
    await requireAuth(['admin']);

    const settings = await getSettings();

    return NextResponse.json({ settings, providers: PROVIDERS });
  } catch (error) {
    return apiErrorResponse(error, '[Settings API GET]');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const body = await request.json();
    await saveSettings(body);

    const updatedSettings = await getSettings();
    return NextResponse.json({ settings: updatedSettings });
  } catch (error) {
    return apiErrorResponse(error, '[Settings API PATCH]');
  }
}
