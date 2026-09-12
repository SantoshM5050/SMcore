import { prisma } from '@smcore/database';
import { logger } from '../../utils/logger';
import { TicketConfigService } from './ticketConfigService';
import { TicketDTO } from './ticketTypes';

export class TicketAutoCloseService {
  /**
   * Identifies candidate inactive tickets for auto-close sweep
   */
  public static async getInactiveTickets(
    guildId: string,
    batchLimit: number = 25
  ): Promise<TicketDTO[]> {
    const settings = await TicketConfigService.getSettings(guildId);
    if (!settings.autoCloseEnabled || settings.autoCloseHours <= 0) {
      return [];
    }

    const cutoffDate = new Date(Date.now() - settings.autoCloseHours * 60 * 60 * 1000);

    try {
      const records = await prisma.ticket.findMany({
        where: {
          guildId,
          status: { in: ['OPEN', 'CLAIMED'] },
          lastActivityAt: { lt: cutoffDate },
        },
        take: batchLimit,
        orderBy: { lastActivityAt: 'asc' },
      });

      return records.map((r) => ({
        ...r,
        status: r.status as any,
        participants: r.participants || [],
        metadata: r.metadata as any,
      }));
    } catch (err) {
      logger.warn({ guildId, err }, 'Failed to query inactive tickets from DB');
      return [];
    }
  }

  /**
   * Helper to evaluate whether a single ticket is expired by inactivity
   */
  public static isTicketInactive(
    ticket: TicketDTO,
    autoCloseHours: number
  ): boolean {
    if (autoCloseHours <= 0) return false;
    const elapsedMs = Date.now() - new Date(ticket.lastActivityAt).getTime();
    return elapsedMs >= autoCloseHours * 60 * 60 * 1000;
  }
}
