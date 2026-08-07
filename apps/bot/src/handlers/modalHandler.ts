import { ModalSubmitInteraction } from 'discord.js';
import { ApplicationService } from '../services/applicationService';

export async function handleModalInteraction(interaction: ModalSubmitInteraction) {
  const { customId, guildId, user } = interaction;

  if (!guildId) return;

  // 1. Applicant Role Request Modal Submitted
  if (customId.startsWith('role_request_modal_')) {
    const roleId = customId.replace('role_request_modal_', '');

    const inGameName = interaction.fields.getTextInputValue('in_game_name_input');
    const inGameId = interaction.fields.getTextInputValue('in_game_id_input');
    const currentRank = interaction.fields.getTextInputValue('current_rank_input');

    let screenshotUrl: string | null = null;
    try {
      screenshotUrl = interaction.fields.getTextInputValue('screenshot_url_input') || null;
    } catch {
      screenshotUrl = null;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const application = await ApplicationService.createApplication({
        guildId,
        userId: user.id,
        userTag: user.tag,
        userAvatar: user.displayAvatarURL(),
        roleId,
        inGameName,
        inGameId,
        currentRank,
        screenshotUrl,
      });

      return interaction.editReply({
        content: `✅ **Role Application Submitted Successfully!**\nYour application **#${application.id.slice(-6)}** has been received and sent to staff for review. You will be notified via DM when a decision is made.`,
      });
    } catch (error: any) {
      return interaction.editReply({
        content: `❌ Failed to submit role application: ${error.message}`,
      });
    }
  }

  // 2. Staff Rejection Reason Modal Submitted
  if (customId.startsWith('rejection_modal_')) {
    const applicationId = customId.replace('rejection_modal_', '');
    const rejectionReason = interaction.fields.getTextInputValue('rejection_reason_input');

    await interaction.deferReply({ ephemeral: true });

    try {
      await ApplicationService.rejectApplication(applicationId, user.id, user.tag, rejectionReason);
      return interaction.editReply({
        content: '❌ Application rejected. The review embed has been updated and the applicant notified.',
      });
    } catch (error: any) {
      return interaction.editReply({
        content: `❌ Failed to reject application: ${error.message}`,
      });
    }
  }
}
