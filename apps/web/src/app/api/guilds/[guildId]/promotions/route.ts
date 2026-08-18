import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

async function sendPromotionLogEmbed(botToken: string, channelId: string, data: any) {
  if (!botToken || !channelId) return;

  const titleMap: Record<string, string> = {
    PROMOTION: '📈 GRAND RP FAMILY - PROMOTION LOG',
    DEMOTION: '📉 GRAND RP FAMILY - DEMOTION LOG',
    LEFT_FAMILY: '🚪 GRAND RP FAMILY - MEMBER LEFT',
  };

  const colorMap: Record<string, number> = {
    PROMOTION: 3066993, // Green
    DEMOTION: 15158332, // Red
    LEFT_FAMILY: 9807270, // Gray
  };

  const embed: any = {
    title: titleMap[data.actionType] || '🏆 RANK UPDATE LOG',
    color: colorMap[data.actionType] || 3447003,
    fields: [
      { name: 'Name', value: `\`${data.inGameName}\``, inline: true },
      { name: 'ID', value: `\`${data.inGameId}\` (<@${data.targetUserId}>)`, inline: true },
      { name: 'Action', value: `\`${data.actionType}\``, inline: true },
      {
        name: 'Previous Rank',
        value: data.previousRoleId ? `<@&${data.previousRoleId}>` : (data.previousRoleName || 'None'),
        inline: true,
      },
      {
        name: 'New Rank',
        value: data.actionType === 'LEFT_FAMILY'
          ? '❌ **LEFT FAMILY**'
          : data.newRoleId
          ? `<@&${data.newRoleId}>`
          : (data.newRoleName || 'None'),
        inline: true,
      },
      { name: 'By', value: `@${data.executedByTag} (<@${data.executedById}>)`, inline: true },
      { name: 'Reason', value: data.reason || 'No reason specified', inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Grand RP Family Dashboard' },
  };

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch((err) => console.warn('[PromotionLog Embed Send Failed]:', err));
}

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    const [logs, channelConfig, roleConfigs] = await Promise.all([
      prisma.promotionLog.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.channelConfiguration.findUnique({
        where: { guildId },
      }),
      prisma.roleConfiguration.findMany({
        where: { guildId, enabled: true },
        orderBy: { displayOrder: 'asc' },
      }),
    ]);

    return NextResponse.json({ logs, channelConfig, roleConfigs });
  } catch (err: any) {
    console.error('[Promotions API GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    const body = await request.json();
    const {
      action,
      promotionLogsChannelId,
      targetUserId,
      inGameName,
      inGameId,
      actionType,
      previousRoleId,
      previousRoleName,
      newRoleId,
      newRoleName,
      reason,
    } = body;

    const rawBotToken = process.env.DISCORD_BOT_TOKEN || '';
    const botToken = rawBotToken.trim().replace(/^["']|["']$/g, '');

    // 1. Handle Saving Channel Configuration
    if (action === 'SAVE_CHANNELS') {
      const updatedConfig = await prisma.channelConfiguration.upsert({
        where: { guildId },
        create: {
          guildId,
          promotionLogsChannelId: promotionLogsChannelId || null,
        },
        update: {
          promotionLogsChannelId: promotionLogsChannelId || null,
        },
      });
      return NextResponse.json({ success: true, channelConfig: updatedConfig });
    }

    // 2. Handle Submitting Rank Change / Promotion / Demotion / Left Family
    if (!targetUserId || !inGameName || !inGameId) {
      return NextResponse.json({ error: 'Target User ID, In-Game Name, and In-Game ID are required.' }, { status: 400 });
    }

    const cleanUserId = targetUserId.replace(/[<@!>]/g, '').trim();
    let roleSwapSuccess = false;
    let roleSwapError = '';

    // Swap roles on Discord if Bot Token is available
    if (botToken) {
      try {
        if (actionType === 'LEFT_FAMILY') {
          // Remove previous role if provided
          if (previousRoleId && previousRoleId !== 'NONE') {
            await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${cleanUserId}/roles/${previousRoleId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bot ${botToken}` },
            }).catch(() => null);
          }

          // Remove all configured requestable roles
          const configuredRoles = await prisma.roleConfiguration.findMany({ where: { guildId } });
          for (const cr of configuredRoles) {
            await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${cleanUserId}/roles/${cr.roleId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bot ${botToken}` },
            }).catch(() => null);
          }
          roleSwapSuccess = true;
        } else {
          // Promotion or Demotion
          // Remove old role
          if (previousRoleId && previousRoleId !== 'NONE') {
            await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${cleanUserId}/roles/${previousRoleId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bot ${botToken}` },
            }).catch(() => null);
          }

          // Add new role
          if (newRoleId && newRoleId !== 'NONE') {
            const addRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${cleanUserId}/roles/${newRoleId}`, {
              method: 'PUT',
              headers: { Authorization: `Bot ${botToken}` },
            });
            roleSwapSuccess = addRes.ok || addRes.status === 204;
            if (!roleSwapSuccess) {
              roleSwapError = await addRes.text();
            }
          } else {
            roleSwapSuccess = true;
          }
        }
      } catch (err: any) {
        console.warn('[Dashboard Role Swap Warning]:', err.message);
        roleSwapError = err.message;
      }
    } else {
      roleSwapSuccess = true;
    }

    // Save record to database
    const log = await prisma.promotionLog.create({
      data: {
        guildId,
        targetUserId: cleanUserId,
        targetUserTag: cleanUserId,
        inGameName,
        inGameId,
        actionType: actionType || 'PROMOTION',
        previousRoleId: previousRoleId || null,
        previousRoleName: previousRoleName || null,
        newRoleId: newRoleId || null,
        newRoleName: newRoleName || null,
        reason: reason || null,
        executedById: user.discordId,
        executedByTag: user.username,
      },
    });

    // Create Audit Log record
    await prisma.auditLog.create({
      data: {
        guildId,
        userId: user.discordId,
        userTag: user.username,
        action: actionType === 'LEFT_FAMILY' ? 'MEMBER_LEFT_FAMILY' : actionType === 'DEMOTION' ? 'DEMOTION_LOGGED' : 'PROMOTION_LOGGED',
        details: {
          inGameName,
          inGameId,
          targetUserId: cleanUserId,
          actionType,
          previousRoleName,
          newRoleName,
          reason,
        },
      },
    });

    // Send Discord Log Embed if channel is configured
    const channelConfig = await prisma.channelConfiguration.findUnique({ where: { guildId } });
    if (botToken && channelConfig?.promotionLogsChannelId) {
      await sendPromotionLogEmbed(botToken, channelConfig.promotionLogsChannelId, log);
    }

    return NextResponse.json({
      success: true,
      roleSwapSuccess,
      roleSwapError,
      log,
    });
  } catch (err: any) {
    console.error('[Promotions API POST Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
