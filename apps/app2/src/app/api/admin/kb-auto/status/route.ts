import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSettings } from '@/lib/settings-db';
import { apiErrorResponse } from '@/lib/api-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth(['admin']);
    const settings = await getSettings();
    return NextResponse.json({
      enabled: settings['kb-auto.enabled'] === 'true',
      scheduleTime: settings['kb-auto.scheduleTime'],
      running: settings['kb-auto.running'] === 'true',
      lastRunAt: settings['kb-auto.lastRunAt'],
      lastResult: settings['kb-auto.lastResult'],
      lastError: settings['kb-auto.lastError'],
      lastLog: settings['kb-auto.lastLog'],
    });
  } catch (error) {
    return apiErrorResponse(error, '[KB Auto Status API]');
  }
}
