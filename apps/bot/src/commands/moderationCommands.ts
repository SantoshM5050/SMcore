import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  GuildMember,
  TextChannel,
  NewsChannel,
  ThreadChannel,
} from 'discord.js';
import { THEME_COLORS } from '@smcore/shared';
import { ModerationService } from '../services/moderation/moderationService';
import { WarningService } from '../services/moderation/warningService';
import { NoteService } from '../services/moderation/noteService';
import { CaseService } from '../services/moderation/caseService';
import { logger } from '../utils/logger';

export interface CommandHandler {
  data: SlashCommandBuilder | any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const moderationCommands: CommandHandler[] = [
  // 1. /ban
  {
    data: new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a member or user from the server')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('The user to ban').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for the ban').setMaxLength(500)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('delete_messages_days')
          .setDescription('Number of days of message history to delete (0-7)')
          .setMinValue(0)
          .setMaxValue(7)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);
      const reason = interaction.options.getString('reason') || undefined;
      const deleteDays = interaction.options.getInteger('delete_messages_days') || 0;

      await interaction.deferReply();

      const result = await ModerationService.banMember(
        interaction.guild!,
        interaction.member as GuildMember,
        {
          targetUserId: targetUser.id,
          reason,
          deleteMessageSeconds: deleteDays * 86400,
        }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '🔨 Member Banned' : '❌ Moderation Action Failed')
        .setDescription(result.message)
        .setTimestamp();

