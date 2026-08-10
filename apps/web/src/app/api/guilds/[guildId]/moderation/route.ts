import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    const logs = await prisma.moderationLog.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(logs);
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
    const { action, targetUserId, targetUserTag, reason, durationMinutes, channelId, messageCount } = body;

    if (!action) {
      return NextResponse.json({ error: 'Moderation action is required' }, { status: 400 });
    }

    const rawBotToken = process.env.DISCORD_BOT_TOKEN || '';
    const botToken = rawBotToken.trim().replace(/^["']|["']$/g, '');

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
        // Fetch recent messages
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
      executionSuccess = true; // DB log mode
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
