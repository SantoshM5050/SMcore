import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { DiscordApi } from '@/lib/discord';

export async function GET() {
  const sessionData = await AuthService.getSessionUserAndToken();
  if (!sessionData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user, accessToken } = sessionData;

  const allGuilds = await prisma.guild.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      staffPermissions: true,
    },
  });

  if (allGuilds.length === 0) {
    return NextResponse.json([]);
  }

  // 1. Fetch current guilds where the BOT is actually present
  let botGuildIds: Set<string> | null = null;
  const rawBotToken = process.env.DISCORD_BOT_TOKEN || '';
  const botToken = rawBotToken.trim().replace(/^["']|["']$/g, '');

  if (botToken && botToken !== 'YOUR_DISCORD_BOT_TOKEN') {
    try {
      const botGuildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bot ${botToken}` },
        cache: 'no-store',
      });
      if (botGuildsRes.ok) {
        const botGuildsList: { id: string }[] = await botGuildsRes.json();
        botGuildIds = new Set(botGuildsList.map((g) => g.id));
      }
    } catch (botErr) {
      console.warn('[Guilds API] Failed to fetch bot guilds via Discord API:', botErr);
    }
  }

  // Purge any guilds from DB if the bot is no longer in them
  if (botGuildIds) {
    const orphanedGuildIds = allGuilds.filter((g) => !botGuildIds!.has(g.id)).map((g) => g.id);
    if (orphanedGuildIds.length > 0) {
      console.log(`[Guilds API] Purging ${orphanedGuildIds.length} kicked guild(s) from DB:`, orphanedGuildIds);
      await prisma.guild.deleteMany({
        where: { id: { in: orphanedGuildIds } },
      }).catch((err) => console.warn('[Guilds API] Purge failed:', err));
    }
  }

  // 2. Fetch Discord guilds for the user if OAuth accessToken is available
  let allowedGuildIds: Set<string> | null = null;
  if (accessToken) {
    try {
      const userDiscordGuilds = await DiscordApi.getUserGuilds(accessToken);
      allowedGuildIds = new Set(
        userDiscordGuilds
          .filter((g) => {
            const perms = BigInt(g.permissions || '0');
            const isAdmin = (perms & BigInt(0x8)) === BigInt(0x8);
            const canManage = (perms & BigInt(0x20)) === BigInt(0x20);
            return g.owner || isAdmin || canManage;
          })
          .map((g) => g.id)
      );
    } catch (err) {
      console.warn('[Guilds API] Could not fetch user guilds via Discord API:', err);
    }
  }

  const activeGuilds = botGuildIds ? allGuilds.filter((g) => botGuildIds!.has(g.id)) : allGuilds;

  const userGuilds = activeGuilds.filter((g) => {
    // 1. User is the guild owner in DB
    if (g.ownerId === user.discordId) return true;

    // 2. If Discord user's guilds were fetched via OAuth token, check if user is admin/manager in that Discord server
    if (allowedGuildIds) {
      return allowedGuildIds.has(g.id);
    }

    // Fallback if OAuth token is missing: only return if user is guild owner
    return false;
  });

  // Strip included staffPermissions before returning
  const sanitized = userGuilds.map(({ staffPermissions, ...guild }) => guild);

  return NextResponse.json(sanitized);
}
