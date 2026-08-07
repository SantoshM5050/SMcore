import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ColorResolvable,
} from 'discord.js';
import { prisma, ApplicationStatus } from '@repo/database';
import { botClient } from '../client';

export class EmbedService {
  /**
   * Render and deploy/update the Request Panel Embed in Discord
   */
  static async deployOrUpdatePanel(guildId: string, channelId: string, embedConfigId?: string) {
    const guild = await botClient.guilds.fetch(guildId);
    const channel = (await guild.channels.fetch(channelId)) as TextChannel;

    if (!channel || !channel.isTextBased()) {
      throw new Error('Target channel is invalid or not text-based');
    }

    let config = await prisma.embedConfig.findFirst({
      where: { guildId, ...(embedConfigId ? { id: embedConfigId } : {}) },
    });

    if (!config) {
      config = await prisma.embedConfig.create({
        data: {
          guildId,
          title: '🎮 Gaming Role Verification Request',
          description: 'Click below to apply for official rank roles! Select your target role and fill out your in-game credentials.',
          footerText: 'Powered by Nexus',
          colorHex: '#5865F2',
          buttonLabel: 'Apply for Role',
          buttonEmoji: '🎮',
        },
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(config.title)
      .setDescription(config.description)
      .setColor((config.colorHex || '#5865F2') as ColorResolvable);

    if (config.footerText) {
      embed.setFooter({
        text: config.footerText,
        iconURL: config.footerIconUrl || undefined,
      });
    }

    if (config.thumbnailUrl) {
      embed.setThumbnail(config.thumbnailUrl);
    }

    if (config.imageUrl) {
      embed.setImage(config.imageUrl);
    }

    const applyButton = new ButtonBuilder()
      .setCustomId('role_request_apply_btn')
      .setLabel(config.buttonLabel || 'Apply for Role')
      .setStyle(ButtonStyle.Primary);

    if (config.buttonEmoji) {
      applyButton.setEmoji(config.buttonEmoji);
    }

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(applyButton);

    let message;
    if (config.messageId && config.channelId === channelId) {
      const existingMessage = await channel.messages.fetch(config.messageId).catch(() => null);
      if (existingMessage) {
        message = await existingMessage.edit({ embeds: [embed], components: [actionRow] });
      }
    }

    if (!message) {
      message = await channel.send({ embeds: [embed], components: [actionRow] });
    }

    // Save message location to DB
    await prisma.embedConfig.update({
      where: { id: config.id },
      data: {
        channelId: channel.id,
        messageId: message.id,
      },
    });

    // Also update ChannelConfiguration requestChannelId
    await prisma.channelConfiguration.upsert({
      where: { guildId },
      update: { requestChannelId: channel.id },
      create: { guildId, requestChannelId: channel.id },
    });

    return message;
  }

  /**
   * Render the Review Embed for Staff Review Channel
   */
  static buildReviewEmbed(application: {
    id: string;
    userId: string;
    userTag: string;
    userAvatar?: string | null;
    roleName: string;
    inGameName: string;
    inGameId: string;
    currentRank: string;
    screenshotUrl?: string | null;
    status: ApplicationStatus;
    rejectionReason?: string | null;
    reviewerTag?: string | null;
    createdAt: Date;
  }) {
    const statusColors: Record<ApplicationStatus, ColorResolvable> = {
      PENDING: '#FEE75C',
      APPROVED: '#57F287',
      REJECTED: '#ED4245',
    };

    const statusBadge: Record<ApplicationStatus, string> = {
      PENDING: '⏳ PENDING REVIEW',
      APPROVED: '✅ APPROVED',
      REJECTED: '❌ REJECTED',
    };

    const embed = new EmbedBuilder()
      .setTitle(`📋 Application #${application.id.slice(-6)} - ${statusBadge[application.status]}`)
      .setColor(statusColors[application.status])
      .addFields(
        { name: 'Discord User', value: `<@${application.userId}> (\`${application.userTag}\`)`, inline: true },
        { name: 'User ID', value: `\`${application.userId}\``, inline: true },
        { name: 'Requested Role', value: `**${application.roleName}**`, inline: true },
        { name: 'In-Game Name', value: `\`${application.inGameName}\``, inline: true },
        { name: 'In-Game ID / Tag', value: `\`${application.inGameId}\``, inline: true },
        { name: 'In-Game Level', value: `\`${application.currentRank}\``, inline: true },
        { name: 'Submitted At', value: `<t:${Math.floor(new Date(application.createdAt).getTime() / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: `Powered by Nexus • Application ID: ${application.id}` })
      .setTimestamp();

    if (application.userAvatar) {
      embed.setThumbnail(application.userAvatar);
    }

    if (application.screenshotUrl) {
      embed.setImage(application.screenshotUrl);
      embed.addFields({ name: 'Screenshot Proof', value: `[View Image](${application.screenshotUrl})`, inline: false });
    }

    if (application.status === ApplicationStatus.APPROVED) {
      embed.addFields({
        name: 'Review Verdict',
        value: `Approved by **${application.reviewerTag || 'Staff'}**`,
      });
    } else if (application.status === ApplicationStatus.REJECTED) {
      embed.addFields({
        name: 'Review Verdict',
        value: `Rejected by **${application.reviewerTag || 'Staff'}**\n**Reason:** ${application.rejectionReason || 'No reason provided'}`,
      });
    }

    return embed;
  }

  /**
   * Build action buttons (Approve / Reject) for Review Embed
   */
  static buildReviewButtons(applicationId: string, status: ApplicationStatus) {
    if (status !== ApplicationStatus.PENDING) {
      return []; // No buttons if application is already resolved
    }

    const approveBtn = new ButtonBuilder()
      .setCustomId(`app_approve_${applicationId}`)
      .setLabel('Approve')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success);

    const rejectBtn = new ButtonBuilder()
      .setCustomId(`app_reject_${applicationId}`)
      .setLabel('Reject')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger);

    return [new ActionRowBuilder<ButtonBuilder>().addComponents(approveBtn, rejectBtn)];
  }
}
