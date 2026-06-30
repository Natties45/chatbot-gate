import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { getGitStatus } from '../../../../../lib/git-sync-service';

export async function GET() {
  try {
    await requireAuth(['admin']);
    const status = await getGitStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[Git Status API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
