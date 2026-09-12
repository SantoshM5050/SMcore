import { Guild, GuildMember, PermissionFlagsBits, TextChannel } from 'discord.js';
import { prisma } from '@smcore/database';
import { AuditAction, AuditEventType } from '@smcore/shared';
import { eventBus } from '../events/eventBus';
import { logger } from '../../utils/logger';
import { TicketChannelService } from './ticketChannelService';
import { TicketClaimService } from './ticketClaimService';
import { TicketDTO } from './ticketTypes';

export class TicketParticipantService {
  /**
   * Adds a user to a ticket channel
   */
  public static async addUser(
    guild: Guild,
    ticket: TicketDTO,
    targetUserId: string,
    executor: GuildMember
  ): Promise<{ success: boolean; error?: string; ticket?: TicketDTO }> {
    const isStaff = await TicketClaimService.isAuthorizedStaff(guild.id, executor);
    const isCreator = executor.id === ticket.creatorUserId;

    if (!isStaff && !isCreator && !executor.permissions.has(PermissionFlagsBits.Administrator)) {
      return { success: false, error: 'You do not have permission to add users to this ticket.' };
    }

    if (targetUserId === ticket.creatorUserId) {
      return { success: false, error: 'The creator is already a participant of this ticket.' };
    }

    if (ticket.participants.includes(targetUserId)) {
      return { success: false, error: 'User is already added to this ticket.' };
    }

    // Update Discord channel overwrites
    const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
    if (channel) {
      try {
        await TicketChannelService.addUser(channel, targetUserId);
      } catch (err) {
        return {
          success: false,
          error: `Failed to update channel permissions: ${(err as Error).message}`,
        };
      }
    }

    const updatedParticipants = [...ticket.participants, targetUserId];
    const updatedTicket: TicketDTO = {
      ...ticket,
      participants: updatedParticipants,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          participants: updatedParticipants,
          lastActivityAt: new Date(),
        },
      });
    } catch (err) {
      logger.warn({ ticketId: ticket.id, err }, 'Failed to persist participant addition to DB');
    }

    // Emit audit event
    eventBus.emitAsync('ticket.event', {
      guildId: guild.id,
      eventType: AuditEventType.TICKET_USER_ADDED,
      action: AuditAction.TICKET_ADD_USER,
      actorUserId: executor.id,
      targetUserId,
      channelId: ticket.channelId,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      reason: `Added by <@${executor.id}>`,
    });

    return { success: true, ticket: updatedTicket };
  }

  /**
   * Removes a user from a ticket channel
   */
  public static async removeUser(
    guild: Guild,
    ticket: TicketDTO,
    targetUserId: string,
    executor: GuildMember
  ): Promise<{ success: boolean; error?: string; ticket?: TicketDTO }> {
    const isStaff = await TicketClaimService.isAuthorizedStaff(guild.id, executor);

    if (!isStaff && !executor.permissions.has(PermissionFlagsBits.Administrator)) {
      return { success: false, error: 'Only authorized support staff can remove users from tickets.' };
    }

    if (targetUserId === ticket.creatorUserId) {
      return { success: false, error: 'Cannot remove the ticket creator from their own ticket.' };
    }

    if (!ticket.participants.includes(targetUserId)) {
      return { success: false, error: 'User is not in the participants list for this ticket.' };
    }

    // Update Discord channel overwrites
    const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
    if (channel) {
      try {
        await TicketChannelService.removeUser(channel, targetUserId);
      } catch (err) {
        logger.warn({ channelId: channel.id, targetUserId, err }, 'Failed to remove channel overwrite');
      }
    }

    const updatedParticipants = ticket.participants.filter((id) => id !== targetUserId);
    const updatedTicket: TicketDTO = {
      ...ticket,
      participants: updatedParticipants,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          participants: updatedParticipants,
          lastActivityAt: new Date(),
        },
      });
    } catch (err) {
      logger.warn({ ticketId: ticket.id, err }, 'Failed to persist participant removal to DB');
    }

    // Emit audit event
    eventBus.emitAsync('ticket.event', {
      guildId: guild.id,
      eventType: AuditEventType.TICKET_USER_REMOVED,
      action: AuditAction.TICKET_REMOVE_USER,
      actorUserId: executor.id,
      targetUserId,
      channelId: ticket.channelId,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      reason: `Removed by <@${executor.id}>`,
    });

    return { success: true, ticket: updatedTicket };
  }
}
