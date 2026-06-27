import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSettings, updateSettings } from '@/lib/settings-service';
import { writeAuditLog } from '@/lib/audit-service';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  return NextResponse.json({ settings: await getSettings() });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await req.json();
  const settings = await updateSettings({
    KB_REPO_URL: typeof body.KB_REPO_URL === 'string' ? body.KB_REPO_URL : undefined,
    AI_MODEL: typeof body.AI_MODEL === 'string' ? body.AI_MODEL : undefined,
    CASE_PUSH_ENDPOINT: typeof body.CASE_PUSH_ENDPOINT === 'string' ? body.CASE_PUSH_ENDPOINT : undefined,
  });
  await writeAuditLog({
    userId: auth.user?.id,
    action: 'ADMIN_SETTINGS_UPDATE',
    target: 'settings',
    detail: 'Updated KB_REPO_URL, AI_MODEL, or CASE_PUSH_ENDPOINT',
    req,
  });

  return NextResponse.json({ settings });
}
