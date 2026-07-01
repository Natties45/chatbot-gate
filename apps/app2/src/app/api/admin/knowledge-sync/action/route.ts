import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { executeKnowledgeSyncAction } from '../../../../../lib/knowledge-sync';
import { apiErrorResponse } from '../../../../../lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(['admin']);

    const { action } = await request.json();

    const allowedActions = ['check_status', 'pull_latest', 'rebuild_index'];
    if (!action || !allowedActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const result = await executeKnowledgeSyncAction(action, user.username);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, '[Knowledge Sync Action API]');
  }
}
