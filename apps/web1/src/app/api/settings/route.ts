import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { getSettings, saveSettings } from '../../../lib/settings-db';
import { opencodeService } from '../../../lib/opencode-service';

export async function GET() {
  try {
    await requireAuth(['admin']);

    const settings = await getSettings();
    const providers = await opencodeService.getProviders();

    return NextResponse.json({ settings, providers });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[Settings API GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const body = await request.json();
    await saveSettings(body);

    const updatedSettings = await getSettings();
    return NextResponse.json({ settings: updatedSettings });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[Settings API PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
