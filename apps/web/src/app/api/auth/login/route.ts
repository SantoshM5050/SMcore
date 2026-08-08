import { NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const appUrl = getAppUrl(request);
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || `${appUrl}/api/auth/callback`);

  if (!clientId || clientId === 'YOUR_DISCORD_CLIENT_ID') {
    return NextResponse.json(
      { error: 'DISCORD_CLIENT_ID is not configured in .env file. Please add your Discord Developer Portal Client ID.' },
      { status: 500 }
    );
  }

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email%20guilds`;

  return NextResponse.redirect(discordAuthUrl);
}
