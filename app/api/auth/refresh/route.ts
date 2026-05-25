import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { getSetting } from '@/lib/db';

const COOKIE_NAME = 'bar-session';
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'bar-inventory-secret-change-in-production-32chars'
);

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    await jwtVerify(token, SECRET);
    const timeoutRaw = await getSetting('inactivity_timeout');
    const timeout = parseInt(timeoutRaw ?? '30', 10);
    const newToken = await new SignJWT({ sub: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) + timeout * 60)
      .setIssuedAt()
      .sign(SECRET);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: timeout * 60,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
