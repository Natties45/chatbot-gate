import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOperationProgress } from '@/lib/operation-progress';
import { apiErrorResponse } from '@/lib/api-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin', 'operation']);
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    return NextResponse.json(getOperationProgress(sessionId));
  } catch (error) {
    return apiErrorResponse(error, '[Operation Progress API]');
  }
}
