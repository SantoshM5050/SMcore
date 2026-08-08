import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getAppUrl, getRedirectUri } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const appUrl = getAppUrl(request);
  const redirectUri = getRedirectUri(request);

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=missing_code`);
  }

  try {
    const tokenData = await AuthService.exchangeCode(code, redirectUri);
    const session = await AuthService.loginWithDiscordToken(tokenData.access_token);

    const response = NextResponse.redirect(`${appUrl}/dashboard`);
    response.cookies.set(AuthService.getSessionCookieName(), session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error.message)}`);
  }
}
