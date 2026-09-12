import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { prisma } from '@smcore/database';
import { AuditAction, AuditEventType, TicketStatus } from '@smcore/shared';
import { eventBus } from '../events/eventBus';
import { logger } from '../../utils/logger';
import { TicketConfigService } from './ticketConfigService';
import { TicketDTO } from './ticketTypes';

export class TicketClaimService {
  /**
   * Verifies if a member is authorized support staff for tickets
   */
  public static async isAuthorizedStaff(
    guildId: string,
    member: GuildMember
  ): Promise<boolean> {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return true;
    }

    const settings = await TicketConfigService.getSettings(guildId);
    if (!settings.supportRoleIds || settings.supportRoleIds.length === 0) {
      // If no support roles configured, ManageChannels or ManageMessages can handle tickets
      return (
        member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        member.permissions.has(PermissionFlagsBits.ManageMessages)
      );
    }

    return member.roles.cache.some((role) => settings.supportRoleIds.includes(role.id));
  }

  /**
   * Claims a ticket by support staff
   */
  public static async claimTicket(
    ticket: TicketDTO,
    staffMember: GuildMember
  ): Promise<{ success: boolean; error?: string; ticket?: TicketDTO }> {
    const isStaff = await this.isAuthorizedStaff(ticket.guildId, staffMember);
    if (!isStaff) {
      return { success: false, error: 'You do not have permission to claim tickets.' };
    }

    if (ticket.status === TicketStatus.CLOSED) {
      return { success: false, error: 'Cannot claim a closed ticket.' };
    }

    if (ticket.claimedByUserId) {
      if (ticket.claimedByUserId === staffMember.id) {
        return { success: false, error: 'You have already claimed this ticket.' };
      }
      return {
        success: false,
        error: `This ticket is already claimed by <@${ticket.claimedByUserId}>.`,
      };
    }

    const updated: TicketDTO = {
      ...ticket,
      claimedByUserId: staffMember.id,
      status: TicketStatus.CLAIMED,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          claimedByUserId: staffMember.id,
          status: TicketStatus.CLAIMED,
          lastActivityAt: new Date(),
        },
      });
    } catch (err) {
      logger.warn({ ticketId: ticket.id, err }, 'Failed to persist claim in DB, using updated object');
    }

    // Emit audit event
    eventBus.emitAsync('ticket.event', {
      guildId: ticket.guildId,
      eventType: AuditEventType.TICKET_CLAIMED,
      action: AuditAction.TICKET_CLAIM,
      actorUserId: staffMember.id,
      targetUserId: ticket.creatorUserId,
      channelId: ticket.channelId,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      reason: 'Ticket claimed by support staff',
    });

    return { success: true, ticket: updated };
  }

  /**
   * Unclaims a ticket
   */
  public static async unclaimTicket(
    ticket: TicketDTO,
    staffMember: GuildMember
  ): Promise<{ success: boolean; error?: string; ticket?: TicketDTO }> {
    const isStaff = await this.isAuthorizedStaff(ticket.guildId, staffMember);
    if (!isStaff) {
      return { success: false, error: 'You do not have permission to unclaim tickets.' };
    }

    if (!ticket.claimedByUserId) {
      return { success: false, error: 'This ticket is not currently claimed.' };
    }

    // Only current claimer or administrator can unclaim
    const isAdmin = staffMember.permissions.has(PermissionFlagsBits.Administrator);
    if (ticket.claimedByUserId !== staffMember.id && !isAdmin) {
      return {
        success: false,
        error: `Only the claimer (<@${ticket.claimedByUserId}>) or an administrator can unclaim this ticket.`,
      };
    }

    const updated: TicketDTO = {
      ...ticket,
      claimedByUserId: null,
      status: TicketStatus.OPEN,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          claimedByUserId: null,
          status: TicketStatus.OPEN,
          lastActivityAt: new Date(),
        },
      });
    } catch (err) {
      logger.warn({ ticketId: ticket.id, err }, 'Failed to persist unclaim in DB, using updated object');
    }

    // Emit audit event
    eventBus.emitAsync('ticket.event', {
      guildId: ticket.guildId,
      eventType: AuditEventType.TICKET_UNCLAIMED,
      action: AuditAction.TICKET_UNCLAIM,
      actorUserId: staffMember.id,
      targetUserId: ticket.creatorUserId,
      channelId: ticket.channelId,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      reason: 'Ticket unclaimed',
    });

    return { success: true, ticket: updated };
  }
}
