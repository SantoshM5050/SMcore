import {
  ButtonInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ApplicationService } from '../services/applicationService';
import { RoleService } from '../services/roleService';
import { EventSignupService } from '../services/eventSignupService';

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

  // Grand RP Promotion / Demotion / Left Button Clicked
  if (customId === 'promo_btn_promotion' || customId === 'promo_demotion_form_btn') {
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId('promo_select_user_PROMOTION')
      .setPlaceholder('Select target member to promote...');

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

    return interaction.reply({
      content: '📈 **Step 1 of 2:** Select the Discord Member you want to promote below:',
      components: [row],
      ephemeral: true,
    });
  }

  if (customId === 'promo_btn_demotion') {
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId('promo_select_user_DEMOTION')
      .setPlaceholder('Select target member to demote...');

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

    return interaction.reply({
      content: '📉 **Step 1 of 2:** Select the Discord Member you want to demote below:',
      components: [row],
      ephemeral: true,
    });
  }

  if (customId === 'promo_btn_left') {
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId('promo_select_user_LEFT_FAMILY')
      .setPlaceholder('Select member who left the family...');

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

    return interaction.reply({
      content: '🚪 **Step 1 of 2:** Select the Discord Member who left the family below:',
      components: [row],
      ephemeral: true,
    });
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
      return interaction.editReply({ content: '✅ Application approved successfully! The role has been granted and applicant notified.' });
    } catch (error: any) {
      return interaction.editReply({ content: `❌ Failed to approve application: ${error.message}` });
    }
  }

  // 3. Staff "Reject" Button Clicked -> Open Modal
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
      ban: 'ban',
      kick: 'kick',
      timeout: 'timeout / mute',
      warn: 'warn',
    };

    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(`mod_select_user_${actionType}`)
      .setPlaceholder(`Search & select member to ${titles[actionType] || actionType}...`);

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

    return interaction.reply({
      content: `📌 **Step 1 of 2:** Select the target member to **${titles[actionType] || actionType}** below:`,
      components: [row],
      ephemeral: true,
    });
  }
}
