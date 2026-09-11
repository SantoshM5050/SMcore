import { NextResponse } from 'next/server';
import { prisma, ModerationAction, AuditAction, StaffPermission } from '@repo/database';
import { AuthService } from '@/lib/auth';
import { DiscordApi } from '@/lib/discord';
import { logDashboardAudit } from '@/lib/auditLogger';
import { checkStaffPermission } from '@/lib/rbac';
import { z } from 'zod';

const actionSchema = z.object({
  action: z.nativeEnum(ModerationAction),
  targetId: z.string().min(1),
  targetTag: z.string().optional().default('Unknown User'),
  reason: z.string().optional().default('No reason specified'),
  durationMinutes: z.number().int().min(1).optional(),
  channelId: z.string().optional(),
  purgeCount: z.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    const [cases, totalCases, totalBans, totalTimeouts, totalWarnings] = await Promise.all([
      prisma.moderationCase.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.moderationCase.count({ where: { guildId } }),
      prisma.moderationCase.count({ where: { guildId, action: ModerationAction.BAN } }),
      prisma.moderationCase.count({ where: { guildId, action: ModerationAction.TIMEOUT } }),
      prisma.warning.count({ where: { guildId, isActive: true } }),
    ]);

    return NextResponse.json({
      cases,
      stats: {
        totalCases,
        totalBans,
        totalTimeouts,
        totalWarnings,
      },
    });
  } catch (err: any) {
    console.error('[Moderation API GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const body = await request.json().catch(() => ({}));
  const validation = actionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;
  const botToken = (process.env.DISCORD_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');

  // RBAC Permission Checking
  let requiredPerm: StaffPermission = StaffPermission.WARN_MEMBERS;
  if (data.action === ModerationAction.BAN || data.action === ModerationAction.UNBAN) {
    requiredPerm = StaffPermission.BAN_MEMBERS;
  } else if (data.action === ModerationAction.KICK) {
    requiredPerm = StaffPermission.KICK_MEMBERS;
  } else if (data.action === ModerationAction.TIMEOUT || data.action === ModerationAction.TIMEOUT_REMOVE) {
    requiredPerm = StaffPermission.TIMEOUT_MEMBERS;
  } else if (
    data.action === ModerationAction.PURGE ||
    data.action === ModerationAction.LOCK ||
    data.action === ModerationAction.UNLOCK ||
    data.action === ModerationAction.SLOWMODE
  ) {
    requiredPerm = StaffPermission.MANAGE_SETTINGS;
  }

  const hasPerm = await checkStaffPermission(guildId, user.discordId, requiredPerm);
  if (!hasPerm) {
    return NextResponse.json({ error: `Missing required permission: ${requiredPerm}` }, { status: 403 });
  }

  try {
    // 1. Execute via Discord API if bot token available
    if (botToken) {
      if (data.action === ModerationAction.BAN) {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/bans/${data.targetId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: data.reason }),
        });
      } else if (data.action === ModerationAction.UNBAN) {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/bans/${data.targetId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bot ${botToken}` },
        });
      } else if (data.action === ModerationAction.KICK) {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${data.targetId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bot ${botToken}` },
        });
      } else if (data.action === ModerationAction.TIMEOUT) {
        const durationMs = (data.durationMinutes || 60) * 60 * 1000;
        const communicationDisabledUntil = new Date(Date.now() + durationMs).toISOString();
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${data.targetId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ communication_disabled_until: communicationDisabledUntil }),
        });
      } else if (data.action === ModerationAction.TIMEOUT_REMOVE) {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${data.targetId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ communication_disabled_until: null }),
        });
      } else if (data.action === ModerationAction.PURGE && data.channelId) {
        await DiscordApi.purgeMessages(data.channelId, data.purgeCount || 10);
      } else if (data.action === ModerationAction.LOCK && data.channelId) {
        await DiscordApi.setChannelLock(data.channelId, guildId, true);
      } else if (data.action === ModerationAction.UNLOCK && data.channelId) {
        await DiscordApi.setChannelLock(data.channelId, guildId, false);
      }
    }

    // 2. Determine case number
    const lastCase = await prisma.moderationCase.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
      select: { caseNumber: true },
    });
    const nextCaseNumber = (lastCase?.caseNumber || 0) + 1;

    // 3. Record Moderation Case
    const modCase = await prisma.moderationCase.create({
      data: {
        guildId,
        caseNumber: nextCaseNumber,
        action: data.action,
        targetId: data.targetId,
        targetTag: data.targetTag,
        moderatorId: user.discordId,
        moderatorTag: `${user.username}#${user.discriminator}`,
        reason: data.reason,
        durationMinutes: data.durationMinutes || null,
        metadata: {
          channelId: data.channelId || null,
          purgeCount: data.purgeCount || null,
          executedVia: 'DASHBOARD',
        },
      },
    });

    // If action is WARN, also create Warning record
    if (data.action === ModerationAction.WARN) {
      const lastWarn = await prisma.warning.findFirst({
        where: { guildId, userId: data.targetId },
        orderBy: { warningNumber: 'desc' },
        select: { warningNumber: true },
      });
      await prisma.warning.create({
        data: {
          guildId,
          userId: data.targetId,
          userTag: data.targetTag,
          moderatorId: user.discordId,
          moderatorTag: `${user.username}#${user.discriminator}`,
          reason: data.reason,
          warningNumber: (lastWarn?.warningNumber || 0) + 1,
          caseId: modCase.id,
        },
      });
    }

    // 4. Audit Log
    await logDashboardAudit(
      guildId,
      user.discordId,
      `${user.username}#${user.discriminator}`,
      AuditAction.CASE_CREATED,
      {
        caseNumber: nextCaseNumber,
        action: data.action,
        targetId: data.targetId,
        targetTag: data.targetTag,
        reason: data.reason,
      }
    );

    return NextResponse.json(modCase);
  } catch (err: any) {
    console.error('[Moderation POST Action Error]:', err);
    return NextResponse.json({ error: err.message || 'Execution failed' }, { status: 500 });
  }
}
