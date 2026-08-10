import { ModalSubmitInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '@repo/database';
import { ApplicationService } from '../services/applicationService';

export async function handleModalInteraction(interaction: ModalSubmitInteraction) {
  const { customId, guildId, user } = interaction;

  if (!guildId) return;

  // 1. Applicant Role Request Modal Submitted
  if (customId.startsWith('role_request_modal_')) {
    const roleId = customId.replace('role_request_modal_', '');

    // Defer reply immediately so Discord modal submit doesn't time out (>3s)
    await interaction.deferReply({ ephemeral: true });

    const inGameName = interaction.fields.getTextInputValue('in_game_name_input');
    const inGameId = interaction.fields.getTextInputValue('in_game_id_input');
    const currentRank = interaction.fields.getTextInputValue('current_rank_input');

    let screenshotUrl: string | null = null;
    try {
      screenshotUrl = interaction.fields.getTextInputValue('screenshot_url_input') || null;
    } catch {
      screenshotUrl = null;
    }

    try {
      const application = await ApplicationService.createApplication({
        guildId,
        userId: user.id,
        userTag: user.tag,
        userAvatar: user.displayAvatarURL(),
        roleId,
        inGameName,
        inGameId,
        currentRank,
        screenshotUrl,
      });

      const successText = `✅ **Role Application Submitted Successfully!**\nYour application **#${application.id.slice(-6).toUpperCase()}** for <@&${roleId}> has been received and sent to staff for review. You will be notified via DM when a decision is made.`;

      return interaction.editReply({
        content: successText,
      });
    } catch (error: any) {
      const errorText = `❌ **Submission Error:** ${error.message}`;
      return interaction.editReply({
        content: errorText,
      });
    }
  }

  // 2. Staff Rejection Reason Modal Submitted
  if (customId.startsWith('rejection_modal_')) {
    const applicationId = customId.replace('rejection_modal_', '');
    const rejectionReason = interaction.fields.getTextInputValue('rejection_reason_input');

    await interaction.deferReply({ ephemeral: true });

    try {
      await ApplicationService.rejectApplication(applicationId, user.id, user.tag, rejectionReason);
      return interaction.editReply({
        content: '❌ Application rejected. The review embed has been updated and the applicant notified.',
      });
    } catch (error: any) {
      return interaction.editReply({
        content: `❌ Failed to reject application: ${error.message}`,
      });
    }
  }

  // 3. Staff Chat Moderation Control Panel Modal Submitted
  if (customId.startsWith('mod_modal_')) {
    const actionType = customId.replace('mod_modal_', '').toUpperCase();
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply({ content: '❌ Guild context missing.' });
    }

    try {
      if (actionType === 'PURGE') {
        const countRaw = interaction.fields.getTextInputValue('count_input');
        const count = Math.min(Math.max(parseInt(countRaw, 10) || 10, 1), 100);
        const channel = interaction.channel as any;

        if (!channel || !('bulkDelete' in channel)) {
          return interaction.editReply({ content: '❌ Cannot purge messages in this channel type.' });
        }

        const deleted = await channel.bulkDelete(count, true);

        const modLog = await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: 'CHANNEL',
            targetUserTag: `#${channel.name}`,
            moderatorId: user.id,
            moderatorTag: user.tag,
            action: 'PURGE',
            count: deleted.size,
          },
        });

        await sendModLogEmbedToChannel(guild, modLog);
        return interaction.editReply({ content: `🧹 Successfully purged **${deleted.size}** messages from #${channel.name}.` });
      }

      const rawTarget = interaction.fields.getTextInputValue('target_user_input') || '';
      const targetUserId = rawTarget.replace(/[<@!>]/g, '').trim();
      let reason: string | null = null;
      try {
        reason = interaction.fields.getTextInputValue('reason_input') || null;
      } catch {
        reason = null;
      }

      if (!targetUserId) {
        return interaction.editReply({ content: '❌ Please enter a valid Target User ID or Mention.' });
      }

      let targetUserTag = targetUserId;
      try {
        const fetchedUser = await interaction.client.users.fetch(targetUserId);
        if (fetchedUser) targetUserTag = fetchedUser.tag;
      } catch {
        // Fallback to ID
      }

      if (actionType === 'BAN') {
        await guild.members.ban(targetUserId, { reason: reason || `Banned by ${user.tag} via Mod Panel` });

        const modLog = await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId,
            targetUserTag,
            moderatorId: user.id,
            moderatorTag: user.tag,
            action: 'BAN',
            reason,
          },
        });

        await sendModLogEmbedToChannel(guild, modLog);
        return interaction.editReply({ content: `✅ Successfully banned member **${targetUserTag}** (${targetUserId}).` });
      }

      if (actionType === 'KICK') {
        const memberToKick = await guild.members.fetch(targetUserId).catch(() => null);
        if (!memberToKick) {
          return interaction.editReply({ content: `❌ Member ${targetUserId} not found in server.` });
        }

        await memberToKick.kick(reason || `Kicked by ${user.tag} via Mod Panel`);

        const modLog = await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId,
            targetUserTag,
            moderatorId: user.id,
            moderatorTag: user.tag,
            action: 'KICK',
            reason,
          },
        });

        await sendModLogEmbedToChannel(guild, modLog);
        return interaction.editReply({ content: `✅ Successfully kicked member **${targetUserTag}** (${targetUserId}).` });
      }

      if (actionType === 'TIMEOUT') {
        const durationRaw = interaction.fields.getTextInputValue('duration_input') || '60';
        const minutes = parseInt(durationRaw, 10) || 60;
        const memberToTimeout = await guild.members.fetch(targetUserId).catch(() => null);

        if (!memberToTimeout) {
          return interaction.editReply({ content: `❌ Member ${targetUserId} not found in server.` });
        }

        await memberToTimeout.timeout(minutes * 60 * 1000, reason || `Timeout by ${user.tag} via Mod Panel`);

        const modLog = await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId,
            targetUserTag,
            moderatorId: user.id,
            moderatorTag: user.tag,
            action: 'TIMEOUT',
            reason,
            durationMinutes: minutes,
          },
        });

        await sendModLogEmbedToChannel(guild, modLog);
        return interaction.editReply({ content: `✅ Successfully timed out member **${targetUserTag}** for **${minutes} minutes**.` });
      }

      if (actionType === 'WARN') {
        const modLog = await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId,
            targetUserTag,
            moderatorId: user.id,
            moderatorTag: user.tag,
            action: 'WARN',
            reason,
          },
        });

        await sendModLogEmbedToChannel(guild, modLog);
        return interaction.editReply({ content: `⚠️ Issued warning to **${targetUserTag}**. Reason: ${reason || 'None specified'}` });
      }
    } catch (err: any) {
      console.error(`[Mod Modal ${actionType} Error]:`, err);
      return interaction.editReply({ content: `❌ Failed to execute action: ${err.message}` });
    }
  }
}

