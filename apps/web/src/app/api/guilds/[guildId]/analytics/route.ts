import { NextResponse } from 'next/server';
import { prisma, ModerationAction } from '@repo/database';
import { AuthService } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalCases,
    totalBans,
    totalTimeouts,
    totalKicks,
    totalWarnings,
    autoModBlocks,
    actionsToday,
    settings,
    recentCases,
    allCases14Days,
  ] = await Promise.all([
    prisma.moderationCase.count({ where: { guildId } }),
    prisma.moderationCase.count({ where: { guildId, action: ModerationAction.BAN } }),
    prisma.moderationCase.count({ where: { guildId, action: ModerationAction.TIMEOUT } }),
    prisma.moderationCase.count({ where: { guildId, action: ModerationAction.KICK } }),
    prisma.warning.count({ where: { guildId, isActive: true } }),
    prisma.moderationCase.count({ where: { guildId, action: ModerationAction.AUTOMOD } }),
    prisma.moderationCase.count({ where: { guildId, createdAt: { gte: startOfToday } } }),
    prisma.guildSettings.findUnique({ where: { guildId } }),
    prisma.moderationCase.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.moderationCase.findMany({
      where: {
        guildId,
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true },
    }),
  ]);

  // Daily trend calculation
  const daysMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    daysMap.set(dateStr, 0);
  }

  allCases14Days.forEach((c) => {
    const dateStr = new Date(c.createdAt).toISOString().split('T')[0];
    if (daysMap.has(dateStr)) {
      daysMap.set(dateStr, (daysMap.get(dateStr) || 0) + 1);
    }
  });

  const actionsPerDay = Array.from(daysMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  return NextResponse.json({
    totalCases,
    totalBans,
    totalTimeouts,
    totalKicks,
    totalWarnings,
    autoModBlocks,
    raidEvents: 0,
    raidModeActive: settings?.raidModeActive || false,
    actionsToday,
    actionsPerDay,
    recentCases,
  });
}
