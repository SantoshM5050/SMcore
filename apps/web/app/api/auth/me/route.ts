import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { prisma } from '@smcore/database';

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's identity from session.
 * Never returns access tokens, refresh tokens, or secrets.
 *
 * Authenticated response (200):
 * { authenticated: true, user: { id, username, globalName, avatar }, guilds: [...] }
 *
 * Unauthenticated response (401):
 * { authenticated: false }
 */
export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getSessionFromRequest(req, res);

  if (!session.authenticated || !session.user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let guilds = session.guilds ?? [];

  // Check database for active bot presence so status updates without needing re-login
  if (guilds.length > 0) {
    try {
      const guildIds = guilds.map((g) => g.id);
      const dbGuilds = await prisma.guild.findMany({
        where: { id: { in: guildIds }, botPresent: true },
        select: { id: true },
      });
      const dbBotSet = new Set(dbGuilds.map((g) => g.id));
      guilds = guilds.map((g) => ({
        ...g,
        botPresent: g.botPresent || dbBotSet.has(g.id),
      }));
    } catch {
      // DB query failure fallback to session state
    }
  }

  // Return only the safe identity fields — never tokens
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      username: session.user.username,
      globalName: session.user.globalName,
      avatar: session.user.avatar,
      discriminator: session.user.discriminator,
    },
    guilds,
  });
}
