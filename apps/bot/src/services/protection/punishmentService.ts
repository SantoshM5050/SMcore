import { Message, GuildMember } from 'discord.js';
import { AutoModPunishment, ModerationAction } from '@smcore/shared';
import { DetectionResult, ProtectionEvent } from './protectionTypes';
import { HierarchyService } from '../moderation/hierarchyService';
import { ModerationService } from '../moderation/moderationService';
import { WarningService } from '../moderation/warningService';
import { CaseService } from '../moderation/caseService';
import { logger } from '../../utils/logger';

export class PunishmentService {
  /**
   * Applies the determined automated punishment for a policy violation
   */
  public static async applyPunishment(
    message: Message,
    detection: DetectionResult
  ): Promise<ProtectionEvent | null> {
    if (!message.guild || !detection.violated) return null;

    const guild = message.guild;
    const botMember = guild.members.me;
    const authorId = message.author.id;
    const reason = `[AutoMod ${detection.protectionType}] ${detection.reason || 'Policy violation'}`;

    // 1. Delete violating message if requested
    if (detection.deleteMessage && message.deletable) {
      try {
        await message.delete();
      } catch (err) {
        logger.warn({ err, messageId: message.id }, 'Failed to delete violating message');
      }
    }

    const punishment = detection.punishment || AutoModPunishment.DELETE;

    // If punishment was solely message deletion, record case and return
    if (punishment === AutoModPunishment.DELETE) {
      await CaseService.createCase({
        guildId: guild.id,
        guildName: guild.name,
        guildOwnerId: guild.ownerId,
        type: ModerationAction.PURGE,
        targetUserId: authorId,
        moderatorUserId: botMember?.id || 'AUTOMOD',
        reason,
        metadata: {
          protectionType: detection.protectionType,
          ...detection.metadata,
        },
      });

      return {
        guildId: guild.id,
        targetUserId: authorId,
        protectionType: detection.protectionType!,
        reason,
        channelId: message.channel.id,
        messageId: message.id,
        detectedAt: new Date(),
        punishment: AutoModPunishment.DELETE,
        metadata: detection.metadata,
      };
    }

    // For member moderation punishments, verify hierarchy
    if (!botMember) {
      logger.warn({ guildId: guild.id }, 'Bot member not found in guild, skipping punishment');
      return null;
    }

    let targetMember: GuildMember | null = null;
    try {
      targetMember = await guild.members.fetch(authorId);
    } catch {
      targetMember = null;
    }

    if (targetMember) {
      const hierarchyCheck = HierarchyService.canModerateMember(botMember, targetMember, botMember);
      if (!hierarchyCheck.allowed) {
        logger.warn(
          { targetId: authorId, code: hierarchyCheck.code },
          'AutoMod cannot punish member due to role hierarchy'
        );
        return null;
      }
    }

    // 2. Dispatch punishment action using Phase 1 services
    try {
      switch (punishment) {
        case AutoModPunishment.WARN:
          await WarningService.addWarning(
            guild.id,
            authorId,
            botMember.id,
            reason
          );
          break;

        case AutoModPunishment.TIMEOUT:
          await ModerationService.timeoutMember(guild, botMember, {
            targetUserId: authorId,
            durationSeconds: 600, // 10 minutes default AutoMod timeout
            reason,
          });
          break;

        case AutoModPunishment.KICK:
          await ModerationService.kickMember(guild, botMember, {
            targetUserId: authorId,
            reason,
          });
          break;

        case AutoModPunishment.BAN:
          await ModerationService.banMember(guild, botMember, {
            targetUserId: authorId,
            deleteMessageSeconds: 86400, // 1 day
            reason,
          });
          break;
      }

      logger.info(
        {
          guildId: guild.id,
          targetUserId: authorId,
          type: detection.protectionType,
          punishment,
        },
        'AutoMod punishment executed successfully'
      );
    } catch (err) {
      logger.error({ err, authorId, punishment }, 'Error executing AutoMod punishment action');
    }

    // Emit AutoMod violation audit event
    try {
      const { eventBus } = await import('../events/eventBus');
      eventBus.emitAsync('automod.violation', {
        guildId: guild.id,
        protectionType: detection.protectionType!,
        punishment,
        authorId,
        channelId: message.channel.id,
        messageId: message.id,
        reason,
        metadata: detection.metadata,
      });
    } catch {
      // Non-blocking
    }

    return {
      guildId: guild.id,
      targetUserId: authorId,
      protectionType: detection.protectionType!,
      reason,
      channelId: message.channel.id,
      messageId: message.id,
      detectedAt: new Date(),
      punishment,
      metadata: detection.metadata,
    };
  }
}
