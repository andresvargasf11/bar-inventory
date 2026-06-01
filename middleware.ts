import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'bar-session';
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'bar-inventory-secret-change-in-production-32chars'
);

const PUBLIC_PATHS = ['/lock', '/api/auth'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const lockUrl = request.nextUrl.clone();
    lockUrl.pathname = '/lock';
    lockUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(lockUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    // Sliding window: use the timeout stored in the JWT at login time
    const timeoutMinutes = typeof payload.timeout === 'number' ? payload.timeout : 30;
    const newExp = Math.floor(Date.now() / 1000) + timeoutMinutes * 60;
    const { SignJWT } = await import('jose');
    const newToken = await new SignJWT({ sub: payload.sub })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(newExp)
      .setIssuedAt()
      .sign(SECRET);

    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: timeoutMinutes * 60,
      path: '/',
    });
    return response;
  } catch {
    const lockUrl = request.nextUrl.clone();
    lockUrl.pathname = '/lock';
    lockUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(lockUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
