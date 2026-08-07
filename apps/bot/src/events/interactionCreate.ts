import { Interaction } from 'discord.js';
import { handleButtonInteraction } from '../handlers/buttonHandler';
import { handleSelectMenuInteraction } from '../handlers/selectMenuHandler';
import { handleModalInteraction } from '../handlers/modalHandler';

export async function onInteractionCreate(interaction: Interaction) {
  try {
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalInteraction(interaction);
    }
  } catch (error) {
    console.error('Unhandled interaction error:', error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An unexpected internal error occurred while processing your request.',
        ephemeral: true,
      });
    }
  }
}