async function sendModLogEmbedToChannel(guild: any, data: any) {
  try {
    const channelConfig = await prisma.channelConfiguration.findUnique({
      where: { guildId: guild.id },
    });
    if (!channelConfig || !channelConfig.modLogChannelId) return;

    const channel = guild.channels.cache.get(channelConfig.modLogChannelId) as any;
    if (!channel || !channel.isTextBased()) return;

    const colorMap: Record<string, number> = {
      BAN: 0xed4245,
      KICK: 0xfee75c,
      TIMEOUT: 0x5865f2,
      WARN: 0xfee75c,
      PURGE: 0x9b59b6,
    };

    const actionEmoji: Record<string, string> = {
      BAN: '🚫 BAN',
      KICK: '🥾 KICK',
      TIMEOUT: '⏱️ TIMEOUT / MUTE',
      WARN: '⚠️ WARN',
      PURGE: '🧹 PURGE MESSAGES',
    };

    const embed = {
      title: `🛡️ Moderation Action - ${actionEmoji[data.action] || data.action}`,
      color: colorMap[data.action] || 0x5865f2,
      fields: [
        { name: 'Target User', value: `${data.targetUserTag} (${data.targetUserId !== 'N/A' && data.targetUserId !== 'CHANNEL' ? `<@${data.targetUserId}>` : data.targetUserId})`, inline: true },
        { name: 'Moderator Staff', value: `@${data.moderatorTag} (<@${data.moderatorId}>)`, inline: true },
        { name: 'Reason', value: data.reason || 'No reason specified', inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'SMCore Moderation System' },
    };

    if (data.durationMinutes) {
      embed.fields.push({ name: 'Duration', value: `${data.durationMinutes} Minutes`, inline: true });
    }
    if (data.count) {
      embed.fields.push({ name: 'Messages Deleted', value: `${data.count} Messages`, inline: true });
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.warn('[ModLog Bot Embed Error]:', err);
  }
}
