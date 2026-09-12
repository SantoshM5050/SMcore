import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { prisma } from '@smcore/database';
import { AuditAction, AuditEventType, TicketStatus } from '@smcore/shared';
import { eventBus } from '../events/eventBus';
import { logger } from '../../utils/logger';
import { TicketCategoryService } from './ticketCategoryService';
import { TicketChannelService } from './ticketChannelService';
import { TicketClaimService } from './ticketClaimService';
import { TicketConfigService } from './ticketConfigService';
import { TicketTranscriptService } from './ticketTranscriptService';
import {
  CloseTicketOptions,
  CreateTicketOptions,
  TicketDTO,
} from './ticketTypes';

export class TicketService {
  private static memoryTickets = new Map<string, TicketDTO>();
  private static userLastTicketCreatedAt = new Map<string, number>(); // key: `${guildId}:${userId}`
  private static numberLocks = new Map<string, number>();

  /**
   * Concurrency-safe sequential ticket numbering per guild
   */
  public static async getNextTicketNumber(guildId: string): Promise<number> {
    try {
      const agg = await prisma.ticket.aggregate({
        where: { guildId },
        _max: { ticketNumber: true },
      });
      const maxNum = agg._max.ticketNumber || 0;
      const lockedMax = this.numberLocks.get(guildId) || 0;
      const next = Math.max(maxNum, lockedMax) + 1;
      this.numberLocks.set(guildId, next);
      return next;
    } catch {
      // In-memory fallback
      let maxNum = 0;
      for (const t of this.memoryTickets.values()) {
        if (t.guildId === guildId && t.ticketNumber > maxNum) {
          maxNum = t.ticketNumber;
        }
      }
      const lockedMax = this.numberLocks.get(guildId) || 0;
      const next = Math.max(maxNum, lockedMax) + 1;
      this.numberLocks.set(guildId, next);
      return next;
    }
  }

