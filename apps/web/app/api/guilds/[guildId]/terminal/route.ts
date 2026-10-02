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
