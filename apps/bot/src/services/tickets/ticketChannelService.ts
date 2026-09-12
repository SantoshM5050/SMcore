import {
  ChannelType,
  Guild,
  OverwriteResolvable,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { logger } from '../../utils/logger';

export class TicketChannelService {
  /**
   * Creates a private Discord text channel for a ticket with strict permission gating
   */
  public static async createChannel(
    guild: Guild,
    ticketNumber: number,
    creatorUserId: string,
    supportRoleIds: string[] = [],
    parentCategoryId?: string | null
  ): Promise<TextChannel> {
    const channelName = `ticket-${String(ticketNumber).padStart(4, '0')}`;

    const permissionOverwrites: OverwriteResolvable[] = [
      // Deny @everyone
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
      // Allow Ticket Creator
      {
        id: creatorUserId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

    // Allow each configured Support Role
    for (const roleId of supportRoleIds) {
      if (roleId && guild.roles.cache.has(roleId)) {
        permissionOverwrites.push({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        });
      }
    }

    // Allow Bot Client
    if (guild.members.me) {
      permissionOverwrites.push({
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      });
    }

    // Validate parent category channel if provided
    let parent: string | undefined = undefined;
    if (parentCategoryId) {
      const cat = guild.channels.cache.get(parentCategoryId);
      if (cat && cat.type === ChannelType.GuildCategory) {
        parent = cat.id;
      }
    }

    try {
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent,
        permissionOverwrites,
        topic: `SMCore Ticket #${ticketNumber} | Creator: <@${creatorUserId}>`,
      });

      logger.info(
        { guildId: guild.id, channelId: channel.id, ticketNumber },
        'Created private ticket Discord channel'
      );
      return channel;
    } catch (err) {
      logger.error(
        { guildId: guild.id, ticketNumber, err },
        'Failed to create Discord ticket channel'
      );
      throw new Error(`Discord API error creating ticket channel: ${(err as Error).message}`);
    }
  }

  /**
   * Locks the ticket channel for the creator when closed
   */
  public static async lockChannel(
    channel: TextChannel,
    creatorUserId: string
  ): Promise<void> {
    try {
      await channel.permissionOverwrites.edit(creatorUserId, {
        SendMessages: false,
      });

      const closedName = channel.name.startsWith('ticket-')
        ? channel.name.replace('ticket-', 'closed-')
        : `closed-${channel.name}`;

      await channel.setName(closedName).catch(() => null);
    } catch (err) {
      logger.warn({ channelId: channel.id, err }, 'Failed to lock ticket channel overwrites');
    }
  }

  /**
   * Unlocks the ticket channel for the creator when reopened
   */
  public static async unlockChannel(
    channel: TextChannel,
    creatorUserId: string
  ): Promise<void> {
    try {
      await channel.permissionOverwrites.edit(creatorUserId, {
        ViewChannel: true,
        SendMessages: true,
      });

      const openName = channel.name.startsWith('closed-')
        ? channel.name.replace('closed-', 'ticket-')
        : channel.name;

      await channel.setName(openName).catch(() => null);
    } catch (err) {
      logger.warn({ channelId: channel.id, err }, 'Failed to unlock ticket channel overwrites');
    }
  }

  /**
   * Adds a user to the ticket channel
   */
  public static async addUser(
    channel: TextChannel,
    userId: string
  ): Promise<void> {
    try {
      await channel.permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true,
      });
    } catch (err) {
      logger.error({ channelId: channel.id, userId, err }, 'Failed to add user to channel');
      throw err;
    }
  }

  /**
   * Removes a user from the ticket channel
   */
  public static async removeUser(
    channel: TextChannel,
    userId: string
  ): Promise<void> {
    try {
      await channel.permissionOverwrites.delete(userId);
    } catch (err) {
      logger.error({ channelId: channel.id, userId, err }, 'Failed to remove user from channel');
      throw err;
    }
  }

  /**
   * Deletes a ticket channel
   */
  public static async deleteChannel(
    channel: TextChannel,
    reason?: string
  ): Promise<void> {
    try {
      await channel.delete(reason || 'SMCore ticket deleted');
    } catch (err) {
      logger.error({ channelId: channel.id, err }, 'Failed to delete Discord channel');
      throw err;
    }
  }
}