  /**
   * Validates creation rate limits and max open tickets per user
   */
  public static async canUserCreateTicket(
    guildId: string,
    userId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const settings = await TicketConfigService.getSettings(guildId);

    if (!settings.enabled) {
      return { allowed: false, reason: 'The ticket system is currently disabled on this server.' };
    }

    // Check cooldown
    const cooldownKey = `${guildId}:${userId}`;
    const lastCreated = this.userLastTicketCreatedAt.get(cooldownKey);
    if (lastCreated && settings.cooldownSeconds > 0) {
      const elapsedSeconds = Math.floor((Date.now() - lastCreated) / 1000);
      if (elapsedSeconds < settings.cooldownSeconds) {
        const remaining = settings.cooldownSeconds - elapsedSeconds;
        return {
          allowed: false,
          reason: `Please wait ${remaining} more second(s) before opening another ticket.`,
        };
      }
    }

    // Check open ticket count
    let openCount = 0;
    try {
      openCount = await prisma.ticket.count({
        where: {
          guildId,
          creatorUserId: userId,
          status: { in: [TicketStatus.OPEN, TicketStatus.CLAIMED, TicketStatus.REOPENED] },
        },
      });
    } catch {
      const seenTicketIds = new Set<string>();
      for (const t of this.memoryTickets.values()) {
        if (
          !seenTicketIds.has(t.id) &&
          t.guildId === guildId &&
          t.creatorUserId === userId &&
          [TicketStatus.OPEN, TicketStatus.CLAIMED, TicketStatus.REOPENED].includes(t.status)
        ) {
          seenTicketIds.add(t.id);
          openCount++;
        }
      }
    }

    if (openCount >= settings.maxOpenTicketsPerUser) {
      return {
        allowed: false,
        reason: `You have reached the limit of ${settings.maxOpenTicketsPerUser} open ticket(s) on this server.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Creates a new ticket: provisions Discord channel, saves DB record, and posts control panel
   */
  public static async createTicket(
    guild: Guild,
    creatorUserId: string,
    options: CreateTicketOptions = {}
  ): Promise<{ success: boolean; error?: string; ticket?: TicketDTO; channel?: TextChannel }> {
    const limitCheck = await this.canUserCreateTicket(guild.id, creatorUserId);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.reason };
    }

    const settings = await TicketConfigService.getSettings(guild.id);
    let category = options.categoryId
      ? await TicketCategoryService.getCategory(guild.id, options.categoryId)
      : null;

    // Determine parent category channel
    const parentCatId = category?.categoryChannelId || settings.ticketCategoryChannelId || undefined;

    // Combine global support roles with category-specific support role
    const combinedSupportRoles = [...settings.supportRoleIds];
    if (category?.supportRoleId && !combinedSupportRoles.includes(category.supportRoleId)) {
      combinedSupportRoles.push(category.supportRoleId);
    }

    const ticketNumber = await this.getNextTicketNumber(guild.id);

    // Provision Discord channel
    let channel: TextChannel;
    try {
      channel = await TicketChannelService.createChannel(
        guild,
        ticketNumber,
        creatorUserId,
        combinedSupportRoles,
        parentCatId
      );
    } catch (err) {
      return { success: false, error: `Failed to create ticket channel: ${(err as Error).message}` };
    }

    // Persist ticket in database
    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ticketRecord: TicketDTO = {
      id: ticketId,
      guildId: guild.id,
      channelId: channel.id,
      ticketNumber,
      categoryId: category?.id || null,
      creatorUserId,
      claimedByUserId: null,
      status: TicketStatus.OPEN,
      subject: options.subject || category?.name || 'General Support',
      closedByUserId: null,
      closedAt: null,
      lastActivityAt: new Date(),
      participants: [],
      transcriptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const created = await prisma.ticket.create({
        data: {
          id: ticketId,
          guildId: guild.id,
          channelId: channel.id,
          ticketNumber,
          categoryId: category?.id || null,
          creatorUserId,
          status: TicketStatus.OPEN,
          subject: ticketRecord.subject,
          participants: [],
        },
      });
      ticketRecord.id = created.id;
    } catch (err) {
      logger.warn({ ticketNumber, err }, 'Failed to persist ticket to DB, stored in memory cache');
    }

    this.memoryTickets.set(channel.id, ticketRecord);
    this.memoryTickets.set(ticketRecord.id, ticketRecord);
    this.userLastTicketCreatedAt.set(`${guild.id}:${creatorUserId}`, Date.now());

    // Send control embed in ticket channel
    try {
      const welcomeEmbed = new EmbedBuilder()
        .setTitle(`Support Ticket #${ticketNumber}`)
        .setDescription(
          `Welcome <@${creatorUserId}>! Our support staff has been notified.\nPlease describe your issue in detail.`
        )
        .addFields(
          { name: 'Category', value: category?.name ? `${category.emoji || '📁'} ${category.name}` : 'General', inline: true },
          { name: 'Status', value: '🟢 Open', inline: true },
          { name: 'Subject', value: ticketRecord.subject || 'None', inline: true }
        )
        .setColor(0x8083ff)
        .setTimestamp()
        .setFooter({ text: 'SMCore Precision Support Engine' });

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticketRecord.id}`)
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🛡️'),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketRecord.id}`)
          .setLabel('Close')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );

      await channel.send({
        content: `<@${creatorUserId}>`,
        embeds: [welcomeEmbed],
        components: [actionRow],
      });
    } catch (err) {
      logger.warn({ channelId: channel.id, err }, 'Failed to send initial control message in ticket channel');
    }

    // Emit audit event
    eventBus.emitAsync('ticket.event', {
      guildId: guild.id,
      eventType: AuditEventType.TICKET_CREATED,
      action: AuditAction.TICKET_CREATE,
      actorUserId: creatorUserId,
      targetUserId: creatorUserId,
      channelId: channel.id,
      ticketId: ticketRecord.id,
      ticketNumber,
      reason: options.subject || 'Ticket created',
      metadata: {
        categoryId: category?.id,
        categoryName: category?.name,
      },
    });

    return { success: true, ticket: ticketRecord, channel };
  }

  /**
   * Retrieves ticket by channel ID or ticket ID
   */
  public static async getTicketByChannel(channelId: string): Promise<TicketDTO | null> {
    const memory = this.memoryTickets.get(channelId);
    if (memory) return memory;

    try {
      const record = await prisma.ticket.findFirst({
        where: { channelId },
      });
      if (record) {
        const dto: TicketDTO = {
          ...record,
          status: record.status as any,
          participants: record.participants || [],
          metadata: record.metadata as any,
        };
        this.memoryTickets.set(channelId, dto);
        return dto;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Closes a ticket
   */
  public static async closeTicket(
    guild: Guild,
    channelId: string,
    closerMember: GuildMember,
    options: CloseTicketOptions = {}
  ): Promise<{ success: boolean; error?: string; ticket?: TicketDTO }> {
    const ticket = await this.getTicketByChannel(channelId);
    if (!ticket) {
      return { success: false, error: 'This channel is not an active ticket channel.' };
    }

    if (ticket.status === TicketStatus.CLOSED) {
      return { success: false, error: 'This ticket is already closed.' };
    }

    const settings = await TicketConfigService.getSettings(guild.id);
    const isStaff = await TicketClaimService.isAuthorizedStaff(guild.id, closerMember);
    const isCreator = closerMember.id === ticket.creatorUserId;

    if (!settings.allowUserClose && isCreator && !isStaff) {
      return { success: false, error: 'User-initiated ticket closure is disabled on this server.' };
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;

    // Generate transcript if enabled
    if (settings.transcriptEnabled && channel) {
      try {
        const transcript = await TicketTranscriptService.generateTranscript(channel, ticket, {
          actorUserId: closerMember.id,
        });

        if (settings.transcriptChannelId) {
          const tChannel = guild.channels.cache.get(settings.transcriptChannelId) as TextChannel | undefined;
          if (tChannel) {
            await TicketTranscriptService.deliverTranscript(tChannel, ticket, transcript);
          }
        }
      } catch (err) {
        logger.warn({ channelId, err }, 'Failed to deliver transcript during ticket close');
      }
    }

    // Lock channel permissions
    if (channel) {
      await TicketChannelService.lockChannel(channel, ticket.creatorUserId);
    }

    const updated: TicketDTO = {
      ...ticket,
      status: TicketStatus.CLOSED,
      closedByUserId: closerMember.id,
      closedAt: new Date(),
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.CLOSED,
          closedByUserId: closerMember.id,
          closedAt: updated.closedAt,
          lastActivityAt: new Date(),
        },
      });
    } catch (err) {
      logger.warn({ ticketId: ticket.id, err }, 'Failed to update ticket close in DB');
    }

    this.memoryTickets.set(channelId, updated);
    this.memoryTickets.set(ticket.id, updated);

    // Send close banner in ticket channel with Reopen and Delete actions
    if (channel) {
      try {
        const closedEmbed = new EmbedBuilder()
          .setTitle(`Ticket #${ticket.ticketNumber} Closed`)
          .setDescription(`Closed by <@${closerMember.id}>.\nReason: ${options.reason || 'Issue resolved'}`)
          .setColor(0x93000a)
          .setTimestamp();

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_reopen_${ticket.id}`)
            .setLabel('Reopen Ticket')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔓'),
          new ButtonBuilder()
            .setCustomId(`ticket_delete_${ticket.id}`)
            .setLabel('Delete Channel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
        );

        await channel.send({ embeds: [closedEmbed], components: [actionRow] });
      } catch (err) {
        logger.warn({ channelId, err }, 'Failed to send close notice in ticket channel');
      }
    }

    // Emit audit event
    eventBus.emitAsync('ticket.event', {
      guildId: guild.id,
      eventType: AuditEventType.TICKET_CLOSED,
      action: AuditAction.TICKET_CLOSE,
      actorUserId: closerMember.id,
      targetUserId: ticket.creatorUserId,
      channelId,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      reason: options.reason || 'Ticket closed',
    });

    return { success: true, ticket: updated };
  }

  /**
   * Reopens a closed ticket
   */
  public static async reopenTicket(
    guild: Guild,
    channelId: string,
    reopenerMember: GuildMember
  ): Promise<{ success: boolean; error?: string; ticket?: TicketDTO }> {
    const ticket = await this.getTicketByChannel(channelId);
    if (!ticket) {
      return { success: false, error: 'Ticket record not found.' };
    }

    if (ticket.status !== TicketStatus.CLOSED) {
      return { success: false, error: 'This ticket is not closed.' };
    }

    const settings = await TicketConfigService.getSettings(guild.id);
    if (!settings.allowReopen) {
      return { success: false, error: 'Ticket reopening is disabled on this server.' };
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (channel) {
      await TicketChannelService.unlockChannel(channel, ticket.creatorUserId);
    }

    const updated: TicketDTO = {
      ...ticket,
      status: TicketStatus.REOPENED,
      closedByUserId: null,
      closedAt: null,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.REOPENED,
          closedByUserId: null,
          closedAt: null,
          lastActivityAt: new Date(),
        },
      });
    } catch (err) {
      logger.warn({ ticketId: ticket.id, err }, 'Failed to persist ticket reopen in DB');
    }

    this.memoryTickets.set(channelId, updated);
    this.memoryTickets.set(ticket.id, updated);

    if (channel) {
      try {
        const reopenEmbed = new EmbedBuilder()
          .setTitle(`Ticket #${ticket.ticketNumber} Reopened`)
          .setDescription(`Reopened by <@${reopenerMember.id}>. Channel access has been restored.`)
          .setColor(0x4edea3)
          .setTimestamp();

        await channel.send({ embeds: [reopenEmbed] });
      } catch (err) {
        logger.warn({ channelId, err }, 'Failed to send reopen notice');
      }
    }

    // Emit audit event
    eventBus.emitAsync('ticket.event', {
      guildId: guild.id,
      eventType: AuditEventType.TICKET_REOPENED,
      action: AuditAction.TICKET_REOPEN,
      actorUserId: reopenerMember.id,
      targetUserId: ticket.creatorUserId,
      channelId,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      reason: 'Ticket reopened',
    });

    return { success: true, ticket: updated };
  }

  /**
   * Deletes a ticket Discord channel while preserving database history
   */
  public static async deleteTicket(
    guild: Guild,
    channelId: string,
    executorMember: GuildMember
  ): Promise<{ success: boolean; error?: string }> {
    const ticket = await this.getTicketByChannel(channelId);
    const isStaff = await TicketClaimService.isAuthorizedStaff(guild.id, executorMember);

    if (!isStaff && !executorMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return { success: false, error: 'Only authorized support staff can delete tickets.' };
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (channel) {
      try {
        await TicketChannelService.deleteChannel(channel, `Deleted by ${executorMember.user.tag}`);
      } catch (err) {
        return { success: false, error: `Failed to delete Discord channel: ${(err as Error).message}` };
      }
    }

    if (ticket) {
      eventBus.emitAsync('ticket.event', {
        guildId: guild.id,
        eventType: AuditEventType.TICKET_DELETED,
        action: AuditAction.TICKET_DELETE,
        actorUserId: executorMember.id,
        targetUserId: ticket.creatorUserId,
        channelId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        reason: 'Ticket channel deleted',
      });
    }

    return { success: true };
  }

  /**
   * Renames a ticket channel
   */
  public static async renameTicket(
    guild: Guild,
    channelId: string,
    newName: string,
    executorMember: GuildMember
  ): Promise<{ success: boolean; error?: string }> {
    const isStaff = await TicketClaimService.isAuthorizedStaff(guild.id, executorMember);
    if (!isStaff && !executorMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return { success: false, error: 'Only authorized staff can rename ticket channels.' };
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      return { success: false, error: 'Channel not found.' };
    }

    try {
      await channel.setName(newName);
      return { success: true };
    } catch (err) {
      return { success: false, error: `Failed to rename channel: ${(err as Error).message}` };
    }
  }

  /**
   * Clears memory store (for testing)
   */
  public static clearMemory(): void {
    this.memoryTickets.clear();
    this.userLastTicketCreatedAt.clear();
    this.numberLocks.clear();
  }
}
