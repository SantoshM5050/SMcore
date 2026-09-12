import { NextResponse } from 'next/server';
import { prisma, LogCategory, LogDestinationType, ForumThreadMode, AuditAction, StaffPermission } from '@repo/database';
import { AuthService } from '@/lib/auth';
import { logDashboardAudit } from '@/lib/auditLogger';
import { checkStaffPermission } from '@/lib/rbac';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ALL_CATEGORIES: LogCategory[] = [
  LogCategory.MEMBER,
  LogCategory.MODERATION,
  LogCategory.VOICE,
  LogCategory.CHANNEL,
  LogCategory.ROLE,
  LogCategory.MESSAGE,
  LogCategory.SERVER,
];

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  const existingConfigs = await prisma.logConfiguration.findMany({
    where: { guildId },
  });

  const configMap = new Map(existingConfigs.map((c) => [c.category, c]));

  const completeConfigs = ALL_CATEGORIES.map((category) => {
    return (
      configMap.get(category) || {
        guildId,
        category,
        enabled: false,
        destinationType: LogDestinationType.TEXT_CHANNEL,
        channelId: null,
        forumThreadMode: ForumThreadMode.CATEGORY,
        showIds: true,
        showModerator: true,
        showReason: true,
        showChannel: true,
        showTimestamp: true,
        showBeforeAfter: true,
        mentionUsers: false,
        embedColor: '#5865F2',
      }
    );
  });

  return NextResponse.json(completeConfigs);
}

export async function PUT(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const hasPerm = await checkStaffPermission(guildId, user.discordId, StaffPermission.MANAGE_LOGS);
  if (!hasPerm) {
    return NextResponse.json({ error: 'Missing LOGS_MANAGE permission' }, { status: 403 });
  }

  const body = await request.json().catch(() => []);
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected an array of log configurations' }, { status: 400 });
  }

  const updatedConfigs = [];

  for (const item of body) {
    if (!item.category) continue;

    const saved = await prisma.logConfiguration.upsert({
      where: {
        guildId_category: {
          guildId,
          category: item.category,
        },
      },
      update: {
        enabled: Boolean(item.enabled),
        destinationType: item.destinationType || LogDestinationType.TEXT_CHANNEL,
        channelId: item.channelId || null,
        forumThreadMode: item.forumThreadMode || ForumThreadMode.CATEGORY,
        showIds: item.showIds ?? true,
        showModerator: item.showModerator ?? true,
        showReason: item.showReason ?? true,
        showChannel: item.showChannel ?? true,
        showTimestamp: item.showTimestamp ?? true,
        showBeforeAfter: item.showBeforeAfter ?? true,
        mentionUsers: item.mentionUsers ?? false,
        embedColor: item.embedColor || '#5865F2',
      },
      create: {
        guildId,
        category: item.category,
        enabled: Boolean(item.enabled),
        destinationType: item.destinationType || LogDestinationType.TEXT_CHANNEL,
        channelId: item.channelId || null,
        forumThreadMode: item.forumThreadMode || ForumThreadMode.CATEGORY,
        showIds: item.showIds ?? true,
        showModerator: item.showModerator ?? true,
        showReason: item.showReason ?? true,
        showChannel: item.showChannel ?? true,
        showTimestamp: item.showTimestamp ?? true,
        showBeforeAfter: item.showBeforeAfter ?? true,
        mentionUsers: item.mentionUsers ?? false,
        embedColor: item.embedColor || '#5865F2',
      },
    });

    updatedConfigs.push(saved);
  }

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.LOG_CONFIG_UPDATED,
    { count: updatedConfigs.length }
  );

  return NextResponse.json(updatedConfigs);
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const { category, channelId } = await request.json().catch(() => ({}));

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required to send test log' }, { status: 400 });
  }

  const rawBotToken = process.env.DISCORD_BOT_TOKEN || '';
  const botToken = rawBotToken.trim().replace(/^["']|["']$/g, '');
  if (!botToken) {
    return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
  }

  const embed = {
    title: `🧪 Test Log - ${category || 'GENERAL'} Category`,
    description: `This is a test notification dispatched from the SMCore Web Dashboard by **${user.username}#${user.discriminator}** to verify channel delivery and permissions.`,
    color: 0x5865f2,
    fields: [
      { name: 'Channel ID', value: channelId, inline: true },
      { name: 'Status', value: '✅ Connected & Verified', inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'SMCore • Discord Moderation Platform' },
  };

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Discord API returned ${res.status}: ${err}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
