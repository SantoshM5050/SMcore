import { ModalSubmitInteraction, EmbedBuilder } from 'discord.js';
import { prisma, PromotionActionType } from '@repo/database';
import { ApplicationService } from '../services/applicationService';
import { PromotionService } from '../services/promotionService';

export async function handleModalInteraction(interaction: ModalSubmitInteraction) {
  const { customId, guildId, user } = interaction;

  if (!guildId) return;

  // 1. Applicant Role Request Modal Submitted
  if (customId.startsWith('role_request_modal_')) {
    const roleId = customId.replace('role_request_modal_', '');

    // If modal came from a message component (Select Menu), defer update so we edit the original ephemeral message in-place
    if (interaction.isFromMessage()) {
      await interaction.deferUpdate();
    } else {
      await interaction.deferReply({ ephemeral: true });
    }

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
        components: [],
      });
    } catch (error: any) {
      const errorText = `❌ **Submission Error:** ${error.message}`;
      return interaction.editReply({
        content: errorText,
        components: [],
      });
    }
  }

  // 1.5 Grand RP Promotion / Demotion / Left Form Submitted
  if (customId.startsWith('promotion_modal_submit')) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply({ content: '❌ Guild context missing.' });
    }

    let actionType: PromotionActionType = PromotionActionType.PROMOTION;
    if (customId.endsWith('_DEMOTION')) {
      actionType = PromotionActionType.DEMOTION;
    } else if (customId.endsWith('_LEFT_FAMILY')) {
      actionType = PromotionActionType.LEFT_FAMILY;
    }

    const inGameName = interaction.fields.getTextInputValue('in_game_name_input');
    const inGameId = interaction.fields.getTextInputValue('in_game_id_input');

    let discordUserRaw = '';
    try {
      discordUserRaw = interaction.fields.getTextInputValue('discord_user_input');
    } catch {
      discordUserRaw = inGameId;
    }

    let prevRankRaw = '';
    try {
      prevRankRaw = interaction.fields.getTextInputValue('previous_rank_input') || '';
    } catch {
      prevRankRaw = '';
    }

    let newRankRaw = '';
    try {
      newRankRaw = interaction.fields.getTextInputValue('new_rank_input') || '';
    } catch {
      newRankRaw = '';
    }

    let reason = 'No reason specified';
    try {
      reason = interaction.fields.getTextInputValue('reason_input') || 'No reason specified';
    } catch {
      reason = 'No reason specified';
    }

    // Parse Discord User ID if user pasted mention (<@123...>) or raw ID
    let matchedUserId = discordUserRaw.match(/[0-9]{17,20}/)?.[0];
    if (!matchedUserId) {
      // Try searching member by username or display name
      const cleanUserTag = discordUserRaw.replace(/^@/, '').trim().toLowerCase();
      const memberMatch = guild.members.cache.find(
        (m) => m.user.username.toLowerCase() === cleanUserTag || m.displayName.toLowerCase() === cleanUserTag
      );
      if (memberMatch) {
        matchedUserId = memberMatch.id;
      } else {
        matchedUserId = user.id; // Fallback to submitter
      }
    }

    // Attempt resolving roles from input
    let previousRoleId: string | null = null;
    let newRoleId: string | null = null;

    if (prevRankRaw) {
      const cleanPrev = prevRankRaw.replace(/[<@&>]/g, '').trim();
      const roleMatch = guild.roles.cache.find(
        (r) => r.id === cleanPrev || r.name.toLowerCase() === prevRankRaw.toLowerCase().trim()
      );
      if (roleMatch) previousRoleId = roleMatch.id;
    }

    if (newRankRaw && actionType !== PromotionActionType.LEFT_FAMILY) {
      const cleanNew = newRankRaw.replace(/[<@&>]/g, '').trim();
      const roleMatch = guild.roles.cache.find(
        (r) => r.id === cleanNew || r.name.toLowerCase() === newRankRaw.toLowerCase().trim()
      );
      if (roleMatch) newRoleId = roleMatch.id;
    }

    try {
      const result = await PromotionService.executeAction(guild, {
        guildId,
        targetUserId: matchedUserId,
        inGameName,
        inGameId,
        actionType,
        previousRoleId,
        newRoleId,
        reason,
        executedById: user.id,
        executedByTag: user.tag,
      });

      const titleTextMap: Record<string, string> = {
        PROMOTION: '📈 Member Promotion Processed',
        DEMOTION: '📉 Member Demotion Processed',
        LEFT_FAMILY: '🚪 Left Family Action Processed',
      };

      const embed = new EmbedBuilder()
        .setTitle(`✅ ${titleTextMap[actionType] || 'Form Processed'}`)
        .setColor(
          actionType === PromotionActionType.PROMOTION
            ? '#2ecc71'
            : actionType === PromotionActionType.DEMOTION
            ? '#e74c3c'
            : '#95a5a6'
        )
        .addFields(
          { name: 'Name', value: `\`${inGameName}\``, inline: true },
          { name: 'In-Game ID', value: `\`${inGameId}\``, inline: true },
          { name: 'Discord Member', value: `<@${matchedUserId}>`, inline: true },
          { name: 'Action', value: `\`${actionType}\``, inline: true },
          { name: 'Role Swap Status', value: result.roleSwapMessage, inline: false },
          { name: 'Reason', value: reason, inline: false }
        )
        .setFooter({ text: 'Log saved & sent to designated log channel.' });

      return interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      return interaction.editReply({ content: `❌ Error submitting promotion form: ${err.message}` });
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

        let targetChanInput = '';
        try {
          targetChanInput = interaction.fields.getTextInputValue('target_channel_input') || '';
        } catch {
          targetChanInput = '';
        }

        const cleanChanId = targetChanInput.replace(/[<#@!>]/g, '').trim();
        let channel = interaction.channel as any;

        if (cleanChanId) {
          // Try finding by ID
          let fetchedChan = await guild.channels.fetch(cleanChanId).catch(() => null);

          // Try finding by channel name (e.g. "general" or "#general")
          if (!fetchedChan) {
            const nameSearch = cleanChanId.toLowerCase().replace('#', '');
            fetchedChan = guild.channels.cache.find(
              (c: any) => c.name && c.name.toLowerCase() === nameSearch
            ) || null;
          }

          if (fetchedChan && fetchedChan.isTextBased()) {
            channel = fetchedChan;
          }
        }

        if (!channel || !('bulkDelete' in channel)) {
          return interaction.editReply({ content: '❌ Cannot purge messages in this channel.' });
        }

        const deleted = await channel.bulkDelete(count, true);

        const modLog = await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: 'CHANNEL',
            targetUserTag: `#${channel.name || 'channel'}`,
            moderatorId: user.id,
            moderatorTag: user.tag,
            action: 'PURGE',
            count: deleted.size,
          },
        });

        await sendModLogEmbedToChannel(guild, modLog);
        return interaction.editReply({ content: `🧹 Successfully purged **${deleted.size}** messages from #${channel.name || 'channel'}.` });
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
