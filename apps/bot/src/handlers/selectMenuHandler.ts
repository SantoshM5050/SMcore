import {
  AnySelectMenuInteraction,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export async function handleSelectMenuInteraction(interaction: AnySelectMenuInteraction) {
  const { customId, values, guildId } = interaction;

  // 2. Promotion / Demotion / Left Family - STEP 1: Member Selected from Dropdown
  if (customId.startsWith('promo_select_user_')) {
    const actionType = customId.replace('promo_select_user_', ''); // PROMOTION | DEMOTION | LEFT_FAMILY
    const selectedUserId = values[0];
    if (!selectedUserId) return;

    if (actionType === 'LEFT_FAMILY') {
      // For Left Family, no rank role selection needed. Show Modal directly.
      const modal = new ModalBuilder()
        .setCustomId(`promotion_modal_submit_LEFT_FAMILY_${selectedUserId}_NONE`)
        .setTitle('Grand RP Member Left Family Form');

      const nameInput = new TextInputBuilder()
        .setCustomId('in_game_name_input')
        .setLabel('Name (In-Game Name)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Akash Varma')
        .setRequired(true);

      const igIdInput = new TextInputBuilder()
        .setCustomId('in_game_id_input')
        .setLabel('In-Game ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 123456')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('reason_input')
        .setLabel('Reason for Leaving / Kick')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Explain why member left or was kicked from family...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(igIdInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );

      return interaction.showModal(modal);
    }

    // For Promotion or Demotion: STEP 2 - Ask staff to select the New Rank Role via RoleSelectMenu
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(`promo_select_role_${actionType}_${selectedUserId}`)
      .setPlaceholder(`Select New Rank Role for this ${actionType.toLowerCase()}...`);

    const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect);

    return interaction.reply({
      content: `📌 **Step 2 of 2:** Select the **New Rank Role** for member <@${selectedUserId}> below:`,
      components: [row],
      ephemeral: true,
    });
  }

  // 2.5. Promotion / Demotion - STEP 2: Role Selected from RoleSelectMenu
  if (customId.startsWith('promo_select_role_')) {
    const parts = customId.split('_'); // ['promo', 'select', 'role', 'PROMOTION', '123456789']
    const actionType = parts[3]; // PROMOTION | DEMOTION
    const targetUserId = parts[4];
    const selectedRoleId = values[0];
    if (!targetUserId || !selectedRoleId) return;

    const modal = new ModalBuilder()
      .setCustomId(`promotion_modal_submit_${actionType}_${targetUserId}_${selectedRoleId}`)
      .setTitle(`Grand RP ${actionType === 'PROMOTION' ? 'Promotion' : 'Demotion'} Form`);

    const nameInput = new TextInputBuilder()
      .setCustomId('in_game_name_input')
      .setLabel('Name (In-Game Name)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Akash Varma')
      .setRequired(true);

    const igIdInput = new TextInputBuilder()
      .setCustomId('in_game_id_input')
      .setLabel('In-Game ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 123456')
      .setRequired(true);

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason_input')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Reason for rank update...')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(igIdInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    return interaction.showModal(modal);
  }

  // 3. Moderation Panel Member Selected from Dropdown
  if (customId.startsWith('mod_select_user_')) {
    const actionType = customId.replace('mod_select_user_', ''); // ban | kick | timeout | warn
    const selectedUserId = values[0];
    if (!selectedUserId) return;

    const titles: Record<string, string> = {
      ban: 'Ban Server Member',
      kick: 'Kick Server Member',
      timeout: 'Timeout / Mute Server Member',
      warn: 'Issue Warning to Member',
    };

    const modal = new ModalBuilder()
      .setCustomId(`mod_modal_submit_${actionType}_${selectedUserId}`)
      .setTitle(titles[actionType] || 'Execute Moderation Action');

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason_input')
      .setLabel('Moderation Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter reason for this action...')
      .setRequired(false);

    if (actionType === 'timeout') {
      const durationInput = new TextInputBuilder()
        .setCustomId('duration_input')
        .setLabel('Duration in Minutes (e.g. 10, 60, 1440)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('60')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );
    } else {
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
    }

    return interaction.showModal(modal);
  }
}
