import { ModalSubmitInteraction, Guild, GuildMember } from 'discord.js';
import { ModerationService } from '../services/moderationService';
import { logger } from '../logger';

function findSmartUserMatch(guild: Guild, input: string, fallbackUserId: string): string {
  if (!input) return fallbackUserId;
  const clean = input.replace(/[<@!>]/g, '').trim();
  if (!clean) return fallbackUserId;

  // Direct ID regex match (17-20 digits)
  const idMatch = clean.match(/[0-9]{17,20}/)?.[0];
  if (idMatch) return idMatch;

  const cleanLower = clean.replace(/^@/, '').toLowerCase();
  if (!cleanLower) return fallbackUserId;

  const memberMatch = guild.members.cache.find(
    (m) =>
      m.user.username.toLowerCase() === cleanLower ||
      m.displayName.toLowerCase() === cleanLower ||
      m.user.username.toLowerCase().includes(cleanLower) ||
      m.displayName.toLowerCase().includes(cleanLower)
  );

  if (memberMatch) return memberMatch.id;
  return fallbackUserId;
}

export async function handleModalInteraction(interaction: ModalSubmitInteraction) {
  const { customId, guildId, user } = interaction;
  if (!guildId || !interaction.guild) return;

  const guild = interaction.guild;
  const executor = interaction.member as GuildMember;

  // Staff Chat Moderation Control Panel Modal Submitted
  if (customId.startsWith('mod_modal_')) {
    const actionType = customId.replace('mod_modal_', '').toUpperCase();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (actionType === 'PURGE') {
        const countRaw = interaction.fields.getTextInputValue('count_input');
        const count = Math.min(Math.max(parseInt(countRaw, 10) || 10, 1), 100);
        const channel = interaction.channel as any;

        if (!channel || !('bulkDelete' in channel)) {
          return interaction.editReply({ content: '❌ Cannot purge messages in this channel.' });
        }

        const result = await ModerationService.purge(channel, executor, count);
        return interaction.editReply({ content: result.message });
      }

      let rawTarget = '';
      try {
        rawTarget = interaction.fields.getTextInputValue('target_user_input') || '';
      } catch {
        rawTarget = '';
      }

      const targetUserId = findSmartUserMatch(guild, rawTarget, '');
      if (!targetUserId) {
        return interaction.editReply({ content: '❌ Target member not found. Please enter a valid @Mention, Username, or User ID.' });
      }

      let reason = 'No reason provided';
      try {
        reason = interaction.fields.getTextInputValue('reason_input') || 'No reason provided';
      } catch {
        reason = 'No reason provided';
      }

      const targetUser = await guild.client.users.fetch(targetUserId).catch(() => null);
      if (!targetUser) {
        return interaction.editReply({ content: `❌ User ${targetUserId} could not be resolved from Discord API.` });
      }

      const targetMember = await guild.members.fetch(targetUserId).catch(() => null);

      if (actionType === 'BAN') {
        const result = await ModerationService.ban(guild, executor, targetUser, reason);
        return interaction.editReply({ content: result.message });
      }

      if (actionType === 'KICK') {
        if (!targetMember) {
          return interaction.editReply({ content: `❌ Member ${targetUser.tag} is not in this server.` });
        }
        const result = await ModerationService.kick(guild, executor, targetMember, reason);
        return interaction.editReply({ content: result.message });
      }

      if (actionType === 'TIMEOUT') {
        if (!targetMember) {
          return interaction.editReply({ content: `❌ Member ${targetUser.tag} is not in this server.` });
        }
        const durationRaw = interaction.fields.getTextInputValue('duration_input') || '60';
        const minutes = parseInt(durationRaw, 10) || 60;
        const result = await ModerationService.timeout(guild, executor, targetMember, minutes, reason);
        return interaction.editReply({ content: result.message });
      }

      if (actionType === 'WARN') {
        if (!targetMember) {
          return interaction.editReply({ content: `❌ Member ${targetUser.tag} is not in this server.` });
        }
        const result = await ModerationService.warn(guild, executor, targetMember, reason);
        return interaction.editReply({ content: result.message });
      }
    } catch (err: any) {
      logger.error({ err: err.message, actionType }, 'Error in mod_modal submission');
      return interaction.editReply({ content: `❌ Failed to execute action: ${err.message}` });
    }
  }
}
