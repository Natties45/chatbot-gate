import { NextResponse } from 'next/server';
import { createSessionToken, isSecureCookie } from '@/lib/auth';
import { getPrisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { writeAuditLog } from '@/lib/audit-service';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || user.status !== 'ACTIVE' || !(await verifyPassword(password, user.passwordHash))) {
      await writeAuditLog({
        action: 'AUTH_LOGIN',
        target: username,
        status: 'FAILURE',
        detail: 'Invalid credentials or inactive account',
        req,
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createSessionToken({ id: user.id, username: user.username, role: user.role });

    const res = NextResponse.json({ success: true, role: user.role });
    res.cookies.set('session', token, {
      httpOnly: true,
      secure: isSecureCookie(req),
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    await writeAuditLog({
      userId: user.id,
      action: 'AUTH_LOGIN',
      target: user.username,
      status: 'SUCCESS',
      req,
    });

    return res;
  } catch (error) {
    console.error('[Login API Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
