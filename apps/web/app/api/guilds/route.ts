import { NextResponse } from 'next/server';
import { prisma } from '@smcore/database';

interface BotGuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount?: number;
  ownerId?: string;
}

export async function GET() {
  try {
    // 1. Fetch guilds recorded in database
    const dbGuilds = await prisma.guild.findMany({
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

    // 2. Fetch live bot cached guilds if bot is running
    let botGuildsMap = new Map<string, BotGuildInfo>();
    try {
      const botPort = process.env.BOT_PORT || '3001';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`http://localhost:${botPort}/guilds`, {
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && Array.isArray(json.data)) {
          for (const bg of json.data) {
            botGuildsMap.set(bg.id, bg);
          }
        }
      }
    } catch {
      // Bot may be offline; proceed with DB records
    }

    // 3. Merge: If DB has records, enrich with bot memberCount/icon
    // If bot has guilds not yet in DB, include them as well
    const mergedMap = new Map<string, {
      id: string;
      name: string;
      icon: string | null;
      ownerId: string;
      botPresent: boolean;
      memberCount?: number;
    }>();

    for (const dg of dbGuilds) {
      const bg = botGuildsMap.get(dg.id);
      mergedMap.set(dg.id, {
        id: dg.id,
        name: bg?.name || dg.name,
        icon: bg?.icon || dg.icon,
        ownerId: dg.ownerId,
        botPresent: dg.botPresent,
        memberCount: bg?.memberCount,
      });
    }

    botGuildsMap.forEach((bg, bgId) => {
      if (!mergedMap.has(bgId)) {
        mergedMap.set(bgId, {
          id: bg.id,
          name: bg.name,
          icon: bg.icon,
          ownerId: bg.ownerId || '',
          botPresent: true,
          memberCount: bg.memberCount,
        });
      }
    });

    const result = Array.from(mergedMap.values());

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database unavailable',
        },
        data: [],
      },
      { status: 503 }
    );
  }
}
