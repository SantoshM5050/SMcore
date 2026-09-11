import {
  ButtonInteraction,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const { customId, guildId } = interaction;

  if (!guildId) {
    return interaction.reply({ content: 'Commands & interactions can only be used within a Discord server.', ephemeral: true });
  }

  // --- MODERATION PANEL BUTTON CLICKS ---
  if (customId.startsWith('mod_panel_')) {
    const actionType = customId.replace('mod_panel_', '');

    if (actionType === 'purge') {
      const modal = new ModalBuilder()
        .setCustomId('mod_modal_purge')
        .setTitle('Purge Channel Messages');

      const countInput = new TextInputBuilder()
        .setCustomId('count_input')
        .setLabel('Number of Messages to Delete (1-100)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('10')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(countInput)
      );
      return interaction.showModal(modal);
    }

    const titles: Record<string, string> = {
      ban: 'Ban Server Member',
      kick: 'Kick Server Member',
      timeout: 'Timeout / Mute Server Member',
      warn: 'Issue Warning to Member',
    };

    const modal = new ModalBuilder()
      .setCustomId(`mod_modal_${actionType}`)
      .setTitle(titles[actionType] || 'Moderation Action');

    const targetInput = new TextInputBuilder()
      .setCustomId('target_user_input')
      .setLabel('Target User (@Mention, Username, or ID)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. @User or 1280178101326708856')
      .setRequired(true);

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason_input')
      .setLabel('Moderation Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter reason for this action...')
      .setRequired(false);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput));

    if (actionType === 'timeout') {
      const durationInput = new TextInputBuilder()
        .setCustomId('duration_input')
        .setLabel('Duration in Minutes (e.g. 10, 60, 1440)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('60')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput));
    }

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
    return interaction.showModal(modal);
  }
}
