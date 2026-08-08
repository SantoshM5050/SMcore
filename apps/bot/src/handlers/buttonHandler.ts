import {
  ButtonInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ApplicationService } from '../services/applicationService';
import { RoleService } from '../services/roleService';

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const { customId, guildId, user, member } = interaction;

  if (!guildId) {
    return interaction.reply({ content: 'Role requests can only be submitted within a Discord server.', ephemeral: true });
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

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('role_request_select_role')
      .setPlaceholder('Select the rank role you want to apply for...');

    roles.forEach((role) => {
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
}
