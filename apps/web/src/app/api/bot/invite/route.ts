import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!clientId || clientId === 'YOUR_DISCORD_CLIENT_ID') {
    return NextResponse.json(
      { error: 'DISCORD_CLIENT_ID is not configured in .env file.' },
      { status: 500 }
    );
  }

  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

  return NextResponse.redirect(inviteUrl);
}
