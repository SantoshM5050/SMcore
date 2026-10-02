import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { requireAuth } from '@/lib/auth/authorize';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  // Authenticate session
  const authRes = new NextResponse();
  const authCheck = await requireAuth(req);
  if (!authCheck.authenticated) {
    return authCheck.response;
  }

  // Get session guilds (from Discord OAuth)
  const session = await getSessionFromRequest(req, authRes);
  const sessionGuilds = session.guilds ?? [];

  if (sessionGuilds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const sessionGuildIds = sessionGuilds.map((g) => g.id);

  // Enrich with bot live data and DB records
  interface BotGuildInfo {
    id: string;
    name: string;
    icon: string | null;
    memberCount?: number;
    ownerId?: string;
  }

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
        for (const bg of json.data as BotGuildInfo[]) {
          if (sessionGuildIds.includes(bg.id)) {
            botGuildsMap.set(bg.id, bg);
          }
        }
      }
    }
  } catch {
    // Bot may be offline; proceed with session data
  }

  // DB records for extra enrichment
  let dbGuildsMap = new Map<string, { botPresent: boolean }>();
  try {
    const dbGuilds = await prisma.guild.findMany({
      where: { id: { in: sessionGuildIds } },
      select: { id: true, botPresent: true },
    });
    for (const dg of dbGuilds) {
      dbGuildsMap.set(dg.id, { botPresent: dg.botPresent });
    }
  } catch {
    // DB offline
  }

  // Merge session guilds with live enrichment
  const result = sessionGuilds.map((sg) => {
    const bg = botGuildsMap.get(sg.id);
    const dbg = dbGuildsMap.get(sg.id);
    return {
      id: sg.id,
      name: bg?.name ?? sg.name,
      icon: bg?.icon ?? sg.icon,
      ownerId: sg.owner ? session.user!.id : '',
      botPresent: botGuildsMap.has(sg.id) ? true : (dbg?.botPresent ?? (sg as typeof sg & { botPresent?: boolean }).botPresent ?? false),
      memberCount: bg?.memberCount,
    };
  });

  return NextResponse.json({ success: true, data: result });
}
