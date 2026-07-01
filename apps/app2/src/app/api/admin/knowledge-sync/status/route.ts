import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { getKnowledgeSyncStatus } from '../../../../../lib/knowledge-sync';
import { apiErrorResponse } from '../../../../../lib/api-error';

export async function GET() {
  try {
    await requireAuth(['admin']);
    const status = await getKnowledgeSyncStatus();
    return NextResponse.json(status);
  } catch (error) {
    return apiErrorResponse(error, '[Knowledge Sync Status API]');
  }
}
