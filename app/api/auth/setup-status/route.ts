import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';

export async function GET() {
  try {
    const setupComplete = await getSetting('setup_complete');
    return NextResponse.json({ complete: setupComplete === '1' });
  } catch {
    return NextResponse.json({ complete: false });
  }
}
