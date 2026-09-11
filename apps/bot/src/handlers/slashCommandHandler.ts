import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  TextChannel,
  User,
} from 'discord.js';
import { prisma, StaffPermission } from '@repo/database';
import { ModerationService } from '../services/moderationService';
import { AntiRaidService } from '../services/antiRaidService';
import { RbacService } from '../services/rbacService';
import { logger } from '../logger';

export class SlashCommandHandler {
  /**
   * Returns list of all Slash Command definitions for Discord registration.
   */
  public static getCommands() {
    return [
      new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption((opt) => opt.setName('user').setDescription('The target member').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
        .addIntegerOption((opt) =>
          opt
            .setName('delete_days')
            .setDescription('Days of message history to delete (0-7)')
            .setMinValue(0)
            .setMaxValue(7)
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user by their Discord User ID')
        .addStringOption((opt) => opt.setName('user_id').setDescription('The Discord User ID').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for unbanning').setRequired(false)),

      new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption((opt) => opt.setName('user').setDescription('The target member').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick').setRequired(false)),

      new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout/mute a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The target member').setRequired(true))
        .addIntegerOption((opt) =>
          opt
            .setName('duration')
            .setDescription('Timeout duration in minutes (e.g. 5, 10, 60, 1440)')
            .setRequired(true)
            .addChoices(
              { name: '1 minute', value: 1 },
              { name: '5 minutes', value: 5 },
              { name: '10 minutes', value: 10 },
              { name: '1 hour', value: 60 },
              { name: '6 hours', value: 360 },
              { name: '12 hours', value: 720 },
              { name: '1 day', value: 1440 },
              { name: '7 days', value: 10080 }
            )
        )
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for timeout').setRequired(false)),

      new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove timeout from a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The target member').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for removing timeout').setRequired(false)),

      new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a formal warning to a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The target member').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for warning').setRequired(true)),

      new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View active warnings for a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The target member').setRequired(true)),

      new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear all active warnings for a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The target member').setRequired(true)),

      new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages from the channel')
        .addIntegerOption((opt) =>
          opt.setName('amount').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
        )
        .addUserOption((opt) => opt.setName('user').setDescription('Filter by specific user').setRequired(false))
        .addStringOption((opt) => opt.setName('contains').setDescription('Filter messages containing text').setRequired(false))
        .addBooleanOption((opt) => opt.setName('bots_only').setDescription('Delete only bot messages').setRequired(false)),

      new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock current or specified channel')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to lock (defaults to current)').setRequired(false))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for lockdown').setRequired(false)),

