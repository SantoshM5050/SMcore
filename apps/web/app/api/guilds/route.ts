import { NextResponse } from 'next/server';
import { prisma } from '@smcore/database';

export async function GET() {
  try {
    const guilds = await prisma.guild.findMany({
      select: {
        id: true,
        name: true,
        icon: true,
        ownerId: true,
        botPresent: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: guilds,
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        fallback: true,
        dbOffline: true,
        message: 'Database currently disconnected or offline',
      },
    });
  }
}
