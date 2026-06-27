import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export type SessionUser = {
  id: string;
  username: string;
  role: string;
};

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET || 'mock-secret-for-mvp-12345';
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1d')
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return {
    id: String(payload.id || ''),
    username: String(payload.username || ''),
    role: String(payload.role || ''),
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireSession() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }
  return { user, response: null };
}

export async function requireAdmin() {
  const { user, response } = await requireSession();
  if (response) return { user: null, response };
  if (user?.role !== 'ADMIN') {
    return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, response: null };
}

export function isSecureCookie(req: Request) {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const requestProto = new URL(req.url).protocol.replace(':', '');
  return process.env.COOKIE_SECURE === 'true' || forwardedProto === 'https' || requestProto === 'https';
}
