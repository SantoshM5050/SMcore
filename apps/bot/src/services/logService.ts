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

      if (!settings?.loggingEnabled || !channelConfig?.logsChannelId) {
        return;
      }

      // 3. Post to Discord Log Channel
      const logChannel = (await botClient.channels.fetch(channelConfig.logsChannelId).catch(() => null)) as TextChannel | null;
      if (!logChannel) return;

      const actionTitle = this.formatActionTitle(action);
      const actionIcon = this.getActionIcon(action);
      const timestampSec = Math.floor(Date.now() / 1000);

      const embed = new EmbedBuilder()
        .setTitle(`${actionIcon} System Log • ${actionTitle}`)
        .setColor(this.getActionColor(action))
        .addFields(
          {
            name: '👤 User / Actor',
            value: `<@${userId}>\n\`${userTag}\` (ID: \`${userId}\`)`,
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
        .setFooter({ text: 'SMCore System Audit Security Trail' })
        .setTimestamp();

      if (Object.keys(details).length > 0) {
        const detailsString = Object.entries(details)
          .map(([key, val]) => `• **${key}**: ${typeof val === 'object' ? `\`${JSON.stringify(val)}\`` : val}`)
          .join('\n');
        embed.addFields({ name: '📝 Action Summary & Details', value: detailsString.slice(0, 1024) || 'None' });
      }

      await logChannel.send({ embeds: [embed] }).catch(() => null);
    } catch (error) {
      console.error('Failed to execute logEvent:', error);
    }
  }

  private static getActionIcon(action: AuditAction): string {
    switch (action) {
      case AuditAction.APPLICATION_APPROVED: return '🟢';
      case AuditAction.APPLICATION_REJECTED: return '🔴';
      case AuditAction.APPLICATION_SUBMITTED: return '📋';
      case AuditAction.SETTINGS_UPDATED: return '⚙️';
      case AuditAction.ROLE_ADDED:
      case AuditAction.ROLE_REMOVED:
      case AuditAction.ROLE_UPDATED: return '🏷️';
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
      case AuditAction.APPLICATION_APPROVED:
        return 0x57f287; // Green
      case AuditAction.APPLICATION_REJECTED:
        return 0xed4245; // Red
      case AuditAction.APPLICATION_SUBMITTED:
        return 0x5865f2; // Blurple
      case AuditAction.PANEL_DEPLOYED:
      case AuditAction.PANEL_UPDATED:
        return 0xfee75c; // Yellow
      case AuditAction.ROLE_ADDED:
      case AuditAction.ROLE_REMOVED:
      case AuditAction.ROLE_UPDATED:
        return 0xeb459e; // Fuchsia
      case AuditAction.PERMISSION_CHANGED:
        return 0x9b59b6; // Purple
      default:
        return 0x95a5a6; // Grey
    }
  }
}
