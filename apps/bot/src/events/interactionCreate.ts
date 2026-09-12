import { Client, Events, Interaction, EmbedBuilder } from 'discord.js';
import { commands } from '../commands';
import { THEME_COLORS } from '@smcore/shared';
import { logger } from '../utils/logger';

export function registerInteractionEvent(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

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
  });
}
