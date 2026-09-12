import { prisma } from '@smcore/database';
import { ModerationAction, CaseStatus, PaginatedResult } from '@smcore/shared';
import { logger } from '../../utils/logger';

export interface CreateCaseParams {
  guildId: string;
  guildName?: string;
  guildOwnerId?: string;
  type: ModerationAction;
  targetUserId: string;
  moderatorUserId: string;
  reason?: string;
  duration?: number;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CaseFilterOptions {
  page?: number;
  pageSize?: number;
  targetUserId?: string;
  moderatorUserId?: string;
  type?: ModerationAction;
  status?: CaseStatus;
}

export class CaseService {
  /**
   * Ensures Guild record exists in database
   */
  public static async ensureGuildExists(
    guildId: string,
    name = 'Unknown Server',
    ownerId = '0'
  ): Promise<void> {
    try {
      await prisma.guild.upsert({
        where: { id: guildId },
        create: {
          id: guildId,
          name,
          ownerId,
        },
        update: {
          name,
        },
      });
    } catch (err) {
      logger.warn({ err, guildId }, 'Could not sync guild to database (DB may be offline)');
    }
  }

  /**
   * Generates the next sequential case number for a specific guild
   */
  public static async getNextCaseNumber(guildId: string): Promise<number> {
    try {
      const highestCase = await prisma.moderationCase.findFirst({
        where: { guildId },
        orderBy: { caseNumber: 'desc' },
        select: { caseNumber: true },
      });

      return (highestCase?.caseNumber ?? 0) + 1;
    } catch (err) {
      logger.warn({ err, guildId }, 'Failed to query highest case number, defaulting to 1');
      return 1;
    }
  }

  /**
   * Creates and stores a moderation case record
   */
  public static async createCase(params: CreateCaseParams) {
    await this.ensureGuildExists(params.guildId, params.guildName, params.guildOwnerId);

    const caseNumber = await this.getNextCaseNumber(params.guildId);

    try {
      const modCase = await prisma.moderationCase.create({
        data: {
          guildId: params.guildId,
          caseNumber,
          type: params.type,
          targetUserId: params.targetUserId,
          moderatorUserId: params.moderatorUserId,
          reason: params.reason,
          duration: params.duration,
          expiresAt: params.expiresAt,
          status: CaseStatus.ACTIVE,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        },
      });

      logger.info(
        { guildId: params.guildId, caseNumber, type: params.type, target: params.targetUserId },
        'Created moderation case'
      );

      // Asynchronously emit audit events
      try {
        const { eventBus } = await import('../events/eventBus');
        const { AuditAction, AuditEventType } = await import('@smcore/shared');

        let auditAction = AuditAction.SYSTEM;
        switch (params.type) {
          case ModerationAction.BAN: auditAction = AuditAction.BAN; break;
          case ModerationAction.UNBAN: auditAction = AuditAction.UNBAN; break;
          case ModerationAction.KICK: auditAction = AuditAction.KICK; break;
          case ModerationAction.TIMEOUT: auditAction = AuditAction.TIMEOUT; break;
          case ModerationAction.UNTIMEOUT: auditAction = AuditAction.UNTIMEOUT; break;
          case ModerationAction.WARN: auditAction = AuditAction.WARN; break;
          case ModerationAction.PURGE: auditAction = AuditAction.PURGE; break;
          case ModerationAction.LOCK: auditAction = AuditAction.LOCK; break;
          case ModerationAction.UNLOCK: auditAction = AuditAction.UNLOCK; break;
          case ModerationAction.SLOWMODE: auditAction = AuditAction.SLOWMODE; break;
          case ModerationAction.NICKNAME: auditAction = AuditAction.NICKNAME; break;
          case ModerationAction.SOFTBAN: auditAction = AuditAction.BAN; break;
        }

        eventBus.emitAsync('moderation.action', {
          guildId: params.guildId,
          action: auditAction,
          actorUserId: params.moderatorUserId,
          targetUserId: params.targetUserId,
          caseId: modCase.id !== 'transient' ? modCase.id : undefined,
          reason: params.reason,
          metadata: { caseNumber, duration: params.duration, ...params.metadata },
        });

        eventBus.emitAsync('audit.log', {
          guildId: params.guildId,
          eventType: AuditEventType.CASE_CREATED,
          action: auditAction,
          actorUserId: params.moderatorUserId,
          targetUserId: params.targetUserId,
          caseId: modCase.id !== 'transient' ? modCase.id : undefined,
          reason: params.reason || `Case #${caseNumber} created`,
          metadata: { caseNumber, type: params.type, ...params.metadata },
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to dispatch moderation audit event');
      }

      return modCase;
    } catch (err) {
      logger.error({ err, params }, 'Error creating moderation case in database');
      // Return a transient case representation so user still receives action confirmation
      return {
        id: 'transient',
        guildId: params.guildId,
        caseNumber,
        type: params.type,
        targetUserId: params.targetUserId,
        moderatorUserId: params.moderatorUserId,
        reason: params.reason ?? null,
        duration: params.duration ?? null,
        expiresAt: params.expiresAt ?? null,
        status: CaseStatus.ACTIVE,
        metadata: params.metadata ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Retrieves paginated cases for a guild with optional filters
   */
  public static async getCases(
    guildId: string,
    filter: CaseFilterOptions = {}
  ): Promise<PaginatedResult<any>> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const where: any = { guildId };

    if (filter.targetUserId) where.targetUserId = filter.targetUserId;
    if (filter.moderatorUserId) where.moderatorUserId = filter.moderatorUserId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;

    try {
      const [items, total] = await Promise.all([
        prisma.moderationCase.findMany({
          where,
          orderBy: { caseNumber: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.moderationCase.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (err) {
      logger.warn({ err, guildId }, 'Failed to query cases from database');
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  /**
   * Updates status of a moderation case (e.g. REVOKED or EXPIRED)
   */
  public static async updateCaseStatus(
    guildId: string,
    caseNumber: number,
    status: CaseStatus
  ) {
    try {
      return await prisma.moderationCase.update({
        where: {
          guildId_caseNumber: {
            guildId,
            caseNumber,
          },
        },
        data: { status },
      });
    } catch (err) {
      logger.warn({ err, guildId, caseNumber }, 'Failed to update case status in database');
      return null;
    }
  }
}
