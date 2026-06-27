import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode('mock-secret-for-mvp-12345');

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith('/login');
  
  // Allow API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  if (!token) {
    if (!isAuthPage) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (isAuthPage) {
      // Redirect based on role if trying to access login page while authenticated
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      if (role === 'NOC') return NextResponse.redirect(new URL('/noc/chat', req.url));
      if (role === 'OPERATION') return NextResponse.redirect(new URL('/operation/chat', req.url));
    }

    // Role-based route protection
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/noc') && !['ADMIN', 'NOC'].includes(role)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/operation') && !['ADMIN', 'OPERATION'].includes(role)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  } catch (error) {
    if (!isAuthPage) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
