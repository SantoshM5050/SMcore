import { prisma } from '@smcore/database';
import {
  AuditAction,
  AuditEventType,
  AuditLogEntry,
  AuditLogQuery,
  AuditTargetType,
} from '@smcore/shared';
import { AuditLogQueryResult } from './auditTypes';
import { logger } from '../../utils/logger';

export class AuditQueryService {
  /**
   * Queries audit logs with strict guild isolation, comprehensive filtering,
   * and cursor-based pagination.
   */
  public static async queryAuditLogs(
    guildId: string,
    query: AuditLogQuery
  ): Promise<AuditLogQueryResult> {
    const limit = Math.min(Math.max(1, query.limit || 50), 100);

    const where: Record<string, unknown> = {
      guildId,
    };

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }

    if (query.targetUserId) {
      where.targetUserId = query.targetUserId;
    }

    if (query.channelId) {
      where.channelId = query.channelId;
    }

    if (query.caseId) {
      where.caseId = query.caseId;
    }

    if (query.from || query.to) {
      const createdAtFilter: Record<string, Date> = {};
      if (query.from) createdAtFilter.gte = query.from;
      if (query.to) createdAtFilter.lte = query.to;
      where.createdAt = createdAtFilter;
    }

    try {
      // Query one extra item to determine if there is a next page
      const items = await prisma.auditLog.findMany({
        where,
        take: limit + 1,
        ...(query.cursor
          ? {
              cursor: { id: query.cursor },
              skip: 1, // Skip cursor item
            }
          : {}),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });

      let nextCursor: string | null = null;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem ? nextItem.id : null;
      }

      const data: AuditLogEntry[] = items.map((item) => ({
        id: item.id,
        guildId: item.guildId,
        eventType: item.eventType as AuditEventType,
        action: item.action as AuditAction,
        actorUserId: item.actorUserId,
        targetUserId: item.targetUserId,
        targetType: (item.targetType as AuditTargetType) ?? undefined,
        channelId: item.channelId,
        caseId: item.caseId,
        reason: item.reason,
        metadata: (item.metadata as Record<string, unknown>) ?? undefined,
        createdAt: item.createdAt,
      }));

      return {
        data,
        nextCursor,
      };
    } catch (err) {
      logger.warn(
        { err, guildId },
        'Failed to query audit logs from database (database unavailable or disconnected)'
      );
      return {
        data: [],
        nextCursor: null,
        total: 0,
        fallback: true,
      };
    }
  }

  /**
   * Retrieves a single audit log entry strictly isolated by guild ID
   */
  public static async getAuditLogById(
    guildId: string,
    id: string
  ): Promise<AuditLogEntry | null> {
    try {
      const item = await prisma.auditLog.findFirst({
        where: { id, guildId },
      });

      if (!item) return null;

      return {
        id: item.id,
        guildId: item.guildId,
        eventType: item.eventType as AuditEventType,
        action: item.action as AuditAction,
        actorUserId: item.actorUserId,
        targetUserId: item.targetUserId,
        targetType: (item.targetType as AuditTargetType) ?? undefined,
        channelId: item.channelId,
        caseId: item.caseId,
        reason: item.reason,
        metadata: (item.metadata as Record<string, unknown>) ?? undefined,
        createdAt: item.createdAt,
      };
    } catch (err) {
      logger.warn(
        { err, guildId, id },
        'Failed to fetch audit log by ID from database'
      );
      return null;
    }
  }
}