      if (result.success && result.caseNumber) {
        embed.setFooter({ text: `Case #${result.caseNumber} • SMCore Precision Moderation` });
      }

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 2. /unban
  {
    data: new SlashCommandBuilder()
      .setName('unban')
      .setDescription('Revoke a ban for a user')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
      .addStringOption((opt) =>
        opt.setName('user_id').setDescription('Discord Snowflake ID of user to unban').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for revoking ban').setMaxLength(500)
      ),
    execute: async (interaction) => {
      const userId = interaction.options.getString('user_id', true).trim();
      const reason = interaction.options.getString('reason') || undefined;

      await interaction.deferReply();

      const result = await ModerationService.unbanMember(
        interaction.guild!,
        interaction.member as GuildMember,
        { targetUserId: userId, reason }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '🔓 Ban Revoked' : '❌ Unban Failed')
        .setDescription(result.message)
        .setTimestamp();

      if (result.success && result.caseNumber) {
        embed.setFooter({ text: `Case #${result.caseNumber}` });
      }

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 3. /kick
  {
    data: new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a member from the server')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('The member to kick').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for the kick').setMaxLength(500)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);
      const reason = interaction.options.getString('reason') || undefined;

      await interaction.deferReply();

      const result = await ModerationService.kickMember(
        interaction.guild!,
        interaction.member as GuildMember,
        { targetUserId: targetUser.id, reason }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '👢 Member Kicked' : '❌ Kick Failed')
        .setDescription(result.message)
        .setTimestamp();

      if (result.success && result.caseNumber) {
        embed.setFooter({ text: `Case #${result.caseNumber}` });
      }

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 4. /timeout
  {
    data: new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('Place a member in timeout (isolate communications)')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('The member to timeout').setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName('duration')
          .setDescription('Select timeout duration')
          .setRequired(true)
          .addChoices(
            { name: '1 minute', value: '60' },
            { name: '5 minutes', value: '300' },
            { name: '10 minutes', value: '600' },
            { name: '30 minutes', value: '1800' },
            { name: '1 hour', value: '3600' },
            { name: '6 hours', value: '21600' },
            { name: '12 hours', value: '43200' },
            { name: '1 day', value: '86400' },
            { name: '7 days', value: '604800' }
          )
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for the timeout').setMaxLength(500)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);
      const durationSeconds = parseInt(interaction.options.getString('duration', true), 10);
      const reason = interaction.options.getString('reason') || undefined;

      await interaction.deferReply();

      const result = await ModerationService.timeoutMember(
        interaction.guild!,
        interaction.member as GuildMember,
        { targetUserId: targetUser.id, durationSeconds, reason }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '⏳ Member Timed Out' : '❌ Timeout Failed')
        .setDescription(result.message)
        .setTimestamp();

      if (result.success && result.caseNumber) {
        embed.setFooter({ text: `Case #${result.caseNumber}` });
      }

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 5. /untimeout
  {
    data: new SlashCommandBuilder()
      .setName('untimeout')
      .setDescription('Remove timeout from a member early')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('The member to remove timeout from').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for removing timeout').setMaxLength(500)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);
      const reason = interaction.options.getString('reason') || undefined;

      await interaction.deferReply();

      const result = await ModerationService.removeTimeout(
        interaction.guild!,
        interaction.member as GuildMember,
        { targetUserId: targetUser.id, reason }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '⏰ Timeout Removed' : '❌ Untimeout Failed')
        .setDescription(result.message)
        .setTimestamp();

      if (result.success && result.caseNumber) {
        embed.setFooter({ text: `Case #${result.caseNumber}` });
      }

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 6. /warn
  {
    data: new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Issue a formal warning to a member')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('The member to warn').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for warning').setRequired(true).setMaxLength(500)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);
      const reason = interaction.options.getString('reason', true);

      await interaction.deferReply();

      const result = await WarningService.addWarning(
        interaction.guildId!,
        targetUser.id,
        interaction.user.id,
        reason
      );

      let escalationNote = '';
      if (result.escalationTriggered) {
        escalationNote = `\n⚠️ **Automated Escalation**: Reached ${result.activeWarningCount} warnings threshold -> Action: **${result.escalationTriggered.action}**`;
      }

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.WARNING as any)
        .setTitle('⚠️ Formal Warning Issued')
        .setDescription(
          `Warned <@${targetUser.id}> for: **${reason}**\nActive Warnings: **${result.activeWarningCount}**${escalationNote}`
        )
        .setFooter({ text: `Case #${result.caseNumber} • Warning ID: ${result.warningId}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 7. /warnings
  {
    data: new SlashCommandBuilder()
      .setName('warnings')
      .setDescription('View active warnings for a member')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('The member to check').setRequired(true)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);

      await interaction.deferReply({ ephemeral: true });

      const warnings = await WarningService.getWarnings(interaction.guildId!, targetUser.id, false);

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.PRIMARY as any)
        .setTitle(`Active Warnings for ${targetUser.tag}`)
        .setDescription(
          warnings.length === 0
            ? 'This member has no active warnings.'
            : warnings
                .map(
                  (w, i) =>
                    `**${i + 1}.** \`${w.id.slice(-6)}\` — ${w.reason} (by <@${w.moderatorUserId}> <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>)`
                )
                .join('\n')
        )
        .setFooter({ text: `Total Active: ${warnings.length}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 8. /remove-warning
  {
    data: new SlashCommandBuilder()
      .setName('remove-warning')
      .setDescription('Revoke a specific warning by its ID')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
      .addStringOption((opt) =>
        opt.setName('warning_id').setDescription('ID of the warning to revoke').setRequired(true)
      ),
    execute: async (interaction) => {
      const warningId = interaction.options.getString('warning_id', true);

      await interaction.deferReply({ ephemeral: true });

      const success = await WarningService.removeWarning(interaction.guildId!, warningId);

      const embed = new EmbedBuilder()
        .setColor(success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(success ? '✅ Warning Revoked' : '❌ Revoke Failed')
        .setDescription(
          success
            ? `Successfully revoked warning \`${warningId}\`. Status changed to REVOKED.`
            : `Could not find warning \`${warningId}\` in this server.`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 9. /clear-warnings
  {
    data: new SlashCommandBuilder()
      .setName('clear-warnings')
      .setDescription('Revoke all active warnings for a member')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('The member whose warnings to clear').setRequired(true)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);

      await interaction.deferReply();

      const clearedCount = await WarningService.clearWarnings(interaction.guildId!, targetUser.id);

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.SUCCESS as any)
        .setTitle('🧹 Warnings Cleared')
        .setDescription(
          `Revoked **${clearedCount}** active warning(s) for <@${targetUser.id}>. (History preserved as REVOKED)`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 10. /note
  {
    data: new SlashCommandBuilder()
      .setName('note')
      .setDescription('Add a private staff note on a member')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('Target member').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('content').setDescription('Staff note content').setRequired(true).setMaxLength(2000)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);
      const content = interaction.options.getString('content', true);

      await interaction.deferReply({ ephemeral: true });

      await NoteService.addNote(interaction.guildId!, targetUser.id, interaction.user.id, content);

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.INFO as any)
        .setTitle('📝 Staff Note Added')
        .setDescription(`Saved private note on <@${targetUser.id}>:\n> ${content}`)
        .setFooter({ text: 'Private note visible only to staff.' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 11. /notes
  {
    data: new SlashCommandBuilder()
      .setName('notes')
      .setDescription('View private staff notes for a member')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('Target member').setRequired(true)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);

      await interaction.deferReply({ ephemeral: true });

      const notes = await NoteService.listNotes(interaction.guildId!, targetUser.id);

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.PRIMARY as any)
        .setTitle(`Staff Notes for ${targetUser.tag}`)
        .setDescription(
          notes.length === 0
            ? 'No staff notes recorded for this member.'
            : notes
                .map(
                  (n, i) =>
                    `**${i + 1}.** ${n.content}\n*— by <@${n.authorUserId}> <t:${Math.floor(n.createdAt.getTime() / 1000)}:R>*`
                )
                .join('\n\n')
        )
        .setFooter({ text: `Total notes: ${notes.length}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 12. /purge
  {
    data: new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Bulk delete messages in this channel')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
      .addIntegerOption((opt) =>
        opt
          .setName('amount')
          .setDescription('Number of messages to delete (1-100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      )
      .addUserOption((opt) =>
        opt.setName('target').setDescription('Only delete messages from this user (optional)')
      ),
    execute: async (interaction) => {
      const amount = interaction.options.getInteger('amount', true);
      const target = interaction.options.getUser('target') || undefined;

      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.channel as TextChannel | NewsChannel | ThreadChannel;
      if (!channel || !channel.isTextBased()) {
        await interaction.editReply({ content: 'Purge can only be used in text channels.' });
        return;
      }

      const result = await ModerationService.purgeMessages(
        interaction.guild!,
        channel,
        interaction.member as GuildMember,
        { channelId: channel.id, amount, targetUserId: target?.id }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '🧹 Purge Completed' : '❌ Purge Failed')
        .setDescription(result.message)
        .setTimestamp();

      if (result.success && result.caseNumber) {
        embed.setFooter({ text: `Case #${result.caseNumber}` });
      }

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 13. /lock
  {
    data: new SlashCommandBuilder()
      .setName('lock')
      .setDescription('Lock this channel (prevents @everyone from sending messages)')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for locking channel').setMaxLength(500)
      ),
    execute: async (interaction) => {
      const reason = interaction.options.getString('reason') || undefined;

      await interaction.deferReply();

      const channel = interaction.channel as TextChannel | NewsChannel;
      if (!channel || !channel.permissionOverwrites) {
        await interaction.editReply({ content: 'Lock can only be used in standard text channels.' });
        return;
      }

      const result = await ModerationService.lockChannel(
        interaction.guild!,
        channel,
        interaction.member as GuildMember,
        { channelId: channel.id, reason }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '🔒 Channel Locked' : '❌ Lock Failed')
        .setDescription(result.message)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 14. /unlock
  {
    data: new SlashCommandBuilder()
      .setName('unlock')
      .setDescription('Unlock this channel (restores @everyone messaging permissions)')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for unlocking channel').setMaxLength(500)
      ),
    execute: async (interaction) => {
      const reason = interaction.options.getString('reason') || undefined;

      await interaction.deferReply();

      const channel = interaction.channel as TextChannel | NewsChannel;
      if (!channel || !channel.permissionOverwrites) {
        await interaction.editReply({ content: 'Unlock can only be used in standard text channels.' });
        return;
      }

      const result = await ModerationService.unlockChannel(
        interaction.guild!,
        channel,
        interaction.member as GuildMember,
        { channelId: channel.id, reason }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '🔓 Channel Unlocked' : '❌ Unlock Failed')
        .setDescription(result.message)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 15. /slowmode
  {
    data: new SlashCommandBuilder()
      .setName('slowmode')
      .setDescription('Set slowmode cooldown for this channel')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
      .addIntegerOption((opt) =>
        opt
          .setName('seconds')
          .setDescription('Cooldown seconds per user (0 to disable, max 21600)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(21600)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for slowmode update').setMaxLength(500)
      ),
    execute: async (interaction) => {
      const seconds = interaction.options.getInteger('seconds', true);
      const reason = interaction.options.getString('reason') || undefined;

      await interaction.deferReply();

      const channel = interaction.channel as TextChannel | NewsChannel | ThreadChannel;
      if (!channel || typeof channel.setRateLimitPerUser !== 'function') {
        await interaction.editReply({ content: 'Slowmode can only be configured in text channels or threads.' });
        return;
      }

      const result = await ModerationService.setSlowmode(
        interaction.guild!,
        channel,
        interaction.member as GuildMember,
        { channelId: channel.id, seconds, reason }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '⏱️ Slowmode Updated' : '❌ Slowmode Failed')
        .setDescription(result.message)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 16. /nickname
  {
    data: new SlashCommandBuilder()
      .setName('nickname')
      .setDescription('Change or reset a member nickname')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageNicknames)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('Target member').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('new_nickname').setDescription('New nickname (leave blank to reset)').setMaxLength(32)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for nickname modification').setMaxLength(500)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);
      const nickname = interaction.options.getString('new_nickname') || null;
      const reason = interaction.options.getString('reason') || undefined;

      await interaction.deferReply();

      const result = await ModerationService.moderateNickname(
        interaction.guild!,
        interaction.member as GuildMember,
        { targetUserId: targetUser.id, nickname, reason }
      );

      const embed = new EmbedBuilder()
        .setColor(result.success ? (THEME_COLORS.SUCCESS as any) : (THEME_COLORS.DANGER as any))
        .setTitle(result.success ? '🏷️ Nickname Updated' : '❌ Nickname Moderation Failed')
        .setDescription(result.message)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // 17. /modhistory
  {
    data: new SlashCommandBuilder()
      .setName('modhistory')
      .setDescription('View moderation case history for a member')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
      .addUserOption((opt) =>
        opt.setName('target').setDescription('Target member').setRequired(true)
      ),
    execute: async (interaction) => {
      const targetUser = interaction.options.getUser('target', true);

      await interaction.deferReply({ ephemeral: true });

      const cases = await CaseService.getCases(interaction.guildId!, {
        targetUserId: targetUser.id,
        pageSize: 10,
      });

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.PRIMARY as any)
        .setTitle(`Moderation History for ${targetUser.tag}`)
        .setDescription(
          cases.items.length === 0
            ? 'No moderation cases recorded for this member.'
            : cases.items
                .map(
                  (c) =>
                    `**Case #${c.caseNumber}** [${c.type}] — ${c.reason || 'No reason specified'}\n*Moderator: <@${c.moderatorUserId}> • <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:R>*`
                )
                .join('\n\n')
        )
        .setFooter({ text: `Total recorded cases: ${cases.total}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },
];
