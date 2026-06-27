import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode('mock-secret-for-mvp-12345');

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionCookie = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session='));

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = sessionCookie.split('=')[1];
    const { payload } = await jwtVerify(token, secret);

    return NextResponse.json({
      id: payload.id,
      username: payload.username,
      role: payload.role,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}
