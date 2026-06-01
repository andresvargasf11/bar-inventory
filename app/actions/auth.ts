'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSetting, setSetting } from '@/lib/db';
import { hashPin, verifyPin, createSession, clearSessionCookie } from '@/lib/auth';

const COOKIE_NAME = 'bar-session';

export async function setupPin(formData: FormData) {
  const pin = formData.get('pin') as string;
  const confirm = formData.get('confirm') as string;

  if (!pin || pin.length < 4 || pin.length > 6) {
    return { error: 'PIN must be 4–6 digits' };
  }
  if (!/^\d+$/.test(pin)) {
    return { error: 'PIN must contain only digits' };
  }
  if (pin !== confirm) {
    return { error: 'PINs do not match' };
  }

  const hash = await hashPin(pin);
  await setSetting('pin_hash', hash);
  await setSetting('setup_complete', '1');

  const timeoutRaw = await getSetting('inactivity_timeout');
  const timeout = parseInt(timeoutRaw ?? '30', 10);
  const token = await createSession(timeout);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: timeout * 60,
    path: '/',
  });

  redirect('/');
}

export async function unlockWithPin(formData: FormData) {
  const pin = formData.get('pin') as string;
  const from = (formData.get('from') as string) || '/';

  if (!pin) return { error: 'PIN is required' };

  const hash = await getSetting('pin_hash');
  if (!hash) return { error: 'No PIN set — please set up first' };

  const valid = await verifyPin(pin, hash);
  if (!valid) return { error: 'Incorrect PIN' };

  const timeoutRaw = await getSetting('inactivity_timeout');
  const timeout = parseInt(timeoutRaw ?? '30', 10);
  const token = await createSession(timeout);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: timeout * 60,
    path: '/',
  });

  // Prevent open redirect: must start with '/' but not '//' (protocol-relative URL)
  redirect(from.startsWith('/') && !from.startsWith('//') ? from : '/');
}

export async function logout() {
  await clearSessionCookie();
  redirect('/lock');
}

export async function changePin(formData: FormData) {
  const current = formData.get('current') as string;
  const newPin = formData.get('new') as string;
  const confirm = formData.get('confirm') as string;

  const hash = await getSetting('pin_hash');
  if (!hash) return { error: 'No PIN configured' };

  const valid = await verifyPin(current, hash);
  if (!valid) return { error: 'Current PIN is incorrect' };

  if (!newPin || newPin.length < 4 || newPin.length > 6) {
    return { error: 'New PIN must be 4–6 digits' };
  }
  if (!/^\d+$/.test(newPin)) {
    return { error: 'PIN must contain only digits' };
  }
  if (newPin !== confirm) {
    return { error: 'New PINs do not match' };
  }

  const newHash = await hashPin(newPin);
  await setSetting('pin_hash', newHash);
  return { success: true };
}
