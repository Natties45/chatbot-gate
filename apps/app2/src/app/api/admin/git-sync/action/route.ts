import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { executeGitAction } from '../../../../../lib/git-sync-service';
import { apiErrorResponse } from '../../../../../lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(['admin']);
    
    const { action, repoUrl, branch, confirm } = await request.json();

    const allowedActions = ['check_status', 'pull_latest', 'force_reset_pull', 'reclone', 'change_repo', 'push_auto_generated'];
    if (!action || !allowedActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const result = await executeGitAction(action, user.username, { repoUrl, branch, confirm });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, '[Git Action API]');
  }
}
