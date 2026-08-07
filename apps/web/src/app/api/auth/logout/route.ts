import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AuthService.getSessionCookieName());
  return response;
}
