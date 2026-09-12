import { Client, Events, GuildMember, Interaction, EmbedBuilder } from 'discord.js';
import { commands } from '../commands';
import { THEME_COLORS } from '@smcore/shared';
import { logger } from '../utils/logger';
import { TicketService } from '../services/tickets/ticketService';
import { TicketClaimService } from '../services/tickets/ticketClaimService';

export function registerInteractionEvent(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    // 1. Slash Command Handling
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) {
        logger.warn({ commandName: interaction.commandName }, 'Command handler not found');
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error: any) {
        logger.error(
          {
            err: error,
            command: interaction.commandName,
            user: interaction.user.tag,
            guildId: interaction.guildId,
          },
          'Unhandled error executing slash command'
        );

        const errorEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.DANGER as any)
          .setTitle('❌ Command Execution Error')
          .setDescription(
            'An unexpected error occurred while executing this command. The issue has been recorded.'
          )
          .setTimestamp();

        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [errorEmbed] });
          } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
        } catch (replyError) {
          logger.error({ err: replyError }, 'Failed to deliver error message to Discord user');
        }
      }
      return;
    }

    // 2. Ticket Component Buttons
    if (interaction.isButton()) {
      const { customId, guild, member } = interaction;
      if (!guild || !(member instanceof GuildMember)) return;

      try {
        if (customId === 'ticket_panel_create_btn') {
          await interaction.deferReply({ ephemeral: true });
          const res = await TicketService.createTicket(guild, member.id);
          if (!res.success || !res.channel) {
            await interaction.editReply({ content: `❌ ${res.error}` });
          } else {
            await interaction.editReply({ content: `✅ Ticket opened: <#${res.channel.id}>` });
          }
          return;
        }

        if (customId.startsWith('ticket_claim_')) {
          const ticket = await TicketService.getTicketByChannel(interaction.channelId);
          if (!ticket) {
            await interaction.reply({ content: 'Ticket not found.', ephemeral: true });
            return;
          }
          const res = await TicketClaimService.claimTicket(ticket, member);
          if (!res.success) {
            await interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
          } else {
            await interaction.reply({ content: `🛡️ <@${member.id}> has claimed this ticket.` });
          }
          return;
        }

        if (customId.startsWith('ticket_close_')) {
          await interaction.deferReply();
          const res = await TicketService.closeTicket(guild, interaction.channelId, member);
          if (!res.success) {
            await interaction.editReply({ content: `❌ ${res.error}` });
          } else {
            await interaction.editReply({ content: '🔒 Ticket closed.' });
          }
          return;
        }

        if (customId.startsWith('ticket_reopen_')) {
          await interaction.deferReply();
          const res = await TicketService.reopenTicket(guild, interaction.channelId, member);
          if (!res.success) {
            await interaction.editReply({ content: `❌ ${res.error}` });
          } else {
            await interaction.editReply({ content: '🔓 Ticket reopened.' });
          }
          return;
        }

        if (customId.startsWith('ticket_delete_')) {
          await interaction.deferReply({ ephemeral: true });
          const res = await TicketService.deleteTicket(guild, interaction.channelId, member);
          if (!res.success) {
            await interaction.editReply({ content: `❌ ${res.error}` });
          }
          return;
        }
      } catch (btnErr) {
        logger.error({ customId, err: btnErr }, 'Error handling ticket button');
      }
      return;
    }

    // 3. Ticket Category Select Menu
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_panel_category_select') {
      const { guild, member, values } = interaction;
      if (!guild || !(member instanceof GuildMember)) return;

      const categoryId = values[0]?.replace('cat_', '');
      await interaction.deferReply({ ephemeral: true });

      const res = await TicketService.createTicket(guild, member.id, { categoryId });
      if (!res.success || !res.channel) {
        await interaction.editReply({ content: `❌ ${res.error}` });
      } else {
        await interaction.editReply({ content: `✅ Ticket opened: <#${res.channel.id}>` });
      }
      return;
    }
  });
}
