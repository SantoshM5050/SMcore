import {
  Guild,
  GuildMember,
  TextChannel,
  EmbedBuilder,
} from 'discord.js';
import {
  prisma,
  LogCategory,
  RaidAction,
  AuditAction,
} from '@repo/database';
import { ModerationService } from './moderationService';
import { LogService } from './logService';
import { logger } from '../logger';

export class AntiRaidService {
  // Join timestamps sliding window: key = guildId, value = array of timestamps
  private static joinTimestamps: Map<string, number[]> = new Map();

  /**
   * Tracks a new member join and triggers Anti-Raid defenses if threshold is breached.
   */
  public static async handleMemberJoin(member: GuildMember): Promise<boolean> {
    const guild = member.guild;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings || !settings.antiRaidEnabled) {
      return false;
    }

    const config = await prisma.antiRaidConfig.findUnique({
      where: { guildId: guild.id },
    });

    if (!config || !config.enabled) {
      return false;
    }

    const now = Date.now();
    const timestamps = this.joinTimestamps.get(guild.id) || [];
    const windowMs = config.windowSeconds * 1000;

    // Filter to current window
    const recent = timestamps.filter((t) => now - t < windowMs);
    recent.push(now);
    this.joinTimestamps.set(guild.id, recent);

    // If threshold breached and Raid Mode is not already active
    if (recent.length >= config.joinThreshold && !settings.raidModeActive) {
      logger.warn(
        { guildId: guild.id, joins: recent.length, window: config.windowSeconds },
        '🚨 Anti-Raid join threshold breached! Activating Raid Mode.'
      );

      await this.setRaidMode(guild, true, null, `Automated join spike detected (${recent.length} joins in ${config.windowSeconds}s)`);

      // Execute designated action
      if (config.action === RaidAction.LOCK_CHANNELS && config.lockChannelIds.length > 0) {
        for (const chId of config.lockChannelIds) {
          const ch = (await guild.channels.fetch(chId).catch(() => null)) as TextChannel | null;
          if (ch && ch.isTextBased()) {
            await ModerationService.setChannelLock(ch, null, true, 'Anti-Raid Automated Channel Lockdown');
          }
        }
      }

      // Send staff alert if channel configured
      if (config.alertChannelId) {
        const alertCh = (await guild.channels.fetch(config.alertChannelId).catch(() => null)) as TextChannel | null;
        if (alertCh && alertCh.isTextBased()) {
          const alertEmbed = new EmbedBuilder()
            .setTitle('🚨 RAID MODE ACTIVATED')
            .setColor(0xef4444)
            .setDescription(
              `An abnormal join spike of **${recent.length} members** was detected within **${config.windowSeconds} seconds**.\n\n` +
              `• **Action Enforced:** \`${config.action}\`\n` +
              `• **Server:** ${guild.name}\n` +
              `• **Timestamp:** <t:${Math.floor(now / 1000)}:F>\n\n` +
              `Use \`/raidmode off\` or the web dashboard to restore normal server operation.`
            )
            .setTimestamp();

          await alertCh.send({ content: '@here', embeds: [alertEmbed] }).catch(() => null);
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Manually or automatically enables or disables Raid Mode.
   */
  public static async setRaidMode(
    guild: Guild,
    active: boolean,
    executor: GuildMember | null,
    reason: string = 'Raid Mode state change'
  ): Promise<boolean> {
    await prisma.guildSettings.upsert({
      where: { guildId: guild.id },
      create: {
        guildId: guild.id,
        raidModeActive: active,
      },
      update: {
        raidModeActive: active,
      },
    });

    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    await prisma.auditLog.create({
      data: {
        guildId: guild.id,
        userId: modId,
        userTag: modTag,
        action: AuditAction.RAID_MODE_TOGGLED,
        details: { active, reason },
      },
    });

    await LogService.log({
      guild,
      category: LogCategory.MODERATION,
      eventType: active ? 'RAID_MODE_ACTIVATED' : 'RAID_MODE_DEACTIVATED',
      title: active ? '🚨 Raid Mode Activated' : '🛡️ Raid Mode Deactivated',
      description: `Raid Mode has been **${active ? 'ENABLED' : 'DISABLED'}**.\n**Reason:** ${reason}`,
      colorHex: active ? '#EF4444' : '#10B981',
      executorId: modId,
      executorTag: modTag,
      fields: [
        { name: 'Status', value: active ? '🔴 ACTIVE' : '🟢 NORMAL', inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });

    return true;
  }
}
