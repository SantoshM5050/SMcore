import { GuildMember, TextChannel } from 'discord.js';
import {
  GuildSecuritySettings,
  ModerationAction,
  SecurityAction,
  SecurityEventType,
  SecurityRiskLevel,
} from '@smcore/shared';
import { SecurityEvent } from './securityTypes';
import { QuarantineService } from './quarantineService';
import { ModerationService } from '../moderation/moderationService';
import { WarningService } from '../moderation/warningService';
import { CaseService } from '../moderation/caseService';
import { logger } from '../../utils/logger';

export interface DispatchSecurityActionParams {
  member: GuildMember;
  botMember: GuildMember;
  action: SecurityAction;
  riskLevel: SecurityRiskLevel;
  eventType: SecurityEventType;
  reason: string;
  settings: GuildSecuritySettings;
  metadata?: Record<string, unknown>;
}

export class SecurityActionService {
  /**
   * Dispatches the appropriate automated security action against a guild member,
   * creates audit moderation cases, and optionally notifies the security alert channel.
   */
  public static async executeAction(
    params: DispatchSecurityActionParams
  ): Promise<SecurityEvent> {
    const {
      member,
      botMember,
      action,
      riskLevel,
      eventType,
      reason,
      settings,
      metadata = {},
    } = params;

    const guild = member.guild;
    const now = new Date();

    const event: SecurityEvent = {
      guildId: guild.id,
      targetUserId: member.id,
      type: eventType,
      riskLevel,
      action,
      reason,
      timestamp: now,
      metadata,
    };

    if (action === SecurityAction.NONE) {
      logger.info(
        { guildId: guild.id, memberId: member.id, eventType },
        'Security evaluation resulted in NONE action'
      );
      return event;
    }

    try {
      switch (action) {
        case SecurityAction.QUARANTINE: {
          if (!settings.quarantineRoleId) {
            logger.warn(
              { guildId: guild.id, memberId: member.id },
              'Cannot quarantine member: quarantineRoleId not configured in settings'
            );
            break;
          }

          const qResult = await QuarantineService.quarantineMember(
            member,
            botMember,
            settings.quarantineRoleId,
            reason
          );

          if (qResult.success) {
            await CaseService.createCase({
              guildId: guild.id,
              guildName: guild.name,
              guildOwnerId: guild.ownerId,
              type: ModerationAction.WARN,
              targetUserId: member.id,
              moderatorUserId: botMember.id,
              reason: `[SECURITY QUARANTINE] ${reason}`,
              metadata: {
                quarantineRoleId: settings.quarantineRoleId,
                previousRoles: qResult.previousRoles,
                ...metadata,
              },
            });
          }
          break;
        }

        case SecurityAction.WARN: {
          await WarningService.addWarning(
            guild.id,
            member.id,
            botMember.id,
            `[SECURITY] ${reason}`
          );
          break;
        }

        case SecurityAction.TIMEOUT: {
          await ModerationService.timeoutMember(guild, botMember, {
            targetUserId: member.id,
            durationSeconds: 3600, // 1 hour security timeout
            reason: `[SECURITY] ${reason}`,
          });
          break;
        }

        case SecurityAction.KICK: {
          await ModerationService.kickMember(guild, botMember, {
            targetUserId: member.id,
            reason: `[SECURITY] ${reason}`,
          });
          break;
        }

        case SecurityAction.BAN: {
          await ModerationService.banMember(guild, botMember, {
            targetUserId: member.id,
            deleteMessageSeconds: 0,
            reason: `[SECURITY] ${reason}`,
          });
          break;
        }
      }

      logger.info(
        { guildId: guild.id, memberId: member.id, action, eventType },
        'Security action executed successfully'
      );
    } catch (err) {
      logger.error(
        { err, guildId: guild.id, memberId: member.id, action },
        'Error executing security action'
      );
    }

    return event;
  }
}
