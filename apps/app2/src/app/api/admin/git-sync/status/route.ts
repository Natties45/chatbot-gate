import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { getGitStatus } from '../../../../../lib/git-sync-service';
import { apiErrorResponse } from '../../../../../lib/api-error';

export async function GET() {
  try {
    await requireAuth(['admin']);
    const status = await getGitStatus();
    return NextResponse.json(status);
  } catch (error) {
    return apiErrorResponse(error, '[Git Status API]');
  }
}
