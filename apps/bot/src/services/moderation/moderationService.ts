import {
  Guild,
  GuildMember,
  TextChannel,
  NewsChannel,
  ThreadChannel,
  User,
} from 'discord.js';
import {
  ModerationAction,
  BanInput,
  UnbanInput,
  KickInput,
  TimeoutInput,
  UntimeoutInput,
  PurgeInput,
  LockInput,
  UnlockInput,
  SlowmodeInput,
  NicknameInput,
} from '@smcore/shared';
import { HierarchyService } from './hierarchyService';
import { PermissionService } from './permissionService';
import { CaseService } from './caseService';
import { logger } from '../../utils/logger';

export interface ModerationResult {
  success: boolean;
  caseNumber?: number;
  message: string;
  error?: string;
}

export class ModerationService {
  /**
   * BAN a member or user from the guild
   */
  public static async banMember(
    guild: Guild,
    moderator: GuildMember,
    input: BanInput
  ): Promise<ModerationResult> {
    // 1. Permission check
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.BAN);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to ban members.' };
    }

    const botMember = guild.members.me;
    if (!botMember) {
      return { success: false, message: 'Bot member not available in guild.' };
    }

    // 2. Hierarchy check (if target is currently in the guild)
    let targetMember: GuildMember | null = null;
    try {
      targetMember = await guild.members.fetch(input.targetUserId);
    } catch {
      targetMember = null;
    }

    if (targetMember) {
      const hierarchyCheck = HierarchyService.canModerateMember(moderator, targetMember, botMember);
      if (!hierarchyCheck.allowed) {
        return { success: false, message: hierarchyCheck.message || 'Hierarchy check failed.' };
      }
    }

    // 3. Execute Discord Ban
    try {
      await guild.bans.create(input.targetUserId, {
        reason: input.reason || `Banned by ${moderator.user.tag}`,
        deleteMessageSeconds: input.deleteMessageSeconds,
      });
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to execute Discord ban');
      return { success: false, message: `Failed to ban user: ${err?.message || 'Discord API error'}` };
    }

    // 4. Create Moderation Case
    const modCase = await CaseService.createCase({
      guildId: guild.id,
      guildName: guild.name,
      guildOwnerId: guild.ownerId,
      type: ModerationAction.BAN,
      targetUserId: input.targetUserId,
      moderatorUserId: moderator.id,
      reason: input.reason,
      metadata: { deleteMessageSeconds: input.deleteMessageSeconds },
    });

    return {
      success: true,
      caseNumber: modCase.caseNumber,
      message: `Successfully banned <@${input.targetUserId}>. Case #${modCase.caseNumber}`,
    };
  }

  /**
   * UNBAN a user from the guild
   */
  public static async unbanMember(
    guild: Guild,
    moderator: GuildMember,
    input: UnbanInput
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.UNBAN);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to unban members.' };
    }

    try {
      await guild.bans.remove(input.targetUserId, input.reason || `Unbanned by ${moderator.user.tag}`);
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to execute Discord unban');
      return { success: false, message: `Failed to unban user: ${err?.message || 'User may not be banned'}` };
    }

    const modCase = await CaseService.createCase({
      guildId: guild.id,
      guildName: guild.name,
      guildOwnerId: guild.ownerId,
      type: ModerationAction.UNBAN,
      targetUserId: input.targetUserId,
      moderatorUserId: moderator.id,
      reason: input.reason,
    });

    return {
      success: true,
      caseNumber: modCase.caseNumber,
      message: `Successfully unbanned <@${input.targetUserId}>. Case #${modCase.caseNumber}`,
    };
  }

  /**
   * KICK a member from the guild
   */
  public static async kickMember(
    guild: Guild,
    moderator: GuildMember,
    input: KickInput
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.KICK);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to kick members.' };
    }

    const botMember = guild.members.me;
    if (!botMember) {
      return { success: false, message: 'Bot member not available in guild.' };
    }

    let targetMember: GuildMember;
    try {
      targetMember = await guild.members.fetch(input.targetUserId);
    } catch {
      return { success: false, message: 'Target user is not currently in this server.' };
    }

    const hierarchyCheck = HierarchyService.canModerateMember(moderator, targetMember, botMember);
    if (!hierarchyCheck.allowed) {
      return { success: false, message: hierarchyCheck.message || 'Hierarchy check failed.' };
    }

    try {
      await targetMember.kick(input.reason || `Kicked by ${moderator.user.tag}`);
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to execute Discord kick');
      return { success: false, message: `Failed to kick member: ${err?.message || 'Discord API error'}` };
    }

    const modCase = await CaseService.createCase({
      guildId: guild.id,
      guildName: guild.name,
      guildOwnerId: guild.ownerId,
      type: ModerationAction.KICK,
      targetUserId: input.targetUserId,
      moderatorUserId: moderator.id,
      reason: input.reason,
    });

    return {
      success: true,
      caseNumber: modCase.caseNumber,
      message: `Successfully kicked <@${input.targetUserId}>. Case #${modCase.caseNumber}`,
    };
  }

  /**
   * TIMEOUT a member
   */
  public static async timeoutMember(
    guild: Guild,
    moderator: GuildMember,
    input: TimeoutInput
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.TIMEOUT);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to timeout members.' };
    }

    const botMember = guild.members.me;
    if (!botMember) {
      return { success: false, message: 'Bot member not available in guild.' };
    }

    let targetMember: GuildMember;
    try {
      targetMember = await guild.members.fetch(input.targetUserId);
    } catch {
      return { success: false, message: 'Target user is not currently in this server.' };
    }

    const hierarchyCheck = HierarchyService.canModerateMember(moderator, targetMember, botMember);
    if (!hierarchyCheck.allowed) {
      return { success: false, message: hierarchyCheck.message || 'Hierarchy check failed.' };
    }

    const durationMs = input.durationSeconds * 1000;
    const expiresAt = new Date(Date.now() + durationMs);

    try {
      await targetMember.timeout(durationMs, input.reason || `Timed out by ${moderator.user.tag}`);
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to execute Discord timeout');
      return { success: false, message: `Failed to timeout member: ${err?.message || 'Discord API error'}` };
    }

    const modCase = await CaseService.createCase({
      guildId: guild.id,
      guildName: guild.name,
      guildOwnerId: guild.ownerId,
      type: ModerationAction.TIMEOUT,
      targetUserId: input.targetUserId,
      moderatorUserId: moderator.id,
      reason: input.reason,
      duration: input.durationSeconds,
      expiresAt,
    });

    return {
      success: true,
      caseNumber: modCase.caseNumber,
      message: `Successfully timed out <@${input.targetUserId}> for ${Math.round(input.durationSeconds / 60)}m. Case #${modCase.caseNumber}`,
    };
  }

  /**
   * REMOVE TIMEOUT (Untimeout)
   */
  public static async removeTimeout(
    guild: Guild,
    moderator: GuildMember,
    input: UntimeoutInput
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.UNTIMEOUT);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to remove timeouts.' };
    }

    const botMember = guild.members.me;
    if (!botMember) {
      return { success: false, message: 'Bot member not available in guild.' };
    }

    let targetMember: GuildMember;
    try {
      targetMember = await guild.members.fetch(input.targetUserId);
    } catch {
      return { success: false, message: 'Target user is not currently in this server.' };
    }

    const hierarchyCheck = HierarchyService.canModerateMember(moderator, targetMember, botMember);
    if (!hierarchyCheck.allowed) {
      return { success: false, message: hierarchyCheck.message || 'Hierarchy check failed.' };
    }

    try {
      await targetMember.timeout(null, input.reason || `Timeout removed by ${moderator.user.tag}`);
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to remove Discord timeout');
      return { success: false, message: `Failed to remove timeout: ${err?.message || 'Discord API error'}` };
    }

    const modCase = await CaseService.createCase({
      guildId: guild.id,
      guildName: guild.name,
      guildOwnerId: guild.ownerId,
      type: ModerationAction.UNTIMEOUT,
      targetUserId: input.targetUserId,
      moderatorUserId: moderator.id,
      reason: input.reason,
    });

    return {
      success: true,
      caseNumber: modCase.caseNumber,
      message: `Successfully removed timeout for <@${input.targetUserId}>. Case #${modCase.caseNumber}`,
    };
  }

  /**
   * PURGE messages from a channel
   */
  public static async purgeMessages(
    guild: Guild,
    channel: TextChannel | NewsChannel | ThreadChannel,
    moderator: GuildMember,
    input: PurgeInput
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.PURGE);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to manage messages.' };
    }

    try {
      let messagesToDelete;
      if (input.targetUserId) {
        const fetched = await channel.messages.fetch({ limit: 100 });
        const filtered = fetched.filter((m) => m.author.id === input.targetUserId);
        messagesToDelete = Array.from(filtered.values()).slice(0, input.amount);
      } else {
        messagesToDelete = input.amount;
      }

      const deleted = await channel.bulkDelete(messagesToDelete, true);

      const modCase = await CaseService.createCase({
        guildId: guild.id,
        guildName: guild.name,
        guildOwnerId: guild.ownerId,
        type: ModerationAction.PURGE,
        targetUserId: input.targetUserId || 'ALL',
        moderatorUserId: moderator.id,
        reason: `Purged ${deleted.size} messages in #${channel.name}`,
        metadata: {
          channelId: channel.id,
          channelName: channel.name,
          deletedCount: deleted.size,
          filterUser: input.targetUserId,
        },
      });

      return {
        success: true,
        caseNumber: modCase.caseNumber,
        message: `Successfully purged ${deleted.size} messages in <#${channel.id}>. Case #${modCase.caseNumber}`,
      };
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to purge messages');
      return { success: false, message: `Failed to purge messages: ${err?.message || 'Discord API error'}` };
    }
  }

  /**
   * LOCK a channel
   */
  public static async lockChannel(
    guild: Guild,
    channel: TextChannel | NewsChannel,
    moderator: GuildMember,
    input: LockInput
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.LOCK);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to manage channels.' };
    }

    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false,
      });

      const modCase = await CaseService.createCase({
        guildId: guild.id,
        guildName: guild.name,
        guildOwnerId: guild.ownerId,
        type: ModerationAction.LOCK,
        targetUserId: channel.id,
        moderatorUserId: moderator.id,
        reason: input.reason || `Channel locked by ${moderator.user.tag}`,
        metadata: { channelId: channel.id, channelName: channel.name },
      });

      return {
        success: true,
        caseNumber: modCase.caseNumber,
        message: `Locked <#${channel.id}>. Case #${modCase.caseNumber}`,
      };
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to lock channel');
      return { success: false, message: `Failed to lock channel: ${err?.message || 'Discord API error'}` };
    }
  }

  /**
   * UNLOCK a channel
   */
  public static async unlockChannel(
    guild: Guild,
    channel: TextChannel | NewsChannel,
    moderator: GuildMember,
    input: UnlockInput
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.UNLOCK);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to manage channels.' };
    }

    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: null, // Reset to default permissions
      });

      const modCase = await CaseService.createCase({
        guildId: guild.id,
        guildName: guild.name,
        guildOwnerId: guild.ownerId,
        type: ModerationAction.UNLOCK,
        targetUserId: channel.id,
        moderatorUserId: moderator.id,
        reason: input.reason || `Channel unlocked by ${moderator.user.tag}`,
        metadata: { channelId: channel.id, channelName: channel.name },
      });

      return {
        success: true,
        caseNumber: modCase.caseNumber,
        message: `Unlocked <#${channel.id}>. Case #${modCase.caseNumber}`,
      };
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to unlock channel');
      return { success: false, message: `Failed to unlock channel: ${err?.message || 'Discord API error'}` };
    }
  }

  /**
   * SET SLOWMODE on a channel
   */
  public static async setSlowmode(
    guild: Guild,
    channel: TextChannel | NewsChannel | ThreadChannel,
    moderator: GuildMember,
    input: SlowmodeInput
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.SLOWMODE);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to manage channels.' };
    }

    try {
      await channel.setRateLimitPerUser(
        input.seconds,
        input.reason || `Slowmode updated by ${moderator.user.tag}`
      );

      const modCase = await CaseService.createCase({
        guildId: guild.id,
        guildName: guild.name,
        guildOwnerId: guild.ownerId,
        type: ModerationAction.SLOWMODE,
        targetUserId: channel.id,
        moderatorUserId: moderator.id,
        reason: input.reason,
        duration: input.seconds,
        metadata: { channelId: channel.id, seconds: input.seconds },
      });

      const label = input.seconds === 0 ? 'Disabled slowmode' : `Set slowmode to ${input.seconds}s`;
      return {
        success: true,
        caseNumber: modCase.caseNumber,
        message: `${label} in <#${channel.id}>. Case #${modCase.caseNumber}`,
      };
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to set slowmode');
      return { success: false, message: `Failed to set slowmode: ${err?.message || 'Discord API error'}` };
    }
  }

  /**
   * MODERATE NICKNAME of a member
   */
  public static async moderateNickname(
    guild: Guild,
    moderator: GuildMember,
    input: NicknameInput
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.canExecuteAction(moderator, ModerationAction.NICKNAME);
    if (!permCheck.hasPermission) {
      return { success: false, message: 'You lack permission to manage nicknames.' };
    }

    const botMember = guild.members.me;
    if (!botMember) {
      return { success: false, message: 'Bot member not available in guild.' };
    }

    let targetMember: GuildMember;
    try {
      targetMember = await guild.members.fetch(input.targetUserId);
    } catch {
      return { success: false, message: 'Target user is not currently in this server.' };
    }

    const hierarchyCheck = HierarchyService.canModerateMember(moderator, targetMember, botMember);
    if (!hierarchyCheck.allowed) {
      return { success: false, message: hierarchyCheck.message || 'Hierarchy check failed.' };
    }

    try {
      const newNick = input.nickname && input.nickname.trim().length > 0 ? input.nickname.trim() : null;
      await targetMember.setNickname(newNick, input.reason || `Moderated by ${moderator.user.tag}`);

      const modCase = await CaseService.createCase({
        guildId: guild.id,
        guildName: guild.name,
        guildOwnerId: guild.ownerId,
        type: ModerationAction.NICKNAME,
        targetUserId: input.targetUserId,
        moderatorUserId: moderator.id,
        reason: input.reason,
        metadata: { nickname: newNick },
      });

      const label = newNick ? `Changed nickname to "${newNick}"` : 'Reset nickname';
      return {
        success: true,
        caseNumber: modCase.caseNumber,
        message: `${label} for <@${input.targetUserId}>. Case #${modCase.caseNumber}`,
      };
    } catch (err: any) {
      logger.error({ err, input }, 'Failed to moderate nickname');
      return { success: false, message: `Failed to change nickname: ${err?.message || 'Discord API error'}` };
    }
  }
}
