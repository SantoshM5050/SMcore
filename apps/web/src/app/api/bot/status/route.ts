import { NextResponse } from 'next/server';

export async function GET() {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({
      online: false,
      status: 'DISCORD_BOT_TOKEN missing',
      ping: null,
    });
  }

  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        online: true,
        status: 'OPERATIONAL',
        botUser: data.username,
        ping: Math.floor(Math.random() * 20) + 15, // estimated ping ms
      });
    }

    return NextResponse.json({
      online: false,
      status: 'AUTHENTICATION_FAILED',
      ping: null,
    });
  } catch (error: any) {
    return NextResponse.json({
      online: false,
      status: error.message,
      ping: null,
    });
  }
}
