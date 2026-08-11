import { EmbedBuilder, TextChannel } from 'discord.js';
import { prisma, AuditAction } from '@repo/database';
import { botClient } from '../client';

export class LogService {
  /**
   * Log an event to PostgreSQL audit trail and configured Discord log channel
   */
  static async logEvent(
    guildId: string,
    userId: string,
    userTag: string,
    action: AuditAction,
    details: Record<string, any>,
    ipAddress?: string
  ) {
    try {
      // 1. Write to AuditLog DB
      await prisma.auditLog.create({
        data: {
          guildId,
          userId,
          userTag,
          action,
          details,
          ipAddress,
        },
      });

      // 2. Fetch Channel Configuration & Guild Settings
      const channelConfig = await prisma.channelConfiguration.findUnique({
        where: { guildId },
      });

      const settings = await prisma.guildSettings.findUnique({
        where: { guildId },
      });

      if (!settings?.loggingEnabled || !channelConfig) {
        return;
      }

      // 3. Resolve target channel based on event category
      const targetChannelId = this.resolveTargetChannelId(action, channelConfig);
      if (!targetChannelId) return;

      // 4. Post to Discord Log Channel
      const logChannel = (await botClient.channels.fetch(targetChannelId).catch(() => null)) as TextChannel | null;
      if (!logChannel || !logChannel.isTextBased()) return;

      const actionTitle = this.formatActionTitle(action);
      const actionIcon = this.getActionIcon(action);
      const timestampSec = Math.floor(Date.now() / 1000);

      const embed = new EmbedBuilder()
        .setTitle(`${actionIcon} ${actionTitle}`)
        .setColor(this.getActionColor(action))
        .addFields(
          {
            name: '👤 User / Actor',
            value: userId !== 'SYSTEM' ? `<@${userId}>\n\`${userTag}\` (ID: \`${userId}\`)` : `\`${userTag}\``,
            inline: true,
          },
          {
            name: '⚡ Event Action',
            value: `\`${action}\``,
            inline: true,
          },
          {
            name: '⏰ Timestamp',
            value: `<t:${timestampSec}:F> (<t:${timestampSec}:R>)`,
            inline: false,
          }
        )
        .setFooter({ text: 'SMCore System Audit & Event Security Trail' })
        .setTimestamp();

      if (Object.keys(details).length > 0) {
        const detailsString = Object.entries(details)
          .map(([key, val]) => `• **${key}**: ${typeof val === 'object' ? `\`${JSON.stringify(val)}\`` : val}`)
          .join('\n');
        embed.addFields({ name: '📝 Event Summary & Details', value: detailsString.slice(0, 1024) || 'None' });
      }

      await logChannel.send({ embeds: [embed] }).catch(() => null);
    } catch (error) {
      console.error('Failed to execute logEvent:', error);
    }
  }

  /**
   * Resolves the target Discord channel ID based on action category fallback hierarchy
   */
  private static resolveTargetChannelId(action: AuditAction, config: any): string | null {
    switch (action) {
      case AuditAction.VOICE_JOINED:
      case AuditAction.VOICE_LEFT:
      case AuditAction.VOICE_MOVED:
        return config.voiceLogsChannelId || config.logsChannelId || null;

      case AuditAction.MESSAGE_DELETED:
      case AuditAction.MESSAGE_EDITED:
        return config.messageLogsChannelId || config.logsChannelId || null;

      case AuditAction.AUTOMOD_ALERT:
        return config.alertLogsChannelId || config.modLogChannelId || config.logsChannelId || null;

      case AuditAction.MEMBER_KICKED:
      case AuditAction.MEMBER_BANNED:
      case AuditAction.MEMBER_UNBANNED:
      case AuditAction.MEMBER_TIMED_OUT:
        return config.modLogChannelId || config.logsChannelId || null;

      case AuditAction.COMMAND_EXECUTED:
        return config.commandLogsChannelId || config.logsChannelId || null;

      case AuditAction.ROLE_CREATED:
      case AuditAction.ROLE_DELETED:
      case AuditAction.ROLE_ADDED:
      case AuditAction.ROLE_REMOVED:
      case AuditAction.ROLE_UPDATED:
      case AuditAction.CHANNEL_CREATED:
      case AuditAction.CHANNEL_DELETED:
      case AuditAction.CHANNEL_UPDATED:
        return config.generalLogsChannelId || config.logsChannelId || null;

      default:
        return config.logsChannelId || null;
    }
  }

  private static getActionIcon(action: AuditAction): string {
    switch (action) {
      case AuditAction.VOICE_JOINED: return '🔊';
      case AuditAction.VOICE_LEFT: return '🔇';
      case AuditAction.VOICE_MOVED: return '🔄';
      case AuditAction.MESSAGE_DELETED: return '🗑️';
      case AuditAction.MESSAGE_EDITED: return '✏️';
      case AuditAction.AUTOMOD_ALERT: return '🚨';
      case AuditAction.MEMBER_KICKED: return '👢';
      case AuditAction.MEMBER_BANNED: return '🔨';
      case AuditAction.MEMBER_UNBANNED: return '🔓';
      case AuditAction.MEMBER_TIMED_OUT: return '⏳';
      case AuditAction.COMMAND_EXECUTED: return '⚡';
      case AuditAction.ROLE_CREATED:
      case AuditAction.ROLE_DELETED:
      case AuditAction.ROLE_ADDED:
      case AuditAction.ROLE_REMOVED:
      case AuditAction.ROLE_UPDATED: return '🏷️';
      case AuditAction.CHANNEL_CREATED:
      case AuditAction.CHANNEL_DELETED:
      case AuditAction.CHANNEL_UPDATED: return '📁';
      case AuditAction.APPLICATION_APPROVED: return '🟢';
      case AuditAction.APPLICATION_REJECTED: return '🔴';
      case AuditAction.APPLICATION_SUBMITTED: return '📋';
      case AuditAction.SETTINGS_UPDATED: return '⚙️';
      default: return '🛡️';
    }
  }

  private static formatActionTitle(action: AuditAction): string {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private static getActionColor(action: AuditAction): number {
    switch (action) {
      case AuditAction.VOICE_JOINED: return 0x57f287; // Green
      case AuditAction.VOICE_LEFT: return 0xed4245; // Red
      case AuditAction.VOICE_MOVED: return 0xfee75c; // Yellow
      case AuditAction.MESSAGE_DELETED: return 0xed4245; // Red
      case AuditAction.MESSAGE_EDITED: return 0x3498db; // Blue
      case AuditAction.AUTOMOD_ALERT: return 0xe74c3c; // Bright Red
      case AuditAction.MEMBER_BANNED:
      case AuditAction.MEMBER_KICKED: return 0x992d22; // Dark Red
      case AuditAction.MEMBER_TIMED_OUT: return 0xe67e22; // Orange
      case AuditAction.COMMAND_EXECUTED: return 0x9b59b6; // Purple
      case AuditAction.APPLICATION_APPROVED: return 0x57f287;
      case AuditAction.APPLICATION_REJECTED: return 0xed4245;
      case AuditAction.APPLICATION_SUBMITTED: return 0x5865f2;
      default: return 0x95a5a6;
    }
  }
}
