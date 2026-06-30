import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { executeGitAction } from '../../../../../lib/git-sync-service';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(['admin']);
    
    const { action, repoUrl, branch, confirm } = await request.json();

    const allowedActions = ['check_status', 'pull_latest', 'force_reset_pull', 'reclone', 'change_repo'];
    if (!action || !allowedActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const result = await executeGitAction(action, user.username, { repoUrl, branch, confirm });
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[Git Action API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
