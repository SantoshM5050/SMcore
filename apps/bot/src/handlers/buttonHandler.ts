import {
  ButtonInteraction,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ApplicationService } from '../services/applicationService';
import { RoleService } from '../services/roleService';
import { EventSignupService } from '../services/eventSignupService';
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const { customId, guildId, user, member } = interaction;

  if (!guildId) {
    return interaction.reply({ content: 'Role requests & event signups can only be used within a Discord server.', ephemeral: true });
  }

  // Event Signup Join Button
  if (customId.startsWith('event_signup_join_')) {
    const signupId = customId.replace('event_signup_join_', '');
    await interaction.deferReply({ ephemeral: true });
    const result = await EventSignupService.joinEvent(signupId, user);
    return interaction.editReply({ content: result.message });
  }

  // Grand RP Promotion Button Clicked
  if (customId === 'promo_btn_promotion' || customId === 'promo_demotion_form_btn') {
    const modal = new ModalBuilder()
      .setCustomId('promotion_modal_submit_PROMOTION')
      .setTitle('Grand RP Member Promotion Form');

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

    const discordUserInput = new TextInputBuilder()
      .setCustomId('discord_user_input')
      .setLabel('Discord User (@Mention, Username, or ID)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. @Akash or 1280178101326708856')
      .setRequired(true);

    const prevRankInput = new TextInputBuilder()
      .setCustomId('previous_rank_input')
      .setLabel('Previous Rank (Number e.g. 5, or Name)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 5 or Fighter (Optional)')
      .setRequired(false);

    const newRankInput = new TextInputBuilder()
      .setCustomId('new_rank_input')
      .setLabel('New Rank (Number e.g. 6, or Name)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 6 or Underboss')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(igIdInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(discordUserInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(prevRankInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(newRankInput)
    );

    return interaction.showModal(modal);
  }

  // Grand RP Demotion Button Clicked
  if (customId === 'promo_btn_demotion') {
    const modal = new ModalBuilder()
      .setCustomId('promotion_modal_submit_DEMOTION')
      .setTitle('Grand RP Member Demotion Form');

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

    const discordUserInput = new TextInputBuilder()
      .setCustomId('discord_user_input')
      .setLabel('Discord User (@Mention, Username, or ID)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. @Akash or 1280178101326708856')
      .setRequired(true);

    const prevRankInput = new TextInputBuilder()
      .setCustomId('previous_rank_input')
      .setLabel('Previous Rank (Number e.g. 6, or Name)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 6 or Underboss (Optional)')
      .setRequired(false);

    const newRankInput = new TextInputBuilder()
      .setCustomId('new_rank_input')
      .setLabel('New Rank (Number e.g. 5, or Name)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 5 or Fighter')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(igIdInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(discordUserInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(prevRankInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(newRankInput)
    );

    return interaction.showModal(modal);
  }

  // Grand RP Left Family Button Clicked
  if (customId === 'promo_btn_left') {
    const modal = new ModalBuilder()
      .setCustomId('promotion_modal_submit_LEFT_FAMILY')
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

    const discordUserInput = new TextInputBuilder()
      .setCustomId('discord_user_input')
      .setLabel('Discord User (@Mention, Username, or ID)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. @Akash or 1280178101326708856')
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
      new ActionRowBuilder<TextInputBuilder>().addComponents(discordUserInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    return interaction.showModal(modal);
  }

  // Event Signup Leave Button
  if (customId.startsWith('event_signup_leave_')) {
    const signupId = customId.replace('event_signup_leave_', '');
    await interaction.deferReply({ ephemeral: true });
    const result = await EventSignupService.leaveEvent(signupId, user.id);
    return interaction.editReply({ content: result.message });
  }

  // 1. Panel "Apply for Role" Clicked
  if (customId === 'role_request_apply_btn') {
    // Check eligibility
    const eligibility = await ApplicationService.checkEligibility(guildId, user.id);
    if (!eligibility.eligible) {
      return interaction.reply({ content: `❌ ${eligibility.reason}`, ephemeral: true });
    }

    // Fetch requestable roles from DB
    const roles = await RoleService.getRequestableRoles(guildId);
    if (roles.length === 0) {
      return interaction.reply({
        content: '⚠️ No requestable roles have been configured for this server yet. Please inform an administrator.',
        ephemeral: true,
      });
    }

    // Extract member's current role IDs
    const userRoleIds = new Set<string>();
    if (member && 'roles' in member) {
      if (Array.isArray(member.roles)) {
        member.roles.forEach((r: any) => userRoleIds.add(String(r)));
      } else if (member.roles && typeof (member.roles as any).cache !== 'undefined') {
        (member.roles as any).cache.forEach((_: any, roleId: string) => userRoleIds.add(roleId));
      }
    }

    // Filter out roles user already possesses
    const availableRoles = roles.filter((role) => !userRoleIds.has(role.roleId));

    if (availableRoles.length === 0) {
      return interaction.reply({
        content: '⚠️ You already possess all requestable roles available in this server!',
        ephemeral: true,
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('role_request_select_role')
      .setPlaceholder('Select the rank role you want to apply for...');

    availableRoles.forEach((role) => {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(role.roleName)
          .setValue(role.roleId)
          .setDescription(role.minRankRequired ? `Min Level: ${role.minRankRequired}` : `Apply for ${role.roleName}`)
          .setEmoji('🎮')
      );
    });

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    return interaction.reply({
      content: '📌 **Step 1 of 2:** Select the Discord Role you wish to apply for:',
      components: [row],
      ephemeral: true,
    });
  }

  // 2. Staff "Approve" Button Clicked
  if (customId.startsWith('app_approve_')) {
    const applicationId = customId.replace('app_approve_', '');

    const isAuthorized = await ApplicationService.isStaffAuthorized(guildId, member);
    if (!isAuthorized) {
      return interaction.reply({
        content: '⛔ You do not have High Command or Role Request Manager permissions to approve applications.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await ApplicationService.approveApplication(applicationId, user.id, user.tag);
      return interaction.editReply({
        content: '✅ Application approved successfully! Role granted to applicant and review embed updated.',
      });
    } catch (error: any) {
      return interaction.editReply({
        content: `❌ Failed to approve application: ${error.message}`,
      });
    }
  }

  // 3. Staff "Reject" Button Clicked
  if (customId.startsWith('app_reject_')) {
    const applicationId = customId.replace('app_reject_', '');

    const isAuthorized = await ApplicationService.isStaffAuthorized(guildId, member);
    if (!isAuthorized) {
      return interaction.reply({
        content: '⛔ You do not have High Command or Role Request Manager permissions to reject applications.',
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`rejection_modal_${applicationId}`)
      .setTitle('Application Rejection Reason');

    const reasonInput = new TextInputBuilder()
      .setCustomId('rejection_reason_input')
      .setLabel('Reason for Rejection')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter details explaining why this application was rejected...')
      .setRequired(true)
      .setMaxLength(500);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
    modal.addComponents(row);

    return interaction.showModal(modal);
  }

  // --- MODERATION PANEL CHAT BUTTON CLICKS ---
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

      const channelInput = new TextInputBuilder()
        .setCustomId('target_channel_input')
        .setLabel('Target Channel (Blank = Current Channel)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Leave blank for current channel or enter Channel ID')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(countInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(channelInput)
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
      .setPlaceholder('e.g. @Akash, 1280178101326708856, or akashvarma')
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
