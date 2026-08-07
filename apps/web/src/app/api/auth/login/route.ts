import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = encodeURIComponent(`${appUrl}/api/auth/callback`);

  if (!clientId) {
    return NextResponse.json({ error: 'DISCORD_CLIENT_ID missing' }, { status: 500 });
  }

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email%20guilds`;

  return NextResponse.redirect(discordAuthUrl);
}
