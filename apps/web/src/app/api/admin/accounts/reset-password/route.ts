import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPrisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { writeAuditLog } from '@/lib/audit-service';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id, password } = await req.json();
  if (!id || !password || String(password).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = await getPrisma().user.update({
    where: { id: String(id) },
    data: { passwordHash: await hashPassword(String(password)) },
    select: { id: true, username: true },
  });
  await writeAuditLog({
    userId: auth.user?.id,
    action: 'ADMIN_ACCOUNT_PASSWORD_RESET',
    target: user.id,
    detail: `username=${user.username}`,
    req,
  });

  return NextResponse.json({ success: true });
}
