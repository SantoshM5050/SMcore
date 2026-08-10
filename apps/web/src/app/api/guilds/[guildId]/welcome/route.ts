import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    let welcomeConfig = await prisma.welcomeConfig.findUnique({
      where: { guildId },
    });

    if (!welcomeConfig) {
      welcomeConfig = await prisma.welcomeConfig.create({
        data: {
          guildId,
          enabled: true,
          embedTitle: 'Welcome to the Server!',
          embedDescription: 'Hey {user}, welcome to {server}! Enjoy your stay and check out the rules channel.',
          embedColor: '#5865F2',
          goodbyeEnabled: false,
          goodbyeMessage: '{user} has left the server.',
        },
      });
    }

    return NextResponse.json(welcomeConfig);
  } catch (err: any) {
    console.error('[Welcome API GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    const body = await request.json();

    const welcomeConfig = await prisma.welcomeConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: body.enabled ?? true,
        channelId: body.channelId || null,
        embedTitle: body.embedTitle || 'Welcome to the Server!',
        embedDescription: body.embedDescription || 'Hey {user}, welcome to {server}!',
        embedColor: body.embedColor || '#5865F2',
        bannerUrl: body.bannerUrl || null,
        autoRoleId: body.autoRoleId || null,
        goodbyeEnabled: body.goodbyeEnabled ?? false,
        goodbyeChannelId: body.goodbyeChannelId || null,
        goodbyeMessage: body.goodbyeMessage || '{user} has left the server.',
      },
      update: {
        enabled: body.enabled ?? true,
        channelId: body.channelId || null,
        embedTitle: body.embedTitle || 'Welcome to the Server!',
        embedDescription: body.embedDescription || 'Hey {user}, welcome to {server}!',
        embedColor: body.embedColor || '#5865F2',
        bannerUrl: body.bannerUrl || null,
        autoRoleId: body.autoRoleId || null,
        goodbyeEnabled: body.goodbyeEnabled ?? false,
        goodbyeChannelId: body.goodbyeChannelId || null,
        goodbyeMessage: body.goodbyeMessage || '{user} has left the server.',
      },
    });

    return NextResponse.json(welcomeConfig);
  } catch (err: any) {
    console.error('[Welcome API POST Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
