import { prisma } from '@smcore/database';
import { ModerationAction, WarningStatus } from '@smcore/shared';
import { CaseService } from './caseService';
import { logger } from '../../utils/logger';

export interface AddWarningResult {
  warningId: string;
  caseNumber: number;
  activeWarningCount: number;
  escalationTriggered?: {
    action: ModerationAction;
    duration?: number;
  };
}

export class WarningService {
  /**
   * Issues a warning to a member and checks for automated escalation thresholds
   */
  public static async addWarning(
    guildId: string,
    targetUserId: string,
    moderatorUserId: string,
    reason: string
  ): Promise<AddWarningResult> {
    // 1. Create a ModerationCase for the warning
    const modCase = await CaseService.createCase({
      guildId,
      type: ModerationAction.WARN,
      targetUserId,
      moderatorUserId,
      reason,
    });

    let warningId = 'transient-warning';
    let activeWarningCount = 1;

    try {
      // 2. Create the Warning record
      const warning = await prisma.warning.create({
        data: {
          guildId,
          targetUserId,
          moderatorUserId,
          reason,
          caseId: modCase.id !== 'transient' ? modCase.id : undefined,
          status: WarningStatus.ACTIVE,
        },
      });
      warningId = warning.id;

      // 3. Count total active warnings for this member in this guild
      activeWarningCount = await prisma.warning.count({
        where: {
          guildId,
          targetUserId,
          status: WarningStatus.ACTIVE,
        },
      });

      // 4. Check for escalation rules
      const rule = await prisma.warningEscalationRule.findUnique({
        where: {
          guildId_warningCount: {
            guildId,
            warningCount: activeWarningCount,
          },
        },
      });

      if (rule && rule.enabled) {
        return {
          warningId,
          caseNumber: modCase.caseNumber,
          activeWarningCount,
          escalationTriggered: {
            action: rule.action as ModerationAction,
            duration: rule.duration ?? undefined,
          },
        };
      }
    } catch (err) {
      logger.warn({ err, guildId, targetUserId }, 'Warning recorded in-memory or database failed');
    }

    return {
      warningId,
      caseNumber: modCase.caseNumber,
      activeWarningCount,
    };
  }

  /**
   * Retrieves warning history for a member in a guild
   */
  public static async getWarnings(
    guildId: string,
    targetUserId: string,
    includeRevoked = false
  ) {
    try {
      return await prisma.warning.findMany({
        where: {
          guildId,
          targetUserId,
          ...(includeRevoked ? {} : { status: WarningStatus.ACTIVE }),
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      logger.warn({ err, guildId, targetUserId }, 'Failed to fetch warnings from database');
      return [];
    }
  }

  /**
   * Revokes a single warning by ID
   */
  public static async removeWarning(guildId: string, warningId: string): Promise<boolean> {
    try {
      await prisma.warning.update({
        where: { id: warningId, guildId },
        data: { status: WarningStatus.REVOKED },
      });
      return true;
    } catch (err) {
      logger.warn({ err, guildId, warningId }, 'Failed to revoke warning in database');
      return false;
    }
  }

  /**
   * Revokes all active warnings for a member in a guild
   */
  public static async clearWarnings(guildId: string, targetUserId: string): Promise<number> {
    try {
      const result = await prisma.warning.updateMany({
        where: {
          guildId,
          targetUserId,
          status: WarningStatus.ACTIVE,
        },
        data: { status: WarningStatus.REVOKED },
      });
      return result.count;
    } catch (err) {
      logger.warn({ err, guildId, targetUserId }, 'Failed to clear warnings in database');
      return 0;
    }
  }
}
