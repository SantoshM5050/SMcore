import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const config = await request.json().catch(() => null);

  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Invalid configuration payload' }, { status: 400 });
  }

  // Restore settings
  if (config.settings) {
    await prisma.guildSettings.upsert({
      where: { guildId },
      update: {
        dmOnPunish: config.settings.dmOnPunish ?? true,
        timezone: config.settings.timezone ?? 'UTC',
        muteRoleId: config.settings.muteRoleId ?? null,
        quarantineRoleId: config.settings.quarantineRoleId ?? null,
        appealUrl: config.settings.appealUrl ?? null,
        raidModeActive: config.settings.raidModeActive ?? false,
      },
      create: {
        guildId,
        dmOnPunish: config.settings.dmOnPunish ?? true,
        timezone: config.settings.timezone ?? 'UTC',
        muteRoleId: config.settings.muteRoleId ?? null,
        quarantineRoleId: config.settings.quarantineRoleId ?? null,
        appealUrl: config.settings.appealUrl ?? null,
        raidModeActive: config.settings.raidModeActive ?? false,
      },
    });
  }

  // Restore log configs
  if (Array.isArray(config.logConfigs)) {
    for (const lc of config.logConfigs) {
      if (!lc.category) continue;
      await prisma.logConfiguration.upsert({
        where: {
          guildId_category: { guildId, category: lc.category },
        },
        update: {
          enabled: lc.enabled ?? true,
          destinationType: lc.destinationType ?? 'TEXT_CHANNEL',
          channelId: lc.channelId ?? null,
          forumThreadMode: lc.forumThreadMode ?? 'CATEGORY',
          showIds: lc.showIds ?? true,
          showModerator: lc.showModerator ?? true,
          showReason: lc.showReason ?? true,
          showChannel: lc.showChannel ?? true,
          showTimestamp: lc.showTimestamp ?? true,
          showBeforeAfter: lc.showBeforeAfter ?? true,
          mentionUsers: lc.mentionUsers ?? false,
          embedColor: lc.embedColor ?? '#5865F2',
        },
        create: {
          guildId,
          category: lc.category,
          enabled: lc.enabled ?? true,
          destinationType: lc.destinationType ?? 'TEXT_CHANNEL',
          channelId: lc.channelId ?? null,
          forumThreadMode: lc.forumThreadMode ?? 'CATEGORY',
          showIds: lc.showIds ?? true,
          showModerator: lc.showModerator ?? true,
          showReason: lc.showReason ?? true,
          showChannel: lc.showChannel ?? true,
          showTimestamp: lc.showTimestamp ?? true,
          showBeforeAfter: lc.showBeforeAfter ?? true,
          mentionUsers: lc.mentionUsers ?? false,
          embedColor: lc.embedColor ?? '#5865F2',
        },
      });
    }
  }

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.SETTINGS_UPDATED,
    { action: 'CONFIG_RESTORE' }
  );

  return NextResponse.json({ success: true });
}
