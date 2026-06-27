import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPrisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { writeAuditLog } from '@/lib/audit-service';

const USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const users = await getPrisma().user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await req.json();
  const username = String(body.username || '').trim();
  const email = body.email ? String(body.email).trim() : null;
  const role = String(body.role || 'NOC');
  const password = String(body.password || process.env.SEED_DEFAULT_PASSWORD || 'password');

  if (!username || !['ADMIN', 'NOC', 'OPERATION'].includes(role)) {
    return NextResponse.json({ error: 'Invalid account payload' }, { status: 400 });
  }

  try {
    const user = await getPrisma().user.create({
      data: {
        username,
        email,
        role,
        status: 'ACTIVE',
        passwordHash: await hashPassword(password),
      },
      select: USER_SELECT,
    });
    await writeAuditLog({
      userId: auth.user?.id,
      action: 'ADMIN_ACCOUNT_CREATE',
      target: user.id,
      detail: `username=${user.username}; role=${user.role}`,
      req,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await req.json();
  const id = String(body.id || '');
  const status = String(body.status || '');

  if (!id || !['ACTIVE', 'INACTIVE'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status payload' }, { status: 400 });
  }
  if (auth.user?.id === id && status === 'INACTIVE') {
    return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
  }

  const user = await getPrisma().user.update({
    where: { id },
    data: { status },
    select: USER_SELECT,
  });
  await writeAuditLog({
    userId: auth.user?.id,
    action: 'ADMIN_ACCOUNT_STATUS_UPDATE',
    target: user.id,
    detail: `username=${user.username}; status=${user.status}`,
    req,
  });

  return NextResponse.json({ user });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }
  if (auth.user?.id === id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  const deleted = await getPrisma().user.delete({ where: { id }, select: USER_SELECT });
  await writeAuditLog({
    userId: auth.user?.id,
    action: 'ADMIN_ACCOUNT_DELETE',
    target: deleted.id,
    detail: `username=${deleted.username}; role=${deleted.role}`,
    req,
  });
  return NextResponse.json({ success: true });
}