      new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock current or specified channel')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to unlock (defaults to current)').setRequired(false))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for unlocking').setRequired(false)),

      new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode cooldown for a channel')
        .addIntegerOption((opt) =>
          opt
            .setName('seconds')
            .setDescription('Slowmode duration in seconds (0 to disable)')
            .setMinValue(0)
            .setMaxValue(21600)
            .setRequired(true)
        )
        .addChannelOption((opt) => opt.setName('channel').setDescription('Target channel (defaults to current)').setRequired(false)),

      new SlashCommandBuilder()
        .setName('modhistory')
        .setDescription('View recent moderation cases for a user')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true)),

      new SlashCommandBuilder()
        .setName('case')
        .setDescription('View a moderation case by case number')
        .addIntegerOption((opt) => opt.setName('case_number').setDescription('The case number').setRequired(true)),

      new SlashCommandBuilder()
        .setName('raidmode')
        .setDescription('Toggle Anti-Raid Mode')
        .addStringOption((opt) =>
          opt
            .setName('status')
            .setDescription('Enable or disable raid mode')
            .setRequired(true)
            .addChoices({ name: 'ON', value: 'on' }, { name: 'OFF', value: 'off' })
        )
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for toggling raid mode').setRequired(false)),

      new SlashCommandBuilder()
        .setName('note')
        .setDescription('Add a private staff note to a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The member').setRequired(true))
        .addStringOption((opt) => opt.setName('content').setDescription('Note content').setRequired(true)),
    ];
  }

  /**
   * Main dispatch router for chat input slash commands.
   */
  public static async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: '❌ Commands can only be used within a server.', ephemeral: true });
      return;
    }

    const { commandName, guild } = interaction;
    const executor = interaction.member as GuildMember;

    try {
      switch (commandName) {
        case 'ban': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.BAN_MEMBERS))) {
            await interaction.reply({ content: '⛔ You lack permission to ban members.', ephemeral: true });
            return;
          }

          const targetUser = interaction.options.getUser('user', true);
          const reason = interaction.options.getString('reason') || 'No reason provided';
          const deleteDays = interaction.options.getInteger('delete_days') || 0;

          await interaction.deferReply();
          const result = await ModerationService.ban(guild, executor, targetUser, reason, deleteDays);

          if (!result.success) {
            await interaction.editReply({ content: `❌ Failed: ${result.message}` });
          } else {
            await interaction.editReply({ content: `✅ ${result.message}` });
          }
          break;
        }

        case 'unban': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.BAN_MEMBERS))) {
            await interaction.reply({ content: '⛔ You lack permission to unban members.', ephemeral: true });
            return;
          }

          const targetUserId = interaction.options.getString('user_id', true);
          const reason = interaction.options.getString('reason') || 'No reason provided';

          await interaction.deferReply();
          const result = await ModerationService.unban(guild, executor, targetUserId, reason);

          if (!result.success) {
            await interaction.editReply({ content: `❌ Failed: ${result.message}` });
          } else {
            await interaction.editReply({ content: `✅ ${result.message}` });
          }
          break;
        }

        case 'kick': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.KICK_MEMBERS))) {
            await interaction.reply({ content: '⛔ You lack permission to kick members.', ephemeral: true });
            return;
          }

          const targetUser = interaction.options.getUser('user', true);
          const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

          if (!targetMember) {
            await interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
            return;
          }

          const reason = interaction.options.getString('reason') || 'No reason provided';

          await interaction.deferReply();
          const result = await ModerationService.kick(guild, executor, targetMember, reason);

          if (!result.success) {
            await interaction.editReply({ content: `❌ Failed: ${result.message}` });
          } else {
            await interaction.editReply({ content: `✅ ${result.message}` });
          }
          break;
        }

        case 'timeout': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.TIMEOUT_MEMBERS))) {
            await interaction.reply({ content: '⛔ You lack permission to timeout members.', ephemeral: true });
            return;
          }

          const targetUser = interaction.options.getUser('user', true);
          const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

          if (!targetMember) {
            await interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
            return;
          }

          const duration = interaction.options.getInteger('duration', true);
          const reason = interaction.options.getString('reason') || 'No reason provided';

          await interaction.deferReply();
          const result = await ModerationService.timeout(guild, executor, targetMember, duration, reason);

          if (!result.success) {
            await interaction.editReply({ content: `❌ Failed: ${result.message}` });
          } else {
            await interaction.editReply({ content: `✅ ${result.message}` });
          }
          break;
        }

        case 'untimeout': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.TIMEOUT_MEMBERS))) {
            await interaction.reply({ content: '⛔ You lack permission to manage timeouts.', ephemeral: true });
            return;
          }

          const targetUser = interaction.options.getUser('user', true);
          const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

          if (!targetMember) {
            await interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
            return;
          }

          const reason = interaction.options.getString('reason') || 'Timeout removed by staff';

          await interaction.deferReply();
          const result = await ModerationService.removeTimeout(guild, executor, targetMember, reason);

          if (!result.success) {
            await interaction.editReply({ content: `❌ Failed: ${result.message}` });
          } else {
            await interaction.editReply({ content: `✅ ${result.message}` });
          }
          break;
        }

        case 'warn': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.WARN_MEMBERS))) {
            await interaction.reply({ content: '⛔ You lack permission to warn members.', ephemeral: true });
            return;
          }

          const targetUser = interaction.options.getUser('user', true);
          const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

          if (!targetMember) {
            await interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
            return;
          }

          const reason = interaction.options.getString('reason', true);

          await interaction.deferReply();
          const result = await ModerationService.warn(guild, executor, targetMember, reason);

          if (!result.success) {
            await interaction.editReply({ content: `❌ Failed: ${result.message}` });
          } else {
            await interaction.editReply({ content: `✅ ${result.message}` });
          }
          break;
        }

        case 'warnings': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.VIEW_MODERATION))) {
            await interaction.reply({ content: '⛔ You lack permission to view moderation records.', ephemeral: true });
            return;
          }

          const targetUser = interaction.options.getUser('user', true);
          const warnings = await prisma.warning.findMany({
            where: { guildId: guild.id, userId: targetUser.id, isActive: true },
            orderBy: { createdAt: 'desc' },
          });

          const embed = new EmbedBuilder()
            .setTitle(`⚠️ Active Warnings for ${targetUser.tag}`)
            .setColor(0xfbbf24)
            .setDescription(
              warnings.length === 0
                ? 'This user has no active warnings.'
                : warnings
                    .map(
                      (w) =>
                        `**#${w.warningNumber}** — ${w.reason}\n*Issued by <@${w.moderatorId}> on <t:${Math.floor(
                          w.createdAt.getTime() / 1000
                        )}:d>*`
                    )
                    .join('\n\n')
            );

          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'clearwarnings': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.WARN_MEMBERS))) {
            await interaction.reply({ content: '⛔ You lack permission to clear warnings.', ephemeral: true });
            return;
          }

          const targetUser = interaction.options.getUser('user', true);
          const updated = await prisma.warning.updateMany({
            where: { guildId: guild.id, userId: targetUser.id, isActive: true },
            data: { isActive: false, removedById: executor.id, removedByTag: executor.user.tag, removedAt: new Date() },
          });

          await interaction.reply({
            content: `✅ Cleared **${updated.count} active warnings** for <@${targetUser.id}>.`,
          });
          break;
        }

        case 'purge': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.VIEW_MODERATION))) {
            await interaction.reply({ content: '⛔ You lack permission to purge messages.', ephemeral: true });
            return;
          }

          const channel = interaction.channel as TextChannel;
          if (!channel || !channel.isTextBased()) {
            await interaction.reply({ content: '❌ Purge can only be run in a text channel.', ephemeral: true });
            return;
          }

          const amount = interaction.options.getInteger('amount', true);
          const filterUser = interaction.options.getUser('user');
          const contains = interaction.options.getString('contains') || undefined;
          const botOnly = interaction.options.getBoolean('bots_only') || undefined;

          await interaction.deferReply({ ephemeral: true });
          const result = await ModerationService.purge(
            channel,
            executor,
            amount,
            filterUser?.id,
            contains,
            botOnly
          );

          await interaction.editReply({ content: `✅ ${result.message}` });
          break;
        }

        case 'lock': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.MANAGE_SETTINGS))) {
            await interaction.reply({ content: '⛔ You lack permission to manage channel locks.', ephemeral: true });
            return;
          }

          const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
          const reason = interaction.options.getString('reason') || 'Manual lockdown by staff';

          await interaction.deferReply();
          const result = await ModerationService.setChannelLock(channel, executor, true, reason);
          await interaction.editReply({ content: `🔒 ${result.message}` });
          break;
        }

        case 'unlock': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.MANAGE_SETTINGS))) {
            await interaction.reply({ content: '⛔ You lack permission to manage channel locks.', ephemeral: true });
            return;
          }

          const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
          const reason = interaction.options.getString('reason') || 'Channel unlocked by staff';

          await interaction.deferReply();
          const result = await ModerationService.setChannelLock(channel, executor, false, reason);
          await interaction.editReply({ content: `🔓 ${result.message}` });
          break;
        }

        case 'slowmode': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.MANAGE_SETTINGS))) {
            await interaction.reply({ content: '⛔ You lack permission to configure slowmode.', ephemeral: true });
            return;
          }

          const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
          const seconds = interaction.options.getInteger('seconds', true);

          await interaction.deferReply();
          const result = await ModerationService.setSlowmode(channel, executor, seconds);
          await interaction.editReply({ content: `⏱️ ${result.message}` });
          break;
        }

        case 'modhistory': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.VIEW_MODERATION))) {
            await interaction.reply({ content: '⛔ You lack permission to view moderation history.', ephemeral: true });
            return;
          }

          const targetUser = interaction.options.getUser('user', true);
          const cases = await prisma.moderationCase.findMany({
            where: { guildId: guild.id, targetId: targetUser.id },
            orderBy: { caseNumber: 'desc' },
            take: 10,
          });

          const embed = new EmbedBuilder()
            .setTitle(`📜 Moderation History for ${targetUser.tag}`)
            .setColor(0x5865f2)
            .setDescription(
              cases.length === 0
                ? 'No moderation cases on record for this user.'
                : cases
                    .map(
                      (c) =>
                        `**Case #${c.caseNumber} [${c.action}]**\n• Reason: ${c.reason}\n• Moderator: <@${c.moderatorId}>\n• Date: <t:${Math.floor(
                          c.createdAt.getTime() / 1000
                        )}:d>`
                    )
                    .join('\n\n')
            );

          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'case': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.VIEW_MODERATION))) {
            await interaction.reply({ content: '⛔ You lack permission to inspect moderation cases.', ephemeral: true });
            return;
          }

          const caseNum = interaction.options.getInteger('case_number', true);
          const modCase = await prisma.moderationCase.findUnique({
            where: {
              guildId_caseNumber: {
                guildId: guild.id,
                caseNumber: caseNum,
              },
            },
          });

          if (!modCase) {
            await interaction.reply({ content: `❌ Case #${caseNum} not found.`, ephemeral: true });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(`🔨 Moderation Case #${modCase.caseNumber}`)
            .setColor(0x5865f2)
            .addFields([
              { name: 'Action', value: `\`${modCase.action}\``, inline: true },
              { name: 'Target', value: `<@${modCase.targetId}> (${modCase.targetTag})`, inline: true },
              { name: 'Moderator', value: `<@${modCase.moderatorId}> (${modCase.moderatorTag})`, inline: true },
              { name: 'Reason', value: modCase.reason || 'No reason provided', inline: false },
              {
                name: 'Date',
                value: `<t:${Math.floor(modCase.createdAt.getTime() / 1000)}:F>`,
                inline: true,
              },
            ]);

          if (modCase.durationMinutes) {
            embed.addFields([{ name: 'Duration', value: `${modCase.durationMinutes} minutes`, inline: true }]);
          }

          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'raidmode': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.MANAGE_ANTIRAID))) {
            await interaction.reply({ content: '⛔ You lack permission to control Anti-Raid Mode.', ephemeral: true });
            return;
          }

          const status = interaction.options.getString('status', true);
          const reason = interaction.options.getString('reason') || `Raid mode toggled by ${executor.user.tag}`;

          const active = status === 'on';
          await AntiRaidService.setRaidMode(guild, active, executor, reason);

          await interaction.reply({
            content: `🚨 Raid Mode has been **${active ? 'ACTIVATED' : 'DEACTIVATED'}**.\nReason: ${reason}`,
          });
          break;
        }

        case 'note': {
          if (!(await RbacService.hasPermission(executor, StaffPermission.VIEW_MODERATION))) {
            await interaction.reply({ content: '⛔ You lack permission to manage member notes.', ephemeral: true });
            return;
          }

          const targetUser = interaction.options.getUser('user', true);
          const content = interaction.options.getString('content', true);

          await prisma.memberNote.create({
            data: {
              guildId: guild.id,
              userId: targetUser.id,
              authorId: executor.id,
              authorTag: executor.user.tag,
              content,
            },
          });

          await interaction.reply({
            content: `📝 Private note added for <@${targetUser.id}>. Normal members cannot see this note.`,
            ephemeral: true,
          });
          break;
        }

        default:
          await interaction.reply({ content: 'Unknown command.', ephemeral: true });
      }
    } catch (err: any) {
      logger.error({ err: err.message, command: commandName }, 'Error executing slash command');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `❌ An unexpected error occurred: ${err.message}` }).catch(() => null);
      } else {
        await interaction.reply({ content: `❌ An unexpected error occurred: ${err.message}`, ephemeral: true }).catch(() => null);
      }
    }
  }
}
