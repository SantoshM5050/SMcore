import { EmbedBuilder, Guild, TextChannel } from 'discord.js';
import { prisma, PromotionActionType, AuditAction } from '@repo/database';
import { LogService } from './logService';

export interface ExecutePromotionParams {
  guildId: string;
  targetUserId: string;
  inGameName: string;
  inGameId: string;
  actionType: PromotionActionType;
  previousRoleId?: string | null;
  newRoleId?: string | null;
  reason?: string | null;
  executedById: string;
  executedByTag: string;
}

export class PromotionService {
  /**
   * Execute a promotion, demotion, or family left action:
   * 1. Updates target member roles on Discord.
   * 2. Saves log to Database (PromotionLog).
   * 3. Sends formatted embed log to promotionLogsChannelId.
   * 4. Sends DM notification to member.
   */
  static async executeAction(guild: Guild, params: ExecutePromotionParams) {
    const {
      guildId,
      targetUserId,
      inGameName,
      inGameId,
      actionType,
      previousRoleId,
      newRoleId,
      reason,
      executedById,
      executedByTag,
    } = params;

    // Clean user ID input
    const cleanUserId = targetUserId.replace(/[<@!>]/g, '').trim();

    // Fetch Discord member if in server
    const member = await guild.members.fetch(cleanUserId).catch(() => null);

    let previousRoleName: string | null = null;
    let newRoleName: string | null = null;

    // Resolve Role names & update roles if member found
    if (previousRoleId && previousRoleId !== 'NONE') {
      const prevRole = guild.roles.cache.get(previousRoleId) || (await guild.roles.fetch(previousRoleId).catch(() => null));
      if (prevRole) previousRoleName = prevRole.name;
    }

    if (newRoleId && newRoleId !== 'NONE') {
      const nextRole = guild.roles.cache.get(newRoleId) || (await guild.roles.fetch(newRoleId).catch(() => null));
      if (nextRole) newRoleName = nextRole.name;
    }

    let roleSwapSuccess = false;
    let roleSwapMessage = '';

    if (member) {
      try {
        if (actionType === PromotionActionType.LEFT_FAMILY) {
          // Remove previous rank role if provided
          if (previousRoleId && previousRoleId !== 'NONE' && member.roles.cache.has(previousRoleId)) {
            await member.roles.remove(previousRoleId).catch(() => null);
          }
          // Remove all configured requestable roles if present
          const configRoles = await prisma.roleConfiguration.findMany({ where: { guildId } });
          for (const cr of configRoles) {
            if (member.roles.cache.has(cr.roleId)) {
              await member.roles.remove(cr.roleId).catch(() => null);
            }
          }
          roleSwapSuccess = true;
          roleSwapMessage = 'Family roles removed successfully.';
        } else {
          // Promotion or Demotion
          // Remove old role
          if (previousRoleId && previousRoleId !== 'NONE' && member.roles.cache.has(previousRoleId)) {
            await member.roles.remove(previousRoleId).catch(() => null);
          }
          // Add new role
          if (newRoleId && newRoleId !== 'NONE') {
            await member.roles.add(newRoleId);
          }
          roleSwapSuccess = true;
          roleSwapMessage = `Roles updated to @${newRoleName || 'New Rank'}.`;
        }
      } catch (roleErr: any) {
        console.warn('[PromotionService Role Swap Warning]:', roleErr.message);
        roleSwapMessage = `Role swap partially failed: ${roleErr.message}. (Ensure bot role is higher than target roles)`;
      }
    } else {
      roleSwapMessage = 'Member not currently present in Discord server (Log saved).';
    }

    const targetUserTag = member ? member.user.tag : cleanUserId;

    // 1. Create PromotionLog record in DB
    const logRecord = await prisma.promotionLog.create({
      data: {
        guildId,
        targetUserId: cleanUserId,
        targetUserTag,
        inGameName,
        inGameId,
        actionType,
        previousRoleId: previousRoleId || null,
        previousRoleName,
        newRoleId: newRoleId || null,
        newRoleName,
        reason: reason || null,
        executedById,
        executedByTag,
      },
    });

    // 2. Audit Log Event
    const auditActionMap: Record<string, AuditAction> = {
      PROMOTION: AuditAction.PROMOTION_LOGGED,
      DEMOTION: AuditAction.DEMOTION_LOGGED,
      LEFT_FAMILY: AuditAction.MEMBER_LEFT_FAMILY,
    };

    await LogService.logEvent(guildId, executedById, executedByTag, auditActionMap[actionType] || AuditAction.PROMOTION_LOGGED, {
      inGameName,
      inGameId,
      targetUserId: cleanUserId,
      actionType,
      previousRank: previousRoleName || 'None',
      newRank: newRoleName || (actionType === 'LEFT_FAMILY' ? 'Left Family' : 'None'),
      reason: reason || 'None specified',
    });

    // 3. Send Discord Embed to Promotion Log Channel
    await this.sendPromotionEmbedLog(guild, logRecord, member);

    // 4. Try DMing member
    if (member) {
      this.sendMemberNotificationDM(member, logRecord).catch(() => null);
    }

    return {
      logRecord,
      roleSwapSuccess,
      roleSwapMessage,
    };
  }

