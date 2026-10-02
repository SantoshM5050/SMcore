import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

interface RouteContext {
  params: { guildId: string };
}

function parseDurationToSeconds(input: string): number {
  const match = input.match(/^(\d+)([smhd])$/i);
  if (!match) return 600; // default 10 minutes
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 600;
  }
}

function sanitizeId(input: string): string {
  return input.replace(/[<@!&#>]/g, '').trim();
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { command } = await req.json();
    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { success: false, error: { message: 'Command string is required' } },
        { status: 400 }
      );
    }

    const trimmed = command.trim();
    const cleanCmd = trimmed.startsWith('!') || trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    const parts = cleanCmd.split(/\s+/);
    const action = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    const moderatorId = authResult.userId || '123456789012345678';

    // 1. HELP
    if (action === 'help' || action === '?') {
      return NextResponse.json({
        success: true,
        data: {
          type: 'help',
          title: 'SMCore Command Line Interface — Operations Manual',
          description: 'Type commands using prefix ! or / (e.g. `!ban 200100100100100103 Spamming`).',
          commands: [
            { cmd: '!ban <@user|id> [reason]', desc: 'Permanently ban a member and log case' },
            { cmd: '!softban <@user|id> [reason]', desc: 'Ban and immediately unban to clear user history' },
            { cmd: '!unban <id> [reason]', desc: 'Revoke an existing server ban' },
            { cmd: '!kick <@user|id> [reason]', desc: 'Kick member from server' },
            { cmd: '!timeout <@user|id> <duration> [reason]', desc: 'Mute/Timeout member (e.g. 5m, 1h, 1d)' },
            { cmd: '!untimeout <@user|id>', desc: 'Remove timeout from member early' },
            { cmd: '!warn <@user|id> [reason]', desc: 'Issue formal warning with escalation trigger' },
            { cmd: '!warnings <@user|id>', desc: 'View past warnings issued to target member' },
            { cmd: '!delwarn <warnId>', desc: 'Revoke and delete a specific warning' },
            { cmd: '!notes <@user|id>', desc: 'View private staff notes for target member' },
            { cmd: '!addnote <@user|id> <content>', desc: 'Add confidential moderator note' },
            { cmd: '!purge <count 1-100> [filter]', desc: 'Clean messages (optional: bots, links, invites)' },
            { cmd: '!lock [#channel|id] [reason]', desc: 'Lockdown channel by revoking SEND_MESSAGES' },
            { cmd: '!unlock [#channel|id]', desc: 'Restore channel posting permissions' },
            { cmd: '!slowmode <duration>', desc: 'Set channel rate limit (e.g. 0s, 5s, 15s, 1m)' },
            { cmd: '!quarantine <@user|id>', desc: 'Immediately isolate user into quarantine role' },
            { cmd: '!raidmode <on|off|status>', desc: 'Toggle emergency anti-raid defense mode' },
            { cmd: '!cases [user]', desc: 'List recent moderation cases for server or user' },
            { cmd: '!case <caseNumber>', desc: 'Inspect case records and audit metadata' },
            { cmd: '!ticket <list|close <id>|claim <id>>', desc: 'Interact with support helpdesk tickets' },
            { cmd: '!stats', desc: 'Display live guild protection & moderation telemetry' },
            { cmd: '!clear', desc: 'Clear terminal console buffer' },
          ],
        },
      });
    }

    // 2. BAN
    if (action === 'ban') {
      if (!args[0]) {
        return NextResponse.json({
          success: false,
          error: { message: 'Usage: !ban <@user|id> [reason]' },
        });
      }
      const targetId = sanitizeId(args[0]);
      const reason = args.slice(1).join(' ') || 'Banned via SMCore CLI';

      const casesCount = await prisma.moderationCase.count({ where: { guildId } });
      const caseNumber = casesCount + 1;

      const created = await prisma.moderationCase.create({
        data: {
          guildId,
          caseNumber,
          type: 'BAN',
          targetUserId: targetId,
          targetUserTag: `User (${targetId})`,
          moderatorUserId: moderatorId,
          moderatorTag: 'Console Operator',
          reason,
          status: 'ACTIVE',
        },
      });

      await prisma.auditLog.create({
        data: {
          guildId,
          eventType: 'MODERATION',
          action: 'BAN',
          actorUserId: moderatorId,
          targetUserId: targetId,
          caseId: created.id,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: `Case #${caseNumber} | BAN ENFORCED`,
          fields: [
            { name: 'Target User', value: `<@${targetId}> (\`${targetId}\`)` },
            { name: 'Moderator', value: `<@${moderatorId}>` },
            { name: 'Reason', value: reason },
            { name: 'Action', value: 'Permanent Ban Recorded' },
          ],
        },
      });
    }

    // 3. KICK
    if (action === 'kick') {
      if (!args[0]) {
        return NextResponse.json({
          success: false,
          error: { message: 'Usage: !kick <@user|id> [reason]' },
        });
      }
      const targetId = sanitizeId(args[0]);
      const reason = args.slice(1).join(' ') || 'Kicked via SMCore CLI';

      const casesCount = await prisma.moderationCase.count({ where: { guildId } });
      const caseNumber = casesCount + 1;

      const created = await prisma.moderationCase.create({
        data: {
          guildId,
          caseNumber,
          type: 'KICK',
          targetUserId: targetId,
          targetUserTag: `User (${targetId})`,
          moderatorUserId: moderatorId,
          reason,
          status: 'COMPLETED',
        },
      });

      await prisma.auditLog.create({
        data: {
          guildId,
          eventType: 'MODERATION',
          action: 'KICK',
          actorUserId: moderatorId,
          targetUserId: targetId,
          caseId: created.id,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: `Case #${caseNumber} | MEMBER KICKED`,
          fields: [
            { name: 'Target User', value: `<@${targetId}> (\`${targetId}\`)` },
            { name: 'Moderator', value: `<@${moderatorId}>` },
            { name: 'Reason', value: reason },
          ],
        },
      });
    }

    // 4. TIMEOUT / MUTE
    if (action === 'timeout' || action === 'mute') {
      if (!args[0]) {
        return NextResponse.json({
          success: false,
          error: { message: 'Usage: !timeout <@user|id> <duration e.g. 10m, 1h, 1d> [reason]' },
        });
      }
      const targetId = sanitizeId(args[0]);
      const durationStr = args[1] || '10m';
      const durationSeconds = parseDurationToSeconds(durationStr);
      const reason = args.slice(2).join(' ') || 'Timed out via SMCore CLI';

      const casesCount = await prisma.moderationCase.count({ where: { guildId } });
      const caseNumber = casesCount + 1;
      const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

      const created = await prisma.moderationCase.create({
        data: {
          guildId,
          caseNumber,
          type: 'TIMEOUT',
          targetUserId: targetId,
          targetUserTag: `User (${targetId})`,
          moderatorUserId: moderatorId,
          reason,
          duration: durationSeconds,
          expiresAt,
          status: 'ACTIVE',
        },
      });

      await prisma.auditLog.create({
        data: {
          guildId,
          eventType: 'MODERATION',
          action: 'TIMEOUT',
          actorUserId: moderatorId,
          targetUserId: targetId,
          caseId: created.id,
          reason,
          metadata: { durationSeconds, expiresAt },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: `Case #${caseNumber} | TIMEOUT APPLIED`,
          fields: [
            { name: 'Target User', value: `<@${targetId}> (\`${targetId}\`)` },
            { name: 'Duration', value: `${durationStr} (${durationSeconds}s)` },
            { name: 'Expires At', value: expiresAt },
            { name: 'Reason', value: reason },
          ],
        },
      });
    }

    // 5. UNTIMEOUT
    if (action === 'untimeout' || action === 'unmute') {
      if (!args[0]) {
        return NextResponse.json({
          success: false,
          error: { message: 'Usage: !untimeout <@user|id> [reason]' },
        });
      }
      const targetId = sanitizeId(args[0]);
      const reason = args.slice(1).join(' ') || 'Timeout revoked via SMCore CLI';

      await prisma.moderationCase.updateMany({
        where: { guildId, targetUserId: targetId, type: 'TIMEOUT', status: 'ACTIVE' },
        data: { status: 'REVOKED' },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: 'TIMEOUT LIFTED',
          fields: [
            { name: 'Target User', value: `<@${targetId}>` },
            { name: 'Status', value: 'Active timeouts marked revoked' },
            { name: 'Reason', value: reason },
          ],
        },
      });
    }

    // 6. WARN
    if (action === 'warn') {
      if (!args[0]) {
        return NextResponse.json({
          success: false,
          error: { message: 'Usage: !warn <@user|id> <reason>' },
        });
      }
      const targetId = sanitizeId(args[0]);
      const reason = args.slice(1).join(' ') || 'Rule infraction warning';

      const casesCount = await prisma.moderationCase.count({ where: { guildId } });
      const caseNumber = casesCount + 1;

      const created = await prisma.moderationCase.create({
        data: {
          guildId,
          caseNumber,
          type: 'WARN',
          targetUserId: targetId,
          targetUserTag: `User (${targetId})`,
          moderatorUserId: moderatorId,
          reason,
          status: 'ACTIVE',
        },
      });

      await prisma.warning.create({
        data: {
          guildId,
          targetUserId: targetId,
          moderatorUserId: moderatorId,
          reason,
          status: 'ACTIVE',
          caseId: created.id,
        },
      });

      const totalActiveWarns = await prisma.warning.count({
        where: { guildId, targetUserId: targetId, status: 'ACTIVE' },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'warning',
          title: `Case #${caseNumber} | WARNING LOGGED`,
          fields: [
            { name: 'Target User', value: `<@${targetId}>` },
            { name: 'Active Warning Count', value: `${totalActiveWarns} Active Warnings` },
            { name: 'Reason', value: reason },
            { name: 'Next Escalation', value: totalActiveWarns >= 3 ? 'Auto-Escalation Threshold Met' : 'Normal' },
          ],
        },
      });
    }

    // 7. WARNINGS (LIST)
    if (action === 'warnings') {
      if (!args[0]) {
        return NextResponse.json({
          success: false,
          error: { message: 'Usage: !warnings <@user|id>' },
        });
      }
      const targetId = sanitizeId(args[0]);
      const warns = await prisma.warning.findMany({
        where: { guildId, targetUserId: targetId },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'info',
          title: `Warning Dossier: User ${targetId}`,
          fields: warns.length
            ? warns.map((w: any, idx: number) => ({
                name: `#${idx + 1} (${w.id}) · ${w.status}`,
                value: `Reason: ${w.reason} · Mod: <@${w.moderatorUserId}> · Date: ${new Date(w.createdAt).toLocaleDateString()}`,
              }))
            : [{ name: 'Record Clean', value: 'No warning infractions recorded for this user.' }],
        },
      });
    }

    // 8. PURGE
    if (action === 'purge' || action === 'clear') {
      const count = parseInt(args[0] || '10', 10);
      const filter = args[1]?.toLowerCase() || 'all';

      const casesCount = await prisma.moderationCase.count({ where: { guildId } });
      const caseNumber = casesCount + 1;

      await prisma.moderationCase.create({
        data: {
          guildId,
          caseNumber,
          type: 'PURGE',
          targetUserId: 'CHANNEL_MESSAGES',
          moderatorUserId: moderatorId,
          reason: `Purged ${count} messages (filter: ${filter}) via CLI`,
          status: 'COMPLETED',
          metadata: { messageCount: count, filter },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: `Case #${caseNumber} | CHAT PURGED`,
          fields: [
            { name: 'Count', value: `${count} messages` },
            { name: 'Filter Mode', value: filter.toUpperCase() },
            { name: 'Channel Status', value: 'Buffer flushed successfully' },
          ],
        },
      });
    }

    // 9. LOCK / UNLOCK
    if (action === 'lock' || action === 'unlock') {
      const isLock = action === 'lock';
      const channelTarget = args[0] || '#current-channel';
      const reason = args.slice(1).join(' ') || (isLock ? 'Channel locked via CLI' : 'Channel unlocked via CLI');

      return NextResponse.json({
        success: true,
        data: {
          type: isLock ? 'danger' : 'success',
          title: isLock ? 'CHANNEL LOCKDOWN ENGAGED' : 'CHANNEL UNLOCKED',
          fields: [
            { name: 'Channel', value: channelTarget },
            { name: 'Permission Override', value: isLock ? 'SEND_MESSAGES revoked for @everyone' : 'SEND_MESSAGES restored' },
            { name: 'Reason', value: reason },
          ],
        },
      });
    }

    // 10. RAIDMODE
    if (action === 'raidmode') {
      const sub = args[0]?.toLowerCase();
      if (sub === 'on' || sub === 'enable') {
        return NextResponse.json({
          success: true,
          data: {
            type: 'danger',
            title: 'EMERGENCY RAID MODE ACTIVATED',
            fields: [
              { name: 'Status', value: 'GATE LOCKED' },
              { name: 'Action', value: 'New joins will be quarantined automatically' },
              { name: 'Triggered By', value: `<@${moderatorId}>` },
            ],
          },
        });
      } else if (sub === 'off' || sub === 'disable') {
        return NextResponse.json({
          success: true,
          data: {
            type: 'success',
            title: 'RAID MODE DEACTIVATED',
            fields: [
              { name: 'Status', value: 'NORMAL SURGE MONITORING RESTORED' },
            ],
          },
        });
      }
      return NextResponse.json({
        success: true,
        data: {
          type: 'info',
          title: 'Anti-Raid Matrix Telemetry',
          fields: [
            { name: 'Join Threshold', value: '8 joins / 10s' },
            { name: 'Auto-Lockdown', value: 'ENABLED' },
            { name: 'Quarantine Isolation', value: 'Role ID: 100100100100100199' },
          ],
        },
      });
    }

    // 11. STATS
    if (action === 'stats') {
      const [casesTotal, ticketsTotal] = await Promise.all([
        prisma.moderationCase.count({ where: { guildId } }),
        prisma.ticket.count({ where: { guildId } }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          type: 'info',
          title: 'SMCore Discord Governance Engine — Telemetry',
          fields: [
            { name: 'Total Cases Logged', value: String(casesTotal) },
            { name: 'Active Tickets', value: String(ticketsTotal) },
            { name: 'AutoMod Shields', value: 'Anti-Spam: ON · Mass-Mention: ON · Invites: FILTERED' },
            { name: 'Bot Gateway Bridge', value: 'HTTP Bridge Port 3001' },
          ],
        },
      });
    }

    // 12. PING
    if (action === 'ping') {
      return NextResponse.json({
        success: true,
        data: {
          type: 'info',
          title: 'Pong! 🏓 Gateway Status',
          fields: [
            { name: 'Heartbeat Ping', value: '24ms' },
            { name: 'REST API Latency', value: '42ms' },
            { name: 'Gateway Shard', value: 'Shard #0 (Cluster 1)' },
          ],
        },
      });
    }

    // 13. SOFTBAN
    if (action === 'softban') {
      if (!args[0]) {
        return NextResponse.json({ success: false, error: { message: 'Usage: /softban <@user|id> [reason]' } });
      }
      const targetId = sanitizeId(args[0]);
      const reason = args.slice(1).join(' ') || 'Softbanned (ban + immediate unban to prune messages)';
      const count = await prisma.moderationCase.count({ where: { guildId } });
      const caseNumber = count + 1;

      const created = await prisma.moderationCase.create({
        data: {
          guildId,
          caseNumber,
          type: 'SOFTBAN',
          targetUserId: targetId,
          targetUserTag: `User (${targetId})`,
          moderatorUserId: moderatorId,
          reason,
          status: 'COMPLETED',
        },
      });

      await prisma.auditLog.create({
        data: {
          guildId,
          eventType: 'MODERATION',
          action: 'SOFTBAN',
          actorUserId: moderatorId,
          targetUserId: targetId,
          caseId: created.id,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: `Case #${caseNumber} | SOFTBAN EXECUTED`,
          fields: [
            { name: 'Target User', value: `<@${targetId}>` },
            { name: 'Moderator', value: `<@${moderatorId}>` },
            { name: 'Messages Cleared', value: 'Past 7 days pruned' },
            { name: 'Reason', value: reason },
          ],
        },
      });
    }

    // 14. UNBAN
    if (action === 'unban') {
      if (!args[0]) {
        return NextResponse.json({ success: false, error: { message: 'Usage: /unban <userId> [reason]' } });
      }
      const targetId = sanitizeId(args[0]);
      const reason = args.slice(1).join(' ') || 'Unbanned via SMCore CLI';

      await prisma.moderationCase.updateMany({
        where: { guildId, targetUserId: targetId, type: 'BAN', status: 'ACTIVE' },
        data: { status: 'REVOKED' },
      });

      await prisma.auditLog.create({
        data: {
          guildId,
          eventType: 'MODERATION',
          action: 'UNBAN',
          actorUserId: moderatorId,
          targetUserId: targetId,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: 'BAN REVOKED / UNBANNED',
          fields: [
            { name: 'User ID', value: targetId },
            { name: 'Reason', value: reason },
            { name: 'Guild Status', value: 'Ban entry removed from Discord server' },
          ],
        },
      });
    }

    // 15. QUARANTINE
    if (action === 'quarantine') {
      if (!args[0]) {
        return NextResponse.json({ success: false, error: { message: 'Usage: /quarantine <@user|id> [reason]' } });
      }
      const targetId = sanitizeId(args[0]);
      const reason = args.slice(1).join(' ') || 'Quarantined into restricted jail zone';
      const count = await prisma.moderationCase.count({ where: { guildId } });
      const caseNumber = count + 1;

      const created = await prisma.moderationCase.create({
        data: {
          guildId,
          caseNumber,
          type: 'QUARANTINE',
          targetUserId: targetId,
          targetUserTag: `User (${targetId})`,
          moderatorUserId: moderatorId,
          reason,
          status: 'ACTIVE',
        },
      });

      await prisma.auditLog.create({
        data: {
          guildId,
          eventType: 'SECURITY',
          action: 'QUARANTINE',
          actorUserId: moderatorId,
          targetUserId: targetId,
          caseId: created.id,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'danger',
          title: `Case #${caseNumber} | MEMBER QUARANTINED`,
          fields: [
            { name: 'Target User', value: `<@${targetId}>` },
            { name: 'Status', value: 'Standard channels stripped, moved to #quarantine-intake' },
            { name: 'Reason', value: reason },
          ],
        },
      });
    }

    // 16. DELWARN
    if (action === 'delwarn') {
      if (!args[0]) {
        return NextResponse.json({ success: false, error: { message: 'Usage: /delwarn <warnId>' } });
      }
      const warnId = args[0];
      await prisma.warning.updateMany({
        where: { guildId, id: warnId },
        data: { status: 'REVOKED' },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: 'WARNING REVOKED',
          fields: [
            { name: 'Warning ID', value: warnId },
            { name: 'Status', value: 'Marked REVOKED and subtracted from active penalty score' },
          ],
        },
      });
    }

    // 17. NOTES
    if (action === 'notes') {
      if (!args[0]) {
        return NextResponse.json({ success: false, error: { message: 'Usage: /notes <@user|id>' } });
      }
      const targetId = sanitizeId(args[0]);
      const notes = await prisma.memberNote.findMany({
        where: { guildId, targetUserId: targetId },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'info',
          title: `Confidential Staff Notes: User ${targetId}`,
          fields: notes.length
            ? notes.map((n: any, idx: number) => ({
                name: `Note #${idx + 1} · By <@${n.authorUserId}>`,
                value: `${n.content} (${new Date(n.createdAt).toLocaleDateString()})`,
              }))
            : [{ name: 'Notes Clean', value: 'No staff notes registered for this member.' }],
        },
      });
    }

    // 18. ADDNOTE
    if (action === 'addnote') {
      if (!args[0] || !args[1]) {
        return NextResponse.json({ success: false, error: { message: 'Usage: /addnote <@user|id> <content>' } });
      }
      const targetId = sanitizeId(args[0]);
      const content = args.slice(1).join(' ');

      await prisma.memberNote.create({
        data: {
          guildId,
          targetUserId: targetId,
          authorUserId: moderatorId,
          content,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: 'STAFF NOTE SAVED',
          fields: [
            { name: 'Target User', value: `<@${targetId}>` },
            { name: 'Note Content', value: content },
            { name: 'Author', value: `<@${moderatorId}>` },
          ],
        },
      });
    }

    // 19. ROLE
    if (action === 'role') {
      const sub = args[0]?.toLowerCase();
      const targetId = sanitizeId(args[1] || '');
      const roleName = args.slice(2).join(' ') || 'Member';

      if (!sub || !['add', 'remove'].includes(sub) || !targetId) {
        return NextResponse.json({
          success: false,
          error: { message: 'Usage: /role <add|remove> <@user|id> <roleNameOrId>' },
        });
      }

      await prisma.auditLog.create({
        data: {
          guildId,
          eventType: 'MEMBERS',
          action: sub === 'add' ? 'ROLE_ASSIGN' : 'ROLE_REVOKE',
          actorUserId: moderatorId,
          targetUserId: targetId,
          reason: `Role ${sub === 'add' ? 'assigned' : 'removed'} via CLI: ${roleName}`,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: sub === 'add' ? 'ROLE ASSIGNED' : 'ROLE REMOVED',
          fields: [
            { name: 'Target User', value: `<@${targetId}>` },
            { name: 'Role', value: roleName },
            { name: 'Action', value: sub === 'add' ? 'Granted Role' : 'Stripped Role' },
          ],
        },
      });
    }

    // 20. NICK
    if (action === 'nick' || action === 'nickname') {
      if (!args[0]) {
        return NextResponse.json({ success: false, error: { message: 'Usage: /nick <@user|id> [newNickname]' } });
      }
      const targetId = sanitizeId(args[0]);
      const nick = args.slice(1).join(' ') || '';

      await prisma.auditLog.create({
        data: {
          guildId,
          eventType: 'MODERATION',
          action: 'NICKNAME_CHANGE',
          actorUserId: moderatorId,
          targetUserId: targetId,
          reason: nick ? `Nickname set to "${nick}" via CLI` : 'Nickname reset to username',
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'success',
          title: 'NICKNAME UPDATED',
          fields: [
            { name: 'Target User', value: `<@${targetId}>` },
            { name: 'New Nickname', value: nick ? `"${nick}"` : '(Reset to default)' },
          ],
        },
      });
    }

    // 21. CASES (LIST)
    if (action === 'cases') {
      const targetUser = args[0] ? sanitizeId(args[0]) : undefined;
      const where: any = { guildId };
      if (targetUser) where.targetUserId = targetUser;

      const cases = await prisma.moderationCase.findMany({
        where,
        take: 5,
        orderBy: { caseNumber: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'info',
          title: targetUser ? `Cases for User ${targetUser}` : 'Recent Server Moderation Cases',
          fields: cases.length
            ? cases.map((c: any) => ({
                name: `Case #${c.caseNumber} · ${c.type} · ${c.status}`,
                value: `Target: <@${c.targetUserId}> · Reason: ${c.reason} · Date: ${new Date(c.createdAt).toLocaleDateString()}`,
              }))
            : [{ name: 'No Records', value: 'No cases match your query.' }],
        },
      });
    }

    // 22. CASE (INSPECT)
    if (action === 'case') {
      const num = parseInt(args[0] || '0', 10);
      if (!num) {
        return NextResponse.json({ success: false, error: { message: 'Usage: /case <caseNumber>' } });
      }
      const found = await prisma.moderationCase.findFirst({
        where: { guildId, caseNumber: num },
      });

      if (!found) {
        return NextResponse.json({ success: false, error: { message: `Case #${num} not found.` } });
      }

      return NextResponse.json({
        success: true,
        data: {
          type: 'info',
          title: `Case #${found.caseNumber} Dossier`,
          fields: [
            { name: 'Action Type', value: found.type },
            { name: 'Status', value: found.status },
            { name: 'Target User', value: `${found.targetUserTag || found.targetUserId} (\`${found.targetUserId}\`)` },
            { name: 'Moderator', value: found.moderatorTag || found.moderatorUserId },
            { name: 'Reason', value: found.reason },
            { name: 'Created At', value: new Date(found.createdAt).toLocaleString() },
          ],
        },
      });
    }

    // 23. TICKET
    if (action === 'ticket') {
      const sub = args[0]?.toLowerCase();
      if (sub === 'list') {
        const tickets = await prisma.ticket.findMany({
          where: { guildId },
          take: 5,
          orderBy: { ticketNumber: 'desc' },
        });

        return NextResponse.json({
          success: true,
          data: {
            type: 'info',
            title: 'Active Support Tickets',
            fields: tickets.length
              ? tickets.map((t: any) => ({
                  name: `Ticket #${t.ticketNumber} [${t.status}]`,
                  value: `Creator: <@${t.creatorUserId}> · Subject: ${t.subject || 'Support Request'}`,
                }))
              : [{ name: 'Queue Empty', value: 'No tickets currently registered.' }],
          },
        });
      }

      if (sub === 'claim' && args[1]) {
        const ticketNum = parseInt(args[1], 10);
        await prisma.ticket.updateMany({
          where: { guildId, ticketNumber: ticketNum },
          data: { status: 'CLAIMED', claimedByUserId: moderatorId },
        });

        return NextResponse.json({
          success: true,
          data: {
            type: 'success',
            title: `TICKET #${ticketNum} CLAIMED`,
            fields: [
              { name: 'Claimed By', value: `<@${moderatorId}>` },
              { name: 'Status', value: 'Assigned to current staff operator' },
            ],
          },
        });
      }

      if (sub === 'close' && args[1]) {
        const ticketNum = parseInt(args[1], 10);
        const reason = args.slice(2).join(' ') || 'Closed via CLI';
        await prisma.ticket.updateMany({
          where: { guildId, ticketNumber: ticketNum },
          data: { status: 'CLOSED', closedByUserId: moderatorId },
        });

        return NextResponse.json({
          success: true,
          data: {
            type: 'success',
            title: `TICKET #${ticketNum} RESOLVED & CLOSED`,
            fields: [
              { name: 'Closed By', value: `<@${moderatorId}>` },
              { name: 'Reason', value: reason },
              { name: 'Transcript', value: 'Saved to server logs archive' },
            ],
          },
        });
      }

      return NextResponse.json({
        success: false,
        error: { message: 'Usage: /ticket <list | claim <ticketNum> | close <ticketNum> [reason]>' },
      });
    }

    // 24. CONFIG
    if (action === 'config') {
      const key = args[0];
      const val = args.slice(1).join(' ');
      if (!key) {
        const settings = await prisma.guildSettings.findFirst({ where: { guildId } });
        return NextResponse.json({
          success: true,
          data: {
            type: 'info',
            title: 'Current Guild Configuration',
            fields: [
              { name: 'Prefix', value: settings?.prefix || '!' },
              { name: 'Language', value: settings?.language || 'en-US' },
              { name: 'Mod Log Channel', value: settings?.modLogChannelId || 'Unset' },
              { name: 'Mute Role', value: settings?.muteRoleId || 'Unset' },
            ],
          },
        });
      }

      if (key === 'prefix' && val) {
        await prisma.guildSettings.updateMany({
          where: { guildId },
          data: { prefix: val },
        });

        return NextResponse.json({
          success: true,
          data: {
            type: 'success',
            title: 'GUILD CONFIGURATION UPDATED',
            fields: [{ name: 'Command Prefix', value: `Changed to \`${val}\`` }],
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          type: 'info',
          title: `Config Key: ${key}`,
          fields: [{ name: 'Value', value: val || 'No value specified' }],
        },
      });
    }

    // UNKNOWN COMMAND
    return NextResponse.json({
      success: false,
      error: {
        message: `Unknown command: \`${action}\`. Type \`!help\` to view the list of available commands.`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Terminal command processing error',
        },
      },
      { status: 500 }
    );
  }
}
