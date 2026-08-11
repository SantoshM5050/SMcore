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
        .setTimestamp();

      if (details.userAvatar) {
        embed.setAuthor({ name: userTag, iconURL: details.userAvatar });
      } else if (userTag !== 'SYSTEM') {
        embed.setAuthor({ name: userTag });
      }

      // Add User & Timestamp as primary fields
      if (userId !== 'SYSTEM') {
        embed.addFields({
          name: '👤 User',
          value: `<@${userId}>\n\`${userTag}\``,
          inline: true,
        });
      }

      // Add Channel if present
      if (details.channelId) {
        embed.addFields({
          name: '💬 Channel',
          value: `<#${details.channelId}>`,
          inline: true,
        });
      } else if (details.fromChannelId && details.toChannelId) {
        embed.addFields({
          name: '🔄 Voice Transfer',
          value: `<#${details.fromChannelId}> ➡️ <#${details.toChannelId}>`,
          inline: false,
        });
      }

      embed.addFields({
        name: '⏰ Time',
        value: `<t:${timestampSec}:R>`,
        inline: true,
      });

      // Filter out internal/technical keys from details body
      const hiddenKeys = ['channelId', 'fromChannelId', 'toChannelId', 'userAvatar', 'messageId'];
      const visibleDetails = Object.entries(details).filter(
        ([key, val]) => !hiddenKeys.includes(key) && val !== undefined && val !== null
      );

      if (visibleDetails.length > 0) {
        visibleDetails.forEach(([key, val]) => {
          const fieldName = this.formatKeyName(key);

          if (key === 'before' || key === 'after' || key === 'content') {
            const strVal = String(val);
            embed.addFields({
              name: fieldName,
              value: strVal.length > 900 ? `\`\`\`${strVal.slice(0, 900)}...\`\`\`` : `\`\`\`${strVal}\`\`\``,
              inline: false,
            });
          } else if (key === 'messageLink') {
            embed.addFields({
              name: fieldName,
              value: `[Jump to Message](${val})`,
              inline: false,
            });
          } else {
            embed.addFields({
              name: fieldName,
              value: String(val),
              inline: true,
            });
          }
        });
      }

      embed.setFooter({ text: 'SMCore Audit Trail' });

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

  private static formatKeyName(key: string): string {
    const map: Record<string, string> = {
      channel: 'Channel',
      from: 'From Channel',
      to: 'To Channel',
      before: '📝 Before (Old Content)',
      after: '✏️ After (New Content)',
      content: '💬 Message Content',
      rule: '🚨 Rule Triggered',
      matchedKeyword: '🔤 Blocked Word / Link',
      actionTaken: '🛡️ Action Applied',
      messageLink: '🔗 Message Link',
      reason: '📄 Reason',
      attachments: '📎 Attachments',
    };

    if (map[key]) return map[key];

    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
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
    switch (action) {
      case AuditAction.VOICE_JOINED: return 'Voice Joined';
      case AuditAction.VOICE_LEFT: return 'Voice Disconnected';
      case AuditAction.VOICE_MOVED: return 'Voice Channel Switched';
      case AuditAction.MESSAGE_DELETED: return 'Message Deleted';
      case AuditAction.MESSAGE_EDITED: return 'Message Edited';
      case AuditAction.AUTOMOD_ALERT: return 'AutoMod Violation Alert';
      case AuditAction.MEMBER_BANNED: return 'Member Banned';
      case AuditAction.MEMBER_UNBANNED: return 'Member Unbanned';
      case AuditAction.MEMBER_KICKED: return 'Member Kicked';
      case AuditAction.MEMBER_TIMED_OUT: return 'Member Timed Out';
      default:
        return action
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  private static getActionColor(action: AuditAction): number {
    switch (action) {
      case AuditAction.VOICE_JOINED: return 0x57f287; // Emerald Green
      case AuditAction.VOICE_LEFT: return 0xed4245; // Crimson Red
      case AuditAction.VOICE_MOVED: return 0xfee75c; // Vivid Yellow
      case AuditAction.MESSAGE_DELETED: return 0xed4245; // Red
      case AuditAction.MESSAGE_EDITED: return 0x3498db; // Sapphire Blue
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
