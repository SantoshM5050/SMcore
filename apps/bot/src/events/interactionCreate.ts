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
  } catch (error: any) {
    console.error('[Interaction] Unhandled interaction error:', error);
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
