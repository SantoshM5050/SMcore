import { prisma } from '@smcore/database';
import { RetentionCleanupResult } from './auditTypes';
import { logger } from '../../utils/logger';

export class AuditRetentionService {
  /**
   * Cleans up expired audit logs older than the retention threshold using bounded operations.
   * Does NOT load full tables into memory.
   */
  public static async cleanupGuildAuditLogs(
    guildId: string,
    retentionDays: number
  ): Promise<RetentionCleanupResult> {
    if (retentionDays <= 0) {
      throw new Error('Retention days must be greater than zero');
    }

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    try {
      const result = await prisma.auditLog.deleteMany({
        where: {
          guildId,
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(
        { guildId, deletedCount: result.count, retentionDays, cutoffDate },
        'Audit log retention cleanup executed successfully'
      );

      return {
        guildId,
        deletedCount: result.count,
        cutoffDate,
      };
    } catch (err) {
      logger.error(
        { err, guildId, retentionDays },
        'Error during audit log retention cleanup'
      );
      return {
        guildId,
        deletedCount: 0,
        cutoffDate,
      };
    }
  }
}
