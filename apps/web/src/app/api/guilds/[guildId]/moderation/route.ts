import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

async function sendModerationLogEmbed(botToken: string, channelId: string, data: any) {
  if (!botToken || !channelId) return;

  const colorMap: Record<string, number> = {
    BAN: 15158332,
    KICK: 15105570,
    TIMEOUT: 3447003,
    WARN: 16776960,
    PURGE: 10181046,
  };

  const actionEmoji: Record<string, string> = {
    BAN: '🚫 BAN',
    KICK: '🥾 KICK',
    TIMEOUT: '⏱️ TIMEOUT / MUTE',
    WARN: '⚠️ WARN',
    PURGE: '🧹 PURGE MESSAGES',
  };

  const embed: any = {
    title: `🛡️ Moderation Action - ${actionEmoji[data.action] || data.action}`,
    color: colorMap[data.action] || 5793266,
    fields: [
      { name: 'Target User', value: `${data.targetUserTag} (${data.targetUserId !== 'N/A' && data.targetUserId !== 'CHANNEL' ? `<@${data.targetUserId}>` : data.targetUserId})`, inline: true },
      { name: 'Moderator Staff', value: `@${data.moderatorTag} (<@${data.moderatorId}>)`, inline: true },
      { name: 'Reason', value: data.reason || 'No reason specified', inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'SMCore Moderation Logs' },
  };

  if (data.durationMinutes) {
    embed.fields.push({ name: 'Duration', value: `${data.durationMinutes} Minutes`, inline: true });
  }
  if (data.count) {
    embed.fields.push({ name: 'Messages Deleted', value: `${data.count} Messages`, inline: true });
  }

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch((err) => console.warn('[ModLog Embed Send Failed]:', err));
}

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    const [logs, channelsConfig] = await Promise.all([
      prisma.moderationLog.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.channelConfiguration.findUnique({
        where: { guildId },
      }),
    ]);

    return NextResponse.json({ logs, channelsConfig });
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

  try {
    const body = await request.json();
    const { action, targetUserId, targetUserTag, reason, durationMinutes, channelId, messageCount, modLogChannelId, modPanelChannelId } = body;

    const rawBotToken = process.env.DISCORD_BOT_TOKEN || '';
    const botToken = rawBotToken.trim().replace(/^["']|["']$/g, '');

    // Handle Saving Channel Configurations
    if (action === 'SAVE_CHANNELS') {
      const updatedConfig = await prisma.channelConfiguration.upsert({
        where: { guildId },
        create: {
          guildId,
          modLogChannelId: modLogChannelId || null,
          modPanelChannelId: modPanelChannelId || null,
        },
        update: {
          modLogChannelId: modLogChannelId || null,
          modPanelChannelId: modPanelChannelId || null,
        },
      });
      return NextResponse.json({ success: true, channelsConfig: updatedConfig });
    }

    // Handle Deploying Interactive Moderation Control Panel Embed
    if (action === 'DEPLOY_PANEL') {
      const targetChan = channelId || modPanelChannelId;
      if (!targetChan) {
        return NextResponse.json({ error: 'Target Discord channel is required to deploy Moderation Panel' }, { status: 400 });
      }

      if (!botToken) {
        return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
      }

      const res = await fetch(`https://discord.com/api/v10/channels/${targetChan}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [
            {
              title: '🛡️ Interactive Moderation Control Panel',
              description: 'Click any button below to execute a server moderation action.\n\nA pop-up dialog will open in Discord allowing you to specify the **Target User ID / Mention** and **Reason**.',
              color: 15158332,
              fields: [
                { name: 'Available Tools', value: '🚫 Ban Member | 🥾 Kick Member | ⏱️ Timeout Member | ⚠️ Issue Warning | 🧹 Purge Chat Messages', inline: false }
              ],
              footer: { text: 'SMCore Discord Staff Moderation Hub' },
              timestamp: new Date().toISOString(),
            },
          ],
          components: [
            {
              type: 1,
              components: [
                { type: 2, style: 4, custom_id: 'mod_panel_ban', label: 'Ban User', emoji: { name: '🚫' } },
                { type: 2, style: 3, custom_id: 'mod_panel_kick', label: 'Kick User', emoji: { name: '🥾' } },
                { type: 2, style: 1, custom_id: 'mod_panel_timeout', label: 'Timeout', emoji: { name: '⏱️' } },
                { type: 2, style: 2, custom_id: 'mod_panel_warn', label: 'Warn User', emoji: { name: '⚠️' } },
                { type: 2, style: 2, custom_id: 'mod_panel_purge', label: 'Purge', emoji: { name: '🧹' } },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `Discord API error: ${errText}` }, { status: 400 });
      }

      // Save panel channel ID
      await prisma.channelConfiguration.upsert({
        where: { guildId },
        create: { guildId, modPanelChannelId: targetChan },
        update: { modPanelChannelId: targetChan },
      });

      return NextResponse.json({ success: true, message: 'Moderation Control Panel successfully deployed to channel!' });
    }

    if (!action) {
      return NextResponse.json({ error: 'Moderation action is required' }, { status: 400 });
    }

    let executionSuccess = false;
    let errorDetail = '';

    if (botToken) {
      if (action === 'BAN' && targetUserId) {
        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/bans/${targetUserId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: reason || `Banned by ${user.username} via SMCore Dashboard` }),
        });
        executionSuccess = res.ok || res.status === 204;
        if (!executionSuccess) errorDetail = await res.text();
      } else if (action === 'KICK' && targetUserId) {
        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${targetUserId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bot ${botToken}`,
            'X-Audit-Log-Reason': reason || `Kicked by ${user.username} via SMCore Dashboard`,
          },
        });
        executionSuccess = res.ok || res.status === 204;
        if (!executionSuccess) errorDetail = await res.text();
      } else if (action === 'TIMEOUT' && targetUserId) {
        const mins = Number(durationMinutes) || 10;
        const untilDate = new Date(Date.now() + mins * 60 * 1000).toISOString();
        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${targetUserId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            communication_disabled_until: untilDate,
          }),
        });
        executionSuccess = res.ok || res.status === 200;
        if (!executionSuccess) errorDetail = await res.text();
      } else if (action === 'PURGE' && channelId) {
        const limit = Math.min(Math.max(Number(messageCount) || 10, 1), 100);
        const getMsgsRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (getMsgsRes.ok) {
          const msgs: { id: string }[] = await getMsgsRes.json();
          if (msgs.length > 0) {
            const bulkRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/bulk-delete`, {
              method: 'POST',
              headers: {
                Authorization: `Bot ${botToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: msgs.map((m) => m.id),
              }),
            });
            executionSuccess = bulkRes.ok || bulkRes.status === 204;
            if (!executionSuccess) errorDetail = await bulkRes.text();
          } else {
            executionSuccess = true;
          }
        }
      } else if (action === 'WARN') {
        executionSuccess = true;
      }
    } else {
      executionSuccess = true;
    }

    // Record Moderation Log
    const modLog = await prisma.moderationLog.create({
      data: {
        guildId,
        targetUserId: targetUserId || 'N/A',
        targetUserTag: targetUserTag || targetUserId || 'N/A',
        moderatorId: user.discordId,
        moderatorTag: user.username,
        action,
        reason: reason || null,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        count: messageCount ? Number(messageCount) : null,
      },
    });

    // Also record into AuditLog
    await prisma.auditLog.create({
      data: {
        guildId,
        userId: user.discordId,
        userTag: user.username,
        action: 'SETTINGS_UPDATED',
        details: {
          modAction: action,
          target: targetUserTag || targetUserId || channelId || 'Server Member',
          reason: reason || null,
          durationMinutes: durationMinutes || null,
        },
      },
    });

    // Post rich Moderation Log Embed into configured modLogChannelId
    const channelsConfig = await prisma.channelConfiguration.findUnique({ where: { guildId } });
    if (botToken && channelsConfig?.modLogChannelId) {
      await sendModerationLogEmbed(botToken, channelsConfig.modLogChannelId, modLog);
    }

    return NextResponse.json({
      success: true,
      executionSuccess,
      errorDetail,
      log: modLog,
    });
  } catch (err: any) {
    console.error('[Moderation API POST Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