  private static async sendPromotionEmbedLog(guild: Guild, record: any, member: any) {
    try {
      const channelConfig = await prisma.channelConfiguration.findUnique({
        where: { guildId: guild.id },
      });
      const targetChanId = channelConfig?.promotionLogsChannelId || channelConfig?.logsChannelId;
      if (!targetChanId) return;

      const channel = (await guild.channels.fetch(targetChanId).catch(() => null)) as TextChannel | null;
      if (!channel || !channel.isTextBased()) return;

      const titleMap: Record<string, string> = {
        PROMOTION: '📈 GRAND RP FAMILY - PROMOTION LOG',
        DEMOTION: '📉 GRAND RP FAMILY - DEMOTION LOG',
        LEFT_FAMILY: '🚪 GRAND RP FAMILY - MEMBER LEFT',
      };

      const colorMap: Record<string, number> = {
        PROMOTION: 0x2ecc71, // Emerald Green
        DEMOTION: 0xe74c3c, // Crimson Red
        LEFT_FAMILY: 0x95a5a6, // Gray
      };

      const embed = new EmbedBuilder()
        .setTitle(titleMap[record.actionType] || '🏆 RANK UPDATE LOG')
        .setColor(colorMap[record.actionType] || 0x3498db)
        .setTimestamp()
        .setFooter({ text: 'Grand RP Family Management System' });

      if (member) {
        embed.setThumbnail(member.user.displayAvatarURL());
      }

      embed.addFields(
        { name: 'Name', value: `\`${record.inGameName}\``, inline: true },
        { name: 'ID', value: `\`${record.inGameId}\` (<@${record.targetUserId}>)`, inline: true },
        { name: 'Action', value: `\`${record.actionType}\``, inline: true },
        {
          name: 'Previous Rank',
          value: record.previousRoleId ? `<@&${record.previousRoleId}>` : (record.previousRoleName || 'None'),
          inline: true,
        },
        {
          name: 'New Rank',
          value: record.actionType === 'LEFT_FAMILY'
            ? '❌ **LEFT FAMILY**'
            : record.newRoleId
            ? `<@&${record.newRoleId}>`
            : (record.newRoleName || 'None'),
          inline: true,
        },
        { name: 'By', value: `@${record.executedByTag} (<@${record.executedById}>)`, inline: true },
        { name: 'Reason', value: record.reason || 'No reason specified', inline: false }
      );

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.warn('[sendPromotionEmbedLog Error]:', err);
    }
  }

  private static async sendMemberNotificationDM(member: any, record: any) {
    try {
      if (record.actionType === 'LEFT_FAMILY') {
        const embed = new EmbedBuilder()
          .setTitle('🚪 Family Status Update')
          .setDescription(`Your record has been updated: Marked as **LEFT FAMILY** in Grand RP.`)
          .addFields(
            { name: 'Reason', value: record.reason || 'None specified' },
            { name: 'Updated By', value: record.executedByTag }
          )
          .setColor('#95a5a6')
          .setTimestamp();
        await member.send({ embeds: [embed] });
      } else {
        const isPromo = record.actionType === 'PROMOTION';
        const embed = new EmbedBuilder()
          .setTitle(isPromo ? '🎉 Congratulations! Rank Promoted' : '📉 Rank Status Changed')
          .setDescription(`Your Grand RP family rank has been updated!`)
          .addFields(
            { name: 'New Rank', value: record.newRoleId ? `<@&${record.newRoleId}>` : (record.newRoleName || 'Updated Rank'), inline: true },
            { name: 'Reason', value: record.reason || 'None specified', inline: true },
            { name: 'Updated By', value: record.executedByTag, inline: true }
          )
          .setColor(isPromo ? '#2ecc71' : '#e74c3c')
          .setTimestamp();
        await member.send({ embeds: [embed] });
      }
    } catch {
      // DMs blocked
    }
  }
}
