import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { deployApp2, getDeployHistory, getDeployStatus } from '@/lib/deploy-client';
import { apiErrorResponse } from '@/lib/api-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const body = await request.json();
    const action = body.action;

    if (action === 'status') {
      return NextResponse.json(await getDeployStatus());
    }

    if (action === 'history') {
      return NextResponse.json(await getDeployHistory());
    }

    if (action === 'deploy') {
      const tag = String(body.tag || '').trim();
      if (!/^v?\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9._-]+)?$/.test(tag)) {
        return NextResponse.json({ error: 'Invalid tag format' }, { status: 400 });
      }
      return NextResponse.json(await deployApp2(tag));
    }

    return NextResponse.json({ error: `Invalid deploy action: ${action}` }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error, '[Deploy API]');
  }
}
