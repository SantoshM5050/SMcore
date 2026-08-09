import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ColorResolvable,
  User as DiscordUser,
} from 'discord.js';
import { prisma, EventSignupStatus, ParticipantRoleType } from '@repo/database';
import { botClient } from '../client';

export class EventSignupService {
  /**
   * Build Discord Embed exactly matching user screenshot design
   */
  static buildEventEmbed(
    signup: {
      id: string;
      title: string;
      description?: string | null;
      maxMainTeam: number;
      maxSubstitutes: number;
      embedColor: string;
      status: EventSignupStatus;
      closeAt?: Date | null;
    },
    participants: Array<{
      userId: string;
      userTag: string;
      roleType: ParticipantRoleType;
      joinedAt: Date;
    }>,
    guildName: string = 'Hood Rich'
  ): EmbedBuilder {
    const mainTeam = participants.filter((p) => p.roleType === ParticipantRoleType.MAIN_TEAM);
    const substitutes = participants.filter((p) => p.roleType === ParticipantRoleType.SUBSTITUTE);

    const mainTeamList = mainTeam.length > 0
      ? mainTeam.map((p) => `<@${p.userId}>`).join('\n')
      : 'None';

    const substitutesList = substitutes.length > 0
      ? substitutes.map((p) => `<@${p.userId}>`).join('\n')
      : 'None';

    const isExpired = signup.closeAt ? new Date() >= new Date(signup.closeAt) : false;
    const isClosed = signup.status !== EventSignupStatus.OPEN || isExpired;

    const registrationStatusText = !isClosed
      ? '🟢 Open'
      : '🔒 Closed';

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${signup.title}`)
      .setDescription(signup.description || `Register for ${signup.title}`)
      .setColor((signup.embedColor || '#E74C3C') as ColorResolvable)
      .addFields(
        {
          name: `🔥 Main Team (${mainTeam.length}/${signup.maxMainTeam})`,
          value: mainTeamList,
          inline: false,
        },
        {
          name: '🪑 Substitutes',
          value: substitutesList,
          inline: false,
        },
        {
          name: '📌 Registration',
          value: registrationStatusText,
          inline: false,
        }
      )
      .setFooter({ text: `${guildName} • Signup System` });

    return embed;
  }

  /**
   * Build Join and Leave Buttons
   */
  static buildEventButtons(signupId: string, status: EventSignupStatus) {
    const isClosed = status !== EventSignupStatus.OPEN;

    const joinBtn = new ButtonBuilder()
      .setCustomId(`event_signup_join_${signupId}`)
      .setLabel('Join')
      .setStyle(ButtonStyle.Success)
      .setDisabled(isClosed);

    const leaveBtn = new ButtonBuilder()
      .setCustomId(`event_signup_leave_${signupId}`)
      .setLabel('Leave')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isClosed);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(joinBtn, leaveBtn);
  }

  /**
   * Post or Update Event Panel Embed in Discord
   */
  static async sendOrUpdateEventEmbed(signupId: string) {
    const signup = await prisma.eventSignup.findUnique({
      where: { id: signupId },
      include: {
        participants: {
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!signup) {
      throw new Error(`Event signup ${signupId} not found`);
    }

    const guild = await botClient.guilds.fetch(signup.guildId).catch(() => null);
    if (!guild) {
      throw new Error(`Guild ${signup.guildId} not found or bot not in guild`);
    }

    const channel = (await guild.channels.fetch(signup.channelId).catch(() => null)) as TextChannel;
    if (!channel || !channel.isTextBased()) {
      throw new Error(`Channel ${signup.channelId} is invalid or not text-based`);
    }

    const embed = this.buildEventEmbed(signup, signup.participants, guild.name);
    const actionRow = this.buildEventButtons(signup.id, signup.status);

    let message;
    if (signup.messageId) {
      const existingMsg = await channel.messages.fetch(signup.messageId).catch(() => null);
      if (existingMsg) {
        message = await existingMsg.edit({ embeds: [embed], components: [actionRow] });
      }
    }

    if (!message) {
      let pingContent: string | undefined = undefined;
      const pingRoleId = (signup as any)?.pingRoleId;
      if (pingRoleId) {
        if (pingRoleId === 'everyone' || pingRoleId === '@everyone') pingContent = '@everyone';
        else if (pingRoleId === 'here' || pingRoleId === '@here') pingContent = '@here';
        else pingContent = `<@&${pingRoleId}>`;
      }

      message = await channel.send({ content: pingContent, embeds: [embed], components: [actionRow] });
      await prisma.eventSignup.update({
        where: { id: signup.id },
        data: { messageId: message.id },
      });
    }

    return message;
  }

  /**
   * User clicks Join button
   */
  static async joinEvent(signupId: string, user: DiscordUser) {
    const signup = await prisma.eventSignup.findUnique({
      where: { id: signupId },
      include: {
        participants: {
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!signup) {
      return { success: false, message: 'Event signup not found.' };
    }

    if (signup.status !== EventSignupStatus.OPEN) {
      return { success: false, message: 'Registration for this event is currently closed.' };
    }

    const existing = signup.participants.find((p) => p.userId === user.id);
    if (existing) {
      return {
        success: false,
        message: existing.roleType === ParticipantRoleType.MAIN_TEAM
          ? 'You are already registered in the Main Team!'
          : 'You are already registered in the Substitutes list!',
      };
    }

    const mainCount = signup.participants.filter((p) => p.roleType === ParticipantRoleType.MAIN_TEAM).length;
    const subCount = signup.participants.filter((p) => p.roleType === ParticipantRoleType.SUBSTITUTE).length;

    let roleType: ParticipantRoleType;

    if (mainCount < signup.maxMainTeam) {
      roleType = ParticipantRoleType.MAIN_TEAM;
    } else if (subCount < signup.maxSubstitutes) {
      roleType = ParticipantRoleType.SUBSTITUTE;
    } else {
      return {
        success: false,
        message: `All slots are full! Main Team (${signup.maxMainTeam}/${signup.maxMainTeam}) and Substitutes (${signup.maxSubstitutes}/${signup.maxSubstitutes}) are at capacity.`,
      };
    }

    await prisma.eventParticipant.create({
      data: {
        eventSignupId: signup.id,
        userId: user.id,
        userTag: user.tag || user.username,
        userAvatar: user.displayAvatarURL() || null,
        roleType,
      },
    });

    // Refresh Discord embed
    await this.sendOrUpdateEventEmbed(signup.id).catch((err) => {
      console.error('Failed to update event embed after join:', err);
    });

    return {
      success: true,
      message: roleType === ParticipantRoleType.MAIN_TEAM
        ? '🎉 You have successfully registered for the Main Team!'
        : '🪑 Main Team was full. You have been placed in the Substitutes list!',
    };
  }

  /**
   * User clicks Leave button
   */
  static async leaveEvent(signupId: string, userId: string) {
    const signup = await prisma.eventSignup.findUnique({
      where: { id: signupId },
      include: {
        participants: {
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!signup) {
      return { success: false, message: 'Event signup not found.' };
    }

    const participant = signup.participants.find((p) => p.userId === userId);
    if (!participant) {
      return { success: false, message: 'You are not currently registered for this event.' };
    }

    const wasMainTeam = participant.roleType === ParticipantRoleType.MAIN_TEAM;

    // Remove user
    await prisma.eventParticipant.delete({
      where: { id: participant.id },
    });

    let promotedUserId: string | null = null;

    // If main team member left, auto-promote 1st substitute
    if (wasMainTeam) {
      const firstSub = signup.participants.find(
        (p) => p.roleType === ParticipantRoleType.SUBSTITUTE && p.userId !== userId
      );

      if (firstSub) {
        await prisma.eventParticipant.update({
          where: { id: firstSub.id },
          data: { roleType: ParticipantRoleType.MAIN_TEAM },
        });
        promotedUserId = firstSub.userId;
      }
    }

    // Refresh Discord embed
    await this.sendOrUpdateEventEmbed(signup.id).catch((err) => {
      console.error('Failed to update event embed after leave:', err);
    });

    return {
      success: true,
      message: promotedUserId
        ? `You left the event. <@${promotedUserId}> was automatically promoted from Substitutes to Main Team!`
        : 'You have left the event signup.',
    };
  }
}
