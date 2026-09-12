import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
} from 'discord.js';
import { TicketCategoryService } from '../services/tickets/ticketCategoryService';
import { TicketClaimService } from '../services/tickets/ticketClaimService';
import { TicketConfigService } from '../services/tickets/ticketConfigService';
import { TicketParticipantService } from '../services/tickets/ticketParticipantService';
import { TicketService } from '../services/tickets/ticketService';
import { CommandHandler } from './moderationCommands';

export const ticketCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('SMCore Premium Ticketing System commands')
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Configure ticket system settings')
        .addChannelOption((opt) =>
          opt
            .setName('category')
            .setDescription('Discord Category to create tickets in')
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addChannelOption((opt) =>
          opt
            .setName('logs')
            .setDescription('Channel for ticket transcripts and audit logs')
            .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption((opt) =>
          opt.setName('support_role').setDescription('Support staff role for tickets')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Send a ticket creation panel into this channel')
        .addStringOption((opt) =>
          opt.setName('title').setDescription('Panel title')
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Panel description instructions')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Open a new support ticket')
        .addStringOption((opt) =>
          opt.setName('subject').setDescription('Brief summary of your inquiry')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Reason for closing')
        )
    )
    .addSubcommand((sub) =>
      sub.setName('reopen').setDescription('Reopen the closed ticket')
    )
    .addSubcommand((sub) =>
      sub.setName('claim').setDescription('Claim this ticket as support staff')
    )
    .addSubcommand((sub) =>
      sub.setName('unclaim').setDescription('Unclaim this ticket')
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a user to this ticket channel')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('The user to add').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a user from this ticket channel')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('The user to remove').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('rename')
        .setDescription('Rename the ticket channel')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('New channel name').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('info').setDescription('View metadata for this ticket')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !(interaction.member instanceof GuildMember)) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const member = interaction.member;

    switch (subcommand) {
      case 'setup': {
        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'You need Manage Server permissions to configure tickets.', ephemeral: true });
          return;
        }

        const category = interaction.options.getChannel('category');
        const logs = interaction.options.getChannel('logs');
        const role = interaction.options.getRole('support_role');

        const updateData: any = {};
        if (category) updateData.ticketCategoryChannelId = category.id;
        if (logs) updateData.transcriptChannelId = logs.id;
        if (role) updateData.supportRoleIds = [role.id];

        await TicketConfigService.updateSettings(guild.id, updateData);

        const embed = new EmbedBuilder()
          .setTitle('Ticket System Configuration Updated')
          .setColor(0x4edea3)
          .setDescription('Guild ticketing settings have been saved.')
          .addFields(
            { name: 'Ticket Category', value: category ? `<#${category.id}>` : 'Unchanged', inline: true },
            { name: 'Transcript Channel', value: logs ? `<#${logs.id}>` : 'Unchanged', inline: true },
            { name: 'Support Role', value: role ? `<@&${role.id}>` : 'Unchanged', inline: true }
          );

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'panel': {
        if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await interaction.reply({ content: 'You need Manage Channels permissions to send a ticket panel.', ephemeral: true });
          return;
        }

        const title = interaction.options.getString('title') || 'Support & Assistance';
        const desc =
          interaction.options.getString('description') ||
          'Need assistance with our services? Click the button below or select a category to create a private support ticket.';

        const categories = await TicketCategoryService.getCategories(guild.id);

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(desc)
          .setColor(0x8083ff)
          .setFooter({ text: 'SMCore Precision Ticketing Engine' })
          .setTimestamp();

        const targetChannel = interaction.channel;
        if (!targetChannel || !('send' in targetChannel)) {
          await interaction.reply({ content: 'Cannot send ticket panel in this channel type.', ephemeral: true });
          return;
        }

        if (categories.length > 1) {
          // Multiple categories: render select menu
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_panel_category_select')
            .setPlaceholder('Select a support category...')
            .addOptions(
              categories.map((c) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(c.name)
                  .setDescription(c.description || 'Open a ticket in this category')
                  .setValue(`cat_${c.id}`)
                  .setEmoji(c.emoji || '📁')
              )
            );

          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
          await targetChannel.send({ embeds: [embed], components: [row] });
        } else {
          // Single or default: render button
          const button = new ButtonBuilder()
            .setCustomId('ticket_panel_create_btn')
            .setLabel('Create Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫');

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
          await targetChannel.send({ embeds: [embed], components: [row] });
        }

        await interaction.reply({ content: 'Ticket panel dispatched successfully.', ephemeral: true });
        break;
      }

      case 'create': {
        await interaction.deferReply({ ephemeral: true });
        const subject = interaction.options.getString('subject') || undefined;

        const result = await TicketService.createTicket(guild, member.id, { subject });
        if (!result.success || !result.channel) {
          await interaction.editReply({ content: `❌ Could not create ticket: ${result.error}` });
          return;
        }

        await interaction.editReply({
          content: `✅ Your ticket has been created: <#${result.channel.id}>`,
        });
        break;
      }

      case 'close': {
        const channelId = interaction.channelId;
        const reason = interaction.options.getString('reason') || undefined;
        await interaction.deferReply();

        const result = await TicketService.closeTicket(guild, channelId, member, { reason });
        if (!result.success) {
          await interaction.editReply({ content: `❌ ${result.error}` });
          return;
        }

        await interaction.editReply({ content: '🔒 Ticket has been closed and archived.' });
        break;
      }

      case 'reopen': {
        const channelId = interaction.channelId;
        await interaction.deferReply();

        const result = await TicketService.reopenTicket(guild, channelId, member);
        if (!result.success) {
          await interaction.editReply({ content: `❌ ${result.error}` });
          return;
        }

        await interaction.editReply({ content: '🔓 Ticket has been reopened.' });
        break;
      }

      case 'claim': {
        const ticket = await TicketService.getTicketByChannel(interaction.channelId);
        if (!ticket) {
          await interaction.reply({ content: 'This channel is not a ticket.', ephemeral: true });
          return;
        }

        const result = await TicketClaimService.claimTicket(ticket, member);
        if (!result.success) {
          await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
          return;
        }

        await interaction.reply({
          content: `🛡️ <@${member.id}> has claimed this ticket.`,
        });
        break;
      }

      case 'unclaim': {
        const ticket = await TicketService.getTicketByChannel(interaction.channelId);
        if (!ticket) {
          await interaction.reply({ content: 'This channel is not a ticket.', ephemeral: true });
          return;
        }

        const result = await TicketClaimService.unclaimTicket(ticket, member);
        if (!result.success) {
          await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
          return;
        }

        await interaction.reply({
          content: 'Ticket has been unclaimed and is now open for any support staff.',
        });
        break;
      }

      case 'add': {
        const targetUser = interaction.options.getUser('user', true);
        const ticket = await TicketService.getTicketByChannel(interaction.channelId);
        if (!ticket) {
          await interaction.reply({ content: 'This channel is not a ticket.', ephemeral: true });
          return;
        }

        const result = await TicketParticipantService.addUser(guild, ticket, targetUser.id, member);
        if (!result.success) {
          await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
          return;
        }

        await interaction.reply({ content: `✅ Added <@${targetUser.id}> to this ticket.` });
        break;
      }

      case 'remove': {
        const targetUser = interaction.options.getUser('user', true);
        const ticket = await TicketService.getTicketByChannel(interaction.channelId);
        if (!ticket) {
          await interaction.reply({ content: 'This channel is not a ticket.', ephemeral: true });
          return;
        }

        const result = await TicketParticipantService.removeUser(guild, ticket, targetUser.id, member);
        if (!result.success) {
          await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
          return;
        }

        await interaction.reply({ content: `✅ Removed <@${targetUser.id}> from this ticket.` });
        break;
      }

      case 'rename': {
        const newName = interaction.options.getString('name', true);
        const result = await TicketService.renameTicket(guild, interaction.channelId, newName, member);
        if (!result.success) {
          await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
          return;
        }

        await interaction.reply({ content: `✅ Ticket channel renamed to \`${newName}\`.` });
        break;
      }

      case 'info': {
        const ticket = await TicketService.getTicketByChannel(interaction.channelId);
        if (!ticket) {
          await interaction.reply({ content: 'This channel is not a ticket.', ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle(`Ticket #${ticket.ticketNumber} Information`)
          .setColor(0x8083ff)
          .addFields(
            { name: 'Creator', value: `<@${ticket.creatorUserId}>`, inline: true },
            { name: 'Status', value: ticket.status, inline: true },
            { name: 'Claimed By', value: ticket.claimedByUserId ? `<@${ticket.claimedByUserId}>` : 'Unclaimed', inline: true },
            { name: 'Subject', value: ticket.subject || 'None', inline: true },
            {
              name: 'Participants',
              value: ticket.participants.length > 0 ? ticket.participants.map((id) => `<@${id}>`).join(', ') : 'None',
              inline: false,
            },
            { name: 'Opened At', value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:R>`, inline: true }
          )
          .setFooter({ text: `Ticket ID: ${ticket.id}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  },
};
