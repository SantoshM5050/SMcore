import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET() {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user });
}
