import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import { prisma, EventSignupStatus } from '@repo/database';
import { EventSignupService } from '../services/eventSignupService';

export async function handleSlashCommandInteraction(interaction: ChatInputCommandInteraction) {
  const { commandName, guildId, memberPermissions } = interaction;

  if (!guildId) {
    return interaction.reply({ content: '❌ Commands can only be used inside a Discord server.', ephemeral: true });
  }

  // Check admin/manage guild permissions for setup commands
  const isAdmin = memberPermissions?.has(PermissionFlagsBits.Administrator) || memberPermissions?.has(PermissionFlagsBits.ManageGuild);

  if (commandName === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('⚡ SMCore Discord Bot - Setup & Commands')
      .setDescription('Aap bot ko bina dashboard open kiye bhi Discord Slash Commands se setup & manage kar sakte hain!')
      .setColor('#9900FF')
      .addFields(
        {
          name: '🛡️ Role Request Setup',
          value: '`/setup-roles role:@Role title:"Custom Title"`\nCreates a Role Request embed with an interactive modal button for users to submit in-game credentials.',
        },
        {
          name: '🏆 Event / Scrim Signup Setup',
          value: '`/setup-event title:"Informal 8PM" main_slots:10 sub_slots:5`\nCreates & posts an Event Signup embed directly into the channel.',
        },
        {
          name: '⚙️ Server Settings',
          value: '`/settings`\nDisplays the current bot configuration, review channels, and dashboard link.',
        },
        {
          name: '🌐 Web Dashboard',
          value: '[Click here to open SMCore Web Dashboard](https://smcore.onrender.com) for full advanced configuration.',
        }
      )
      .setFooter({ text: 'SMCore Discord Bot • Command Line & Dashboard' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (commandName === 'settings') {
    const [settings, channelConfig] = await Promise.all([
      prisma.guildSettings.findUnique({ where: { guildId } }),
      prisma.channelConfiguration.findUnique({ where: { guildId } }),
    ]);

    const embed = new EmbedBuilder()
      .setTitle('⚙️ SMCore Server Settings')
      .setColor('#5865F2')
      .addFields(
        { name: 'Staff Review Channel', value: channelConfig?.reviewChannelId ? `<#${channelConfig.reviewChannelId}>` : '❌ Not Configured', inline: true },
        { name: 'Audit Logs Channel', value: channelConfig?.logsChannelId ? `<#${channelConfig.logsChannelId}>` : '❌ Not Configured', inline: true },
        { name: 'Application Cooldown', value: `${settings?.cooldownMinutes || 0} Minutes`, inline: true },
        { name: 'One Pending Restriction', value: settings?.onePendingOnly !== false ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Staff Review Ping', value: settings?.reviewPingRoleId ? (settings.reviewPingRoleId.startsWith('@') ? settings.reviewPingRoleId : `<@&${settings.reviewPingRoleId}>`) : 'None', inline: true }
      )
      .setFooter({ text: 'Use /setup-roles or /setup-event to deploy embeds in chat' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (commandName === 'setup-roles') {
    if (!isAdmin) {
      return interaction.reply({ content: '❌ You need Administrator or Manage Server permission to run setup commands.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('role', true);
    const title = interaction.options.getString('title') || `Request ${role.name} Role`;
    const description = interaction.options.getString('description') || `Click the button below to submit your in-game details & request the @${role.name} role!`;
    const channel = (interaction.options.getChannel('channel') || interaction.channel) as any;

    // Create or update requestable role in DB
    const requestable = await prisma.roleConfiguration.upsert({
      where: {
        guildId_roleId: {
          guildId,
          roleId: role.id,
        },
      },
      update: {
        roleName: role.name,
        isRequestable: true,
        enabled: true,
      },
      create: {
        guildId,
        roleId: role.id,
        roleName: role.name,
        isRequestable: true,
        enabled: true,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ ${title}`)
      .setDescription(description)
      .setColor('#3498DB')
      .addFields(
        { name: 'Target Role', value: `<@&${role.id}>`, inline: true },
        { name: 'Form Requirements', value: '🎮 In-Game Name & ID', inline: true }
      )
      .setFooter({ text: 'SMCore • Official Role Request Form' });

    const button = new ButtonBuilder()
      .setCustomId(`role_request_${requestable.id}`)
      .setLabel(`Apply for @${role.name}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📋');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.editReply({
      content: `✅ Role Request embed successfully deployed in ${channel} for role <@&${role.id}>!`,
    });
  }

  if (commandName === 'setup-event') {
    if (!isAdmin) {
      return interaction.reply({ content: '❌ You need Administrator or Manage Server permission to run setup commands.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString('title', true);
    const mainSlots = interaction.options.getInteger('main_slots') || 10;
    const subSlots = interaction.options.getInteger('sub_slots') || 5;
    const autoCloseMinutes = interaction.options.getInteger('auto_close_mins') || 30;
    const channel = (interaction.options.getChannel('channel') || interaction.channel) as any;

    const event = await prisma.eventSignup.create({
      data: {
        guildId,
        title,
        description: `Register for ${title}`,
        maxMainTeam: mainSlots,
        maxSubstitutes: subSlots,
        channelId: channel.id,
        embedColor: '#9900FF',
        autoCloseMinutes,
        status: EventSignupStatus.OPEN,
        lastPostedAt: new Date(),
        closeAt: new Date(Date.now() + autoCloseMinutes * 60 * 1000),
        createdBy: interaction.user.id,
      },
    });

    await EventSignupService.sendOrUpdateEventEmbed(event.id, { forceNewMessage: true });

    return interaction.editReply({
      content: `✅ Event Signup "${title}" created & posted in ${channel}! Slots: ${mainSlots} Main + ${subSlots} Subs.`,
    });
  }

  // --- MODERATION COMMAND HANDLERS ---
  if (['ban', 'kick', 'timeout', 'warn', 'purge'].includes(commandName)) {
    if (!isAdmin) {
      return interaction.reply({ content: '❌ You need Administrator or Moderation permissions to run this command.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      if (commandName === 'ban') {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || `Banned by ${interaction.user.tag} via /ban command`;

        await interaction.guild?.members.ban(user.id, { reason });

        await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: user.id,
            targetUserTag: user.tag,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            action: 'BAN',
            reason,
          },
        });

        return interaction.editReply({ content: `✅ Successfully banned **${user.tag}** (${user.id}). Reason: ${reason}` });
      }

      if (commandName === 'kick') {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || `Kicked by ${interaction.user.tag} via /kick command`;
        const memberToKick = await interaction.guild?.members.fetch(user.id).catch(() => null);

        if (!memberToKick) {
          return interaction.editReply({ content: `❌ Member ${user.tag} not found in this server.` });
        }

        await memberToKick.kick(reason);

        await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: user.id,
            targetUserTag: user.tag,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            action: 'KICK',
            reason,
          },
        });

        return interaction.editReply({ content: `✅ Successfully kicked **${user.tag}** (${user.id}). Reason: ${reason}` });
      }

      if (commandName === 'timeout') {
        const user = interaction.options.getUser('user', true);
        const minutes = interaction.options.getInteger('minutes', true);
        const reason = interaction.options.getString('reason') || `Timeout by ${interaction.user.tag} for ${minutes}m`;
        const memberToTimeout = await interaction.guild?.members.fetch(user.id).catch(() => null);

        if (!memberToTimeout) {
          return interaction.editReply({ content: `❌ Member ${user.tag} not found in this server.` });
        }

        await memberToTimeout.timeout(minutes * 60 * 1000, reason);

        await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: user.id,
            targetUserTag: user.tag,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            action: 'TIMEOUT',
            reason,
            durationMinutes: minutes,
          },
        });

        return interaction.editReply({ content: `✅ Successfully timed out **${user.tag}** for **${minutes} minutes**. Reason: ${reason}` });
      }

      if (commandName === 'warn') {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);

        await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: user.id,
            targetUserTag: user.tag,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            action: 'WARN',
            reason,
          },
        });

        return interaction.editReply({ content: `⚠️ Issued formal warning to **${user.tag}**. Reason: ${reason}` });
      }

      if (commandName === 'purge') {
        const count = Math.min(Math.max(interaction.options.getInteger('count', true), 1), 100);
        const channel = interaction.channel as any;

        if (!channel || !('bulkDelete' in channel)) {
          return interaction.editReply({ content: '❌ Cannot purge messages in this channel type.' });
        }

        const deleted = await channel.bulkDelete(count, true);

        await prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: 'CHANNEL',
            targetUserTag: `#${channel.name}`,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            action: 'PURGE',
            count: deleted.size,
          },
        });

        return interaction.editReply({ content: `🧹 Successfully purged **${deleted.size}** messages from #${channel.name}.` });
      }
    } catch (err: any) {
      console.error(`[SlashCommand ${commandName} Error]:`, err);
      return interaction.editReply({ content: `❌ Failed to execute /${commandName}: ${err.message}` });
    }
  }
}
