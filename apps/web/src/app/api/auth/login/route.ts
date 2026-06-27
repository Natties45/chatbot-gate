import { NextResponse } from 'next/server';
import { mockUsers } from '../../../../lib/mock-db';
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode('mock-secret-for-mvp-12345');

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const user = mockUsers.find(u => u.username === username);

    // Mock check (in real app, compare passwordHash)
    if (!user || password !== 'password') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await new SignJWT({ id: user.id, username: user.username, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(secret);

    const res = NextResponse.json({ success: true, role: user.role });
    res.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return res;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
