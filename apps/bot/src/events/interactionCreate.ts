import { Interaction } from 'discord.js';
import { SlashCommandHandler } from '../handlers/slashCommandHandler';
import { logger } from '../logger';

export async function onInteractionCreate(interaction: Interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      await SlashCommandHandler.handle(interaction);
    }
  } catch (error: any) {
    logger.error({ err: error?.message }, '[Interaction] Unhandled interaction error');
    if (interaction.isRepliable()) {
      const message = `❌ An error occurred: ${error?.message || 'Internal server error'}`;
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
      }
    }
  }
}
