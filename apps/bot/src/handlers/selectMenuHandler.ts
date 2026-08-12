import {
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { prisma } from '@repo/database';

export async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
  const { customId, values, guildId } = interaction;

  if (customId === 'role_request_select_role') {
    const selectedRoleId = values[0];
    if (!selectedRoleId || !guildId) return;

    // Fetch guild settings for screenshot requirement
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    const isScreenshotRequired = settings?.screenshotRequired === true;
    const isScreenshotAllowed = settings?.screenshotAllowed !== false;

    // Build Step 2 Modal
    const modal = new ModalBuilder()
      .setCustomId(`role_request_modal_${selectedRoleId}`)
      .setTitle('Role Request Credentials');

    const ignInput = new TextInputBuilder()
      .setCustomId('in_game_name_input')
      .setLabel('In-Game Name (IGN)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., ProGamer99')
      .setRequired(true)
      .setMaxLength(50);

    const igidInput = new TextInputBuilder()
      .setCustomId('in_game_id_input')
      .setLabel('In-Game ID / Tag / Player Hash')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., ProGamer99#NA1 or 94820148')
      .setRequired(true)
      .setMaxLength(50);

    const rankInput = new TextInputBuilder()
      .setCustomId('current_rank_input')
      .setLabel('In-Game Level')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., Level 50 / Level 100')
      .setRequired(true)
      .setMaxLength(50);

    const rows = [
      new ActionRowBuilder<TextInputBuilder>().addComponents(ignInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(igidInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(rankInput),
    ];

    if (isScreenshotAllowed) {
      const screenshotInput = new TextInputBuilder()
        .setCustomId('screenshot_url_input')
        .setLabel('Screenshot Proof URL')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Direct image link (https://imgur.com/...)')
        .setRequired(isScreenshotRequired)
        .setMaxLength(250);

      rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(screenshotInput));
    }

    modal.addComponents(rows);

    await interaction.showModal(modal);
  }
}
