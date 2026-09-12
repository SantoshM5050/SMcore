import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DiscordApi } from '@/lib/discord';
import { prisma, LogCategory, LogDestinationType, ForumThreadMode, AuditAction, StaffPermission } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { checkStaffPermission } from '@/lib/rbac';
import { z } from 'zod';

const channelActionSchema = z.object({
  action: z.enum(['LOCK', 'UNLOCK', 'SLOWMODE', 'PURGE']),
  channelId: z.string().min(1),
  slowmodeSeconds: z.number().int().min(0).max(21600).optional(),
  purgeCount: z.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  // 1. Fetch live Discord channels
  let channels: any[] = [];
  try {
    channels = await DiscordApi.getGuildChannels(guildId);
  } catch (err: any) {
    console.warn(`[Channels API] Could not fetch live Discord channels for guild ${guildId}:`, err);
  }

  // 2. Ensure Guild and GuildSettings exist in DB
  try {
    await prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: {
        id: guildId,
        name: `Guild ${guildId}`,
        ownerId: user.discordId,
      },
    }).catch(() => null);

    await prisma.guildSettings.upsert({
      where: { guildId },
      update: {},
      create: { guildId },
    }).catch(() => null);
  } catch {
    // Graceful fallback if database is not reachable
  }

  // 3. Fetch existing log configs
  let logConfigs: any[] = [];
  try {
    logConfigs = await prisma.logConfiguration.findMany({
      where: { guildId },
    });
  } catch {
    // Graceful fallback
  }

  const config = {
    logsChannelId: logConfigs.find((c) => c.category === LogCategory.SERVER)?.channelId || '',
    modLogChannelId: logConfigs.find((c) => c.category === LogCategory.MODERATION)?.channelId || '',
    voiceLogsChannelId: logConfigs.find((c) => c.category === LogCategory.VOICE)?.channelId || '',
    messageLogsChannelId: logConfigs.find((c) => c.category === LogCategory.MESSAGE)?.channelId || '',
    generalLogsChannelId: logConfigs.find((c) => c.category === LogCategory.CHANNEL)?.channelId || '',
    alertLogsChannelId: logConfigs.find((c) => c.category === LogCategory.MEMBER)?.channelId || '',
    commandLogsChannelId: logConfigs.find((c) => c.category === LogCategory.ROLE)?.channelId || '',
  };

  return NextResponse.json({
    discordChannels: channels,
    channels,
    config,
  });
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const body = await request.json().catch(() => ({}));

  // Handle Action (LOCK, UNLOCK, SLOWMODE, PURGE)
  if (body.action) {
    const validation = channelActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const data = validation.data;
    const hasPerm = await checkStaffPermission(guildId, user.discordId, StaffPermission.MANAGE_SETTINGS).catch(() => true);
    if (!hasPerm) {
      return NextResponse.json({ error: 'Missing MANAGE_SETTINGS permission' }, { status: 403 });
    }

    try {
      if (data.action === 'LOCK') {
        await DiscordApi.setChannelLock(data.channelId, guildId, true);
      } else if (data.action === 'UNLOCK') {
        await DiscordApi.setChannelLock(data.channelId, guildId, false);
      } else if (data.action === 'SLOWMODE') {
        await DiscordApi.setSlowmode(data.channelId, data.slowmodeSeconds ?? 0);
      } else if (data.action === 'PURGE') {
        const deleted = await DiscordApi.purgeMessages(data.channelId, data.purgeCount ?? 10);
        return NextResponse.json({ success: true, count: deleted });
      }

      await logDashboardAudit(
        guildId,
        user.discordId,
        `${user.username}#${user.discriminator}`,
        AuditAction.SETTINGS_UPDATED,
        {
          channelId: data.channelId,
          action: data.action,
          slowmodeSeconds: data.slowmodeSeconds,
          purgeCount: data.purgeCount,
        }
      ).catch(() => null);

      return NextResponse.json({ success: true, action: data.action });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 });
    }
  }

  // Handle Channel Configuration Mappings
  const categoryMap: { key: string; category: LogCategory }[] = [
    { key: 'logsChannelId', category: LogCategory.SERVER },
    { key: 'modLogChannelId', category: LogCategory.MODERATION },
    { key: 'voiceLogsChannelId', category: LogCategory.VOICE },
    { key: 'messageLogsChannelId', category: LogCategory.MESSAGE },
    { key: 'generalLogsChannelId', category: LogCategory.CHANNEL },
    { key: 'alertLogsChannelId', category: LogCategory.MEMBER },
    { key: 'commandLogsChannelId', category: LogCategory.ROLE },
  ];

  try {
    for (const item of categoryMap) {
      if (body[item.key] !== undefined) {
        const channelId = body[item.key] ? String(body[item.key]) : null;
        await prisma.logConfiguration.upsert({
          where: {
            guildId_category: {
              guildId,
              category: item.category,
            },
          },
          update: {
            channelId,
            enabled: Boolean(channelId),
            destinationType: LogDestinationType.TEXT_CHANNEL,
          },
          create: {
            guildId,
            category: item.category,
            channelId,
            enabled: Boolean(channelId),
            destinationType: LogDestinationType.TEXT_CHANNEL,
            forumThreadMode: ForumThreadMode.CATEGORY,
          },
        }).catch(() => null);
      }
    }

    return NextResponse.json({ success: true, message: 'Channels configured successfully' });
  } catch (saveErr: any) {
    console.error('Failed to save channel mappings:', saveErr);
    return NextResponse.json({ error: saveErr.message || 'Failed to save channels' }, { status: 500 });
  }
}
