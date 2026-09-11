import {
  Guild,
  GuildMember,
  TextChannel,
  User,
  PermissionFlagsBits,
} from 'discord.js';
import {
  prisma,
  ModerationAction,
  LogCategory,
  EscalationAction,
} from '@repo/database';
import { HierarchyService } from './hierarchyService';
import { LogService } from './logService';
import { logger } from '../logger';

export interface ModerationResult {
  success: boolean;
  caseNumber?: number;
  message: string;
  targetTag?: string;
  targetId?: string;
}

export class ModerationService {
  /**
   * Helper to retrieve next sequential case number for a guild.
   */
  public static async getNextCaseNumber(guildId: string): Promise<number> {
    const lastCase = await prisma.moderationCase.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
      select: { caseNumber: true },
    });
    return (lastCase?.caseNumber || 0) + 1;
  }

  /**
   * Sends optional direct message notification to target member prior to punishment.
   */
  private static async sendPunishmentDm(
    targetUser: User,
    guildName: string,
    action: string,
    reason: string,
    durationText?: string,
    appealUrl?: string | null
  ): Promise<void> {
    try {
      let dmContent = `⚠️ **Notice from ${guildName}**\nYou have received a **${action}**.\n**Reason:** ${reason}`;
      if (durationText) {
        dmContent += `\n**Duration:** ${durationText}`;
      }
      if (appealUrl) {
        dmContent += `\n**Appeal URL:** ${appealUrl}`;
      }
      await targetUser.send({ content: dmContent }).catch(() => null);
    } catch {
      // DMs may be closed; ignore safely
    }
  }

  /**
   * Bans a member or user ID.
   */
  public static async ban(
    guild: Guild,
    executor: GuildMember | null,
    targetUser: User,
    reason: string = 'No reason provided',
    deleteMessageDays: number = 0,
    notifyUser: boolean = true
  ): Promise<ModerationResult> {
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    // Hierarchy validation
    const hierarchy = HierarchyService.canModerate(guild, executor, targetMember || targetUser);
    if (!hierarchy.allowed) {
      return { success: false, message: hierarchy.reason || 'Hierarchy check failed.' };
    }

    const settings = await prisma.guildSettings.findUnique({ where: { guildId: guild.id } });

    // Optional DM
    if (notifyUser && settings?.dmOnPunish !== false) {
      await this.sendPunishmentDm(targetUser, guild.name, 'BAN', reason, undefined, settings?.appealUrl);
    }

    // Execute Discord Ban
    await guild.members.ban(targetUser.id, {
      deleteMessageSeconds: Math.min(deleteMessageDays, 7) * 86400,
      reason: `${executor ? executor.user.tag : 'System'}: ${reason}`,
    });

    const caseNumber = await this.getNextCaseNumber(guild.id);
    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    // Persist Case
    await prisma.moderationCase.create({
      data: {
        guildId: guild.id,
        caseNumber,
        targetId: targetUser.id,
        targetTag: targetUser.tag,
        targetAvatar: targetUser.displayAvatarURL(),
        moderatorId: modId,
        moderatorTag: modTag,
        action: ModerationAction.BAN,
        reason,
        metadata: { deleteMessageDays },
      },
    });

    // Dispatch Log
    await LogService.log({
      guild,
      category: LogCategory.MODERATION,
      eventType: 'MEMBER_BAN',
      title: `🔨 Member Banned: ${targetUser.tag}`,
      caseNumber,
      targetId: targetUser.id,
      targetTag: targetUser.tag,
      executorId: modId,
      executorTag: modTag,
      colorHex: '#EF4444',
      fields: [
        { name: 'Target', value: `<@${targetUser.id}> (${targetUser.id})`, inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case ID', value: `#${caseNumber}`, inline: true },
      ],
    });

    return {
      success: true,
      caseNumber,
      targetTag: targetUser.tag,
      targetId: targetUser.id,
      message: `Successfully banned ${targetUser.tag} (Case #${caseNumber}).`,
    };
  }

  /**
   * Unbans a user ID.
   */
  public static async unban(
    guild: Guild,
    executor: GuildMember | null,
    targetUserId: string,
    reason: string = 'No reason provided'
  ): Promise<ModerationResult> {
    const banInfo = await guild.bans.fetch(targetUserId).catch(() => null);
    if (!banInfo) {
      return { success: false, message: 'This user is not banned in this server.' };
    }

    await guild.bans.remove(targetUserId, `${executor ? executor.user.tag : 'System'}: ${reason}`);

    const caseNumber = await this.getNextCaseNumber(guild.id);
    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    await prisma.moderationCase.create({
      data: {
        guildId: guild.id,
        caseNumber,
        targetId: targetUserId,
        targetTag: banInfo.user.tag,
        targetAvatar: banInfo.user.displayAvatarURL(),
        moderatorId: modId,
        moderatorTag: modTag,
        action: ModerationAction.UNBAN,
        reason,
      },
    });

    await LogService.log({
      guild,
      category: LogCategory.MODERATION,
      eventType: 'MEMBER_UNBAN',
      title: `🔓 Member Unbanned: ${banInfo.user.tag}`,
      caseNumber,
      targetId: targetUserId,
      targetTag: banInfo.user.tag,
      executorId: modId,
      executorTag: modTag,
      colorHex: '#10B981',
      fields: [
        { name: 'User', value: `<@${targetUserId}> (${targetUserId})`, inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });

    return {
      success: true,
      caseNumber,
      targetId: targetUserId,
      targetTag: banInfo.user.tag,
      message: `Successfully unbanned ${banInfo.user.tag} (Case #${caseNumber}).`,
    };
  }

  /**
   * Kicks a member.
   */
  public static async kick(
    guild: Guild,
    executor: GuildMember | null,
    targetMember: GuildMember,
    reason: string = 'No reason provided',
    notifyUser: boolean = true
  ): Promise<ModerationResult> {
    const hierarchy = HierarchyService.canModerate(guild, executor, targetMember);
    if (!hierarchy.allowed) {
      return { success: false, message: hierarchy.reason || 'Hierarchy check failed.' };
    }

    const settings = await prisma.guildSettings.findUnique({ where: { guildId: guild.id } });

    if (notifyUser && settings?.dmOnPunish !== false) {
      await this.sendPunishmentDm(targetMember.user, guild.name, 'KICK', reason);
    }

    await targetMember.kick(`${executor ? executor.user.tag : 'System'}: ${reason}`);

    const caseNumber = await this.getNextCaseNumber(guild.id);
    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    await prisma.moderationCase.create({
      data: {
        guildId: guild.id,
        caseNumber,
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        targetAvatar: targetMember.user.displayAvatarURL(),
        moderatorId: modId,
        moderatorTag: modTag,
        action: ModerationAction.KICK,
        reason,
      },
    });

    await LogService.log({
      guild,
      category: LogCategory.MODERATION,
      eventType: 'MEMBER_KICK',
      title: `👢 Member Kicked: ${targetMember.user.tag}`,
      caseNumber,
      targetId: targetMember.id,
      targetTag: targetMember.user.tag,
      executorId: modId,
      executorTag: modTag,
      colorHex: '#F59E0B',
      fields: [
        { name: 'Target', value: `<@${targetMember.id}>`, inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });

    return {
      success: true,
      caseNumber,
      targetId: targetMember.id,
      targetTag: targetMember.user.tag,
      message: `Successfully kicked ${targetMember.user.tag} (Case #${caseNumber}).`,
    };
  }

  /**
   * Applies timeout to a member.
   */
  public static async timeout(
    guild: Guild,
    executor: GuildMember | null,
    targetMember: GuildMember,
    durationMinutes: number,
    reason: string = 'No reason provided',
    notifyUser: boolean = true
  ): Promise<ModerationResult> {
    const hierarchy = HierarchyService.canModerate(guild, executor, targetMember);
    if (!hierarchy.allowed) {
      return { success: false, message: hierarchy.reason || 'Hierarchy check failed.' };
    }

    const durationMs = durationMinutes * 60 * 1000;
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: guild.id } });

    if (notifyUser && settings?.dmOnPunish !== false) {
      await this.sendPunishmentDm(targetMember.user, guild.name, 'TIMEOUT', reason, `${durationMinutes} minutes`);
    }

    await targetMember.timeout(durationMs, `${executor ? executor.user.tag : 'System'}: ${reason}`);

    const caseNumber = await this.getNextCaseNumber(guild.id);
    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    await prisma.moderationCase.create({
      data: {
        guildId: guild.id,
        caseNumber,
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        targetAvatar: targetMember.user.displayAvatarURL(),
        moderatorId: modId,
        moderatorTag: modTag,
        action: ModerationAction.TIMEOUT,
        durationMinutes,
        reason,
      },
    });

    await LogService.log({
      guild,
      category: LogCategory.MODERATION,
      eventType: 'MEMBER_TIMEOUT',
      title: `⏱️ Member Timed Out: ${targetMember.user.tag}`,
      caseNumber,
      targetId: targetMember.id,
      targetTag: targetMember.user.tag,
      executorId: modId,
      executorTag: modTag,
      colorHex: '#EAB308',
      fields: [
        { name: 'Target', value: `<@${targetMember.id}>`, inline: true },
        { name: 'Duration', value: `${durationMinutes} minutes`, inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });

    return {
      success: true,
      caseNumber,
      targetId: targetMember.id,
      targetTag: targetMember.user.tag,
      message: `Timed out ${targetMember.user.tag} for ${durationMinutes}m (Case #${caseNumber}).`,
    };
  }

  /**
   * Removes timeout from a member.
   */
  public static async removeTimeout(
    guild: Guild,
    executor: GuildMember | null,
    targetMember: GuildMember,
    reason: string = 'Timeout removed by staff'
  ): Promise<ModerationResult> {
    const hierarchy = HierarchyService.canModerate(guild, executor, targetMember);
    if (!hierarchy.allowed) {
      return { success: false, message: hierarchy.reason || 'Hierarchy check failed.' };
    }

    await targetMember.timeout(null, `${executor ? executor.user.tag : 'System'}: ${reason}`);

    const caseNumber = await this.getNextCaseNumber(guild.id);
    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    await prisma.moderationCase.create({
      data: {
        guildId: guild.id,
        caseNumber,
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        targetAvatar: targetMember.user.displayAvatarURL(),
        moderatorId: modId,
        moderatorTag: modTag,
        action: ModerationAction.TIMEOUT_REMOVE,
        reason,
      },
    });

    await LogService.log({
      guild,
      category: LogCategory.MODERATION,
      eventType: 'MEMBER_TIMEOUT_REMOVE',
      title: `⏱️ Timeout Removed: ${targetMember.user.tag}`,
      caseNumber,
      targetId: targetMember.id,
      targetTag: targetMember.user.tag,
      executorId: modId,
      executorTag: modTag,
      colorHex: '#10B981',
      fields: [
        { name: 'Target', value: `<@${targetMember.id}>`, inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });

    return {
      success: true,
      caseNumber,
      targetId: targetMember.id,
      targetTag: targetMember.user.tag,
      message: `Removed timeout for ${targetMember.user.tag} (Case #${caseNumber}).`,
    };
  }

  /**
   * Issues a warning with automatic escalation check.
   */
  public static async warn(
    guild: Guild,
    executor: GuildMember | null,
    targetMember: GuildMember,
    reason: string,
    notifyUser: boolean = true
  ): Promise<ModerationResult & { escalatedAction?: string }> {
    const hierarchy = HierarchyService.canModerate(guild, executor, targetMember);
    if (!hierarchy.allowed) {
      return { success: false, message: hierarchy.reason || 'Hierarchy check failed.' };
    }

    const caseNumber = await this.getNextCaseNumber(guild.id);
    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    // Count existing active warnings to get warning number
    const activeWarningsCount = await prisma.warning.count({
      where: { guildId: guild.id, userId: targetMember.id, isActive: true },
    });
    const warningNumber = activeWarningsCount + 1;

    // Persist Warning
    await prisma.warning.create({
      data: {
        guildId: guild.id,
        warningNumber,
        userId: targetMember.id,
        userTag: targetMember.user.tag,
        moderatorId: modId,
        moderatorTag: modTag,
        reason,
        caseId: String(caseNumber),
      },
    });

    // Persist Case
    await prisma.moderationCase.create({
      data: {
        guildId: guild.id,
        caseNumber,
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        targetAvatar: targetMember.user.displayAvatarURL(),
        moderatorId: modId,
        moderatorTag: modTag,
        action: ModerationAction.WARN,
        reason,
        metadata: { warningNumber },
      },
    });

    // Send DM if enabled
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: guild.id } });
    if (notifyUser && settings?.dmOnPunish !== false) {
      await this.sendPunishmentDm(
        targetMember.user,
        guild.name,
        `WARNING #${warningNumber}`,
        reason,
        undefined,
        settings?.appealUrl
      );
    }

    // Dispatch Log
    await LogService.log({
      guild,
      category: LogCategory.MODERATION,
      eventType: 'MEMBER_WARN',
      title: `⚠️ Member Warned: ${targetMember.user.tag}`,
      caseNumber,
      targetId: targetMember.id,
      targetTag: targetMember.user.tag,
      executorId: modId,
      executorTag: modTag,
      colorHex: '#FBBF24',
      fields: [
        { name: 'Target', value: `<@${targetMember.id}>`, inline: true },
        { name: 'Active Warnings', value: `${warningNumber}`, inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });

    // Check Configured Warning Escalation Rule!
    let escalatedAction: string | undefined;
    const escalationRule = await prisma.warningEscalationRule.findUnique({
      where: {
        guildId_warnCount: {
          guildId: guild.id,
          warnCount: warningNumber,
        },
      },
    });

    if (escalationRule) {
      escalatedAction = escalationRule.action;
      logger.info(
        { guildId: guild.id, user: targetMember.id, action: escalationRule.action },
        'Executing automatic warning escalation'
      );

      if (escalationRule.action === EscalationAction.TIMEOUT) {
        await this.timeout(
          guild,
          null,
          targetMember,
          escalationRule.durationMinutes || 60,
          `Automatic Escalation (Threshold: ${warningNumber} warnings)`
        );
      } else if (escalationRule.action === EscalationAction.KICK) {
        await this.kick(
          guild,
          null,
          targetMember,
          `Automatic Escalation (Threshold: ${warningNumber} warnings)`
        );
      } else if (escalationRule.action === EscalationAction.BAN) {
        await this.ban(
          guild,
          null,
          targetMember.user,
          `Automatic Escalation (Threshold: ${warningNumber} warnings)`
        );
      }
    }

    return {
      success: true,
      caseNumber,
      targetId: targetMember.id,
      targetTag: targetMember.user.tag,
      escalatedAction,
      message: `Warned ${targetMember.user.tag} (Warning #${warningNumber}, Case #${caseNumber})${
        escalatedAction ? ` — Escalated to ${escalatedAction}!` : ''
      }`,
    };
  }

  /**
   * Cleans up / purges messages in a channel.
   */
  public static async purge(
    channel: TextChannel,
    executor: GuildMember | null,
    amount: number,
    targetUserId?: string,
    contains?: string,
    botOnly?: boolean,
    reason: string = 'Bulk purge'
  ): Promise<ModerationResult & { deletedCount: number }> {
    const guild = channel.guild;
    const fetchLimit = Math.min(Math.max(amount, 1), 100);

    const fetched = await channel.messages.fetch({ limit: fetchLimit });
    let toDelete = Array.from(fetched.values());

    // Filter by target user
    if (targetUserId) {
      toDelete = toDelete.filter((m) => m.author.id === targetUserId);
    }
    // Filter by text
    if (contains) {
      const lower = contains.toLowerCase();
      toDelete = toDelete.filter((m) => m.content.toLowerCase().includes(lower));
    }
    // Filter by bot
    if (botOnly) {
      toDelete = toDelete.filter((m) => m.author.bot);
    }

    // Filter out messages older than 14 days (Discord limitation)
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    toDelete = toDelete.filter((m) => m.createdTimestamp > fourteenDaysAgo);

    if (toDelete.length === 0) {
      return { success: true, deletedCount: 0, message: 'No eligible messages found to purge.' };
    }

    const deleted = await channel.bulkDelete(toDelete, true);
    const caseNumber = await this.getNextCaseNumber(guild.id);
    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    await prisma.moderationCase.create({
      data: {
        guildId: guild.id,
        caseNumber,
        targetId: targetUserId || channel.id,
        targetTag: targetUserId ? `User ${targetUserId}` : `#${channel.name}`,
        moderatorId: modId,
        moderatorTag: modTag,
        action: ModerationAction.PURGE,
        reason,
        metadata: {
          channelId: channel.id,
          channelName: channel.name,
          deletedCount: deleted.size,
          filterUser: targetUserId || null,
          contains: contains || null,
          botOnly: botOnly || false,
        },
      },
    });

    await LogService.log({
      guild,
      category: LogCategory.MODERATION,
      eventType: 'CHANNEL_PURGE',
      title: `🧹 Bulk Message Purge: #${channel.name}`,
      caseNumber,
      channelId: channel.id,
      executorId: modId,
      executorTag: modTag,
      colorHex: '#3B82F6',
      fields: [
        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'Messages Purged', value: `${deleted.size}`, inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });

    return {
      success: true,
      caseNumber,
      deletedCount: deleted.size,
      message: `Successfully purged ${deleted.size} messages from <#${channel.id}> (Case #${caseNumber}).`,
    };
  }

  /**
   * Locks or unlocks a channel.
   */
  public static async setChannelLock(
    channel: TextChannel,
    executor: GuildMember | null,
    locked: boolean,
    reason: string = 'Channel lock state update'
  ): Promise<ModerationResult> {
    const guild = channel.guild;
    const everyoneRole = guild.roles.everyone;

    // Overwrite @everyone SendMessages permission
    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: locked ? false : null,
    });

    const caseNumber = await this.getNextCaseNumber(guild.id);
    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    await prisma.moderationCase.create({
      data: {
        guildId: guild.id,
        caseNumber,
        targetId: channel.id,
        targetTag: `#${channel.name}`,
        moderatorId: modId,
        moderatorTag: modTag,
        action: locked ? ModerationAction.LOCK : ModerationAction.UNLOCK,
        reason,
        metadata: { channelId: channel.id, locked },
      },
    });

    await LogService.log({
      guild,
      category: LogCategory.CHANNEL,
      eventType: locked ? 'CHANNEL_LOCK' : 'CHANNEL_UNLOCK',
      title: `${locked ? '🔒 Channel Locked' : '🔓 Channel Unlocked'}: #${channel.name}`,
      caseNumber,
      channelId: channel.id,
      executorId: modId,
      executorTag: modTag,
      colorHex: locked ? '#EF4444' : '#10B981',
      fields: [
        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'State', value: locked ? 'LOCKED' : 'UNLOCKED', inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });

    return {
      success: true,
      caseNumber,
      message: `${locked ? 'Locked' : 'Unlocked'} <#${channel.id}> successfully (Case #${caseNumber}).`,
    };
  }

  /**
   * Sets channel slowmode.
   */
  public static async setSlowmode(
    channel: TextChannel,
    executor: GuildMember | null,
    seconds: number,
    reason: string = 'Slowmode update'
  ): Promise<ModerationResult> {
    const guild = channel.guild;
    await channel.setRateLimitPerUser(seconds, `${executor ? executor.user.tag : 'System'}: ${reason}`);

    const caseNumber = await this.getNextCaseNumber(guild.id);
    const modTag = executor ? executor.user.tag : 'SMCore System';
    const modId = executor ? executor.id : guild.client.user?.id || 'SYSTEM';

    await prisma.moderationCase.create({
      data: {
        guildId: guild.id,
        caseNumber,
        targetId: channel.id,
        targetTag: `#${channel.name}`,
        moderatorId: modId,
        moderatorTag: modTag,
        action: ModerationAction.SLOWMODE,
        durationMinutes: Math.round(seconds / 60),
        reason,
        metadata: { seconds },
      },
    });

    await LogService.log({
      guild,
      category: LogCategory.CHANNEL,
      eventType: 'CHANNEL_SLOWMODE',
      title: `⏱️ Slowmode Updated: #${channel.name}`,
      caseNumber,
      channelId: channel.id,
      executorId: modId,
      executorTag: modTag,
      colorHex: '#6366F1',
      fields: [
        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'Cooldown', value: seconds === 0 ? 'Disabled' : `${seconds} seconds`, inline: true },
        { name: 'Moderator', value: `<@${modId}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });

    return {
      success: true,
      caseNumber,
      message: `Set slowmode for <#${channel.id}> to ${seconds === 0 ? 'Disabled' : `${seconds}s`} (Case #${caseNumber}).`,
    };
  }
}
