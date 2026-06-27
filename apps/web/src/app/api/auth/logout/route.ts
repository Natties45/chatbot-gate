import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  
  // Clear the session cookie
  res.cookies.set('session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return res;
}
