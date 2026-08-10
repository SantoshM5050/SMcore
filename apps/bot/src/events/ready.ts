import { Client, ActivityType } from 'discord.js';
import { prisma } from '@repo/database';
import { RoleService } from '../services/roleService';
import { EventScheduler } from '../services/eventScheduler';

export async function onReady(client: Client) {
  console.log(`⚡ SMCore Bot logged in as ${client.user?.tag} (ID: ${client.user?.id})`);

  // Register Slash Commands with Discord API
  try {
    if (client.application) {
      await client.application.commands.set([
        {
          name: 'help',
          description: 'Show SMCore Bot setup instructions and commands list',
        },
        {
          name: 'settings',
          description: 'View current SMCore server settings and channel routes',
        },
        {
          name: 'setup-roles',
          description: 'Deploy a Role Request button embed in the channel',
          options: [
            {
              name: 'role',
              description: 'The Discord role users can request',
              type: 8, // ROLE
              required: true,
            },
            {
              name: 'title',
              description: 'Custom title for embed',
              type: 3, // STRING
              required: false,
            },
            {
              name: 'description',
              description: 'Custom description for embed',
              type: 3, // STRING
              required: false,
            },
            {
              name: 'channel',
              description: 'Channel to deploy embed in (defaults to current channel)',
              type: 7, // CHANNEL
              required: false,
            },
          ],
        },
        {
          name: 'setup-event',
          description: 'Create and deploy an Event or Scrim Signup embed',
          options: [
            {
              name: 'title',
              description: 'Event title (e.g. Scrim 8PM)',
              type: 3, // STRING
              required: true,
            },
            {
              name: 'main_slots',
              description: 'Main team slots (default: 10)',
              type: 4, // INTEGER
              required: false,
            },
            {
              name: 'sub_slots',
              description: 'Substitute slots (default: 5)',
              type: 4, // INTEGER
              required: false,
            },
            {
              name: 'auto_close_mins',
              description: 'Auto close duration in minutes (default: 30)',
              type: 4, // INTEGER
              required: false,
            },
            {
              name: 'channel',
              description: 'Channel to post event (defaults to current channel)',
              type: 7, // CHANNEL
              required: false,
            },
          ],
        },
        {
          name: 'ban',
          description: 'Ban a member from the server',
          options: [
            { name: 'user', description: 'The member to ban', type: 6, required: true },
            { name: 'reason', description: 'Reason for ban', type: 3, required: false },
          ],
        },
        {
          name: 'kick',
          description: 'Kick a member from the server',
          options: [
            { name: 'user', description: 'The member to kick', type: 6, required: true },
            { name: 'reason', description: 'Reason for kick', type: 3, required: false },
          ],
        },
        {
          name: 'timeout',
          description: 'Timeout / Mute a member for a duration',
          options: [
            { name: 'user', description: 'The member to timeout', type: 6, required: true },
            { name: 'minutes', description: 'Duration in minutes (e.g. 60)', type: 4, required: true },
            { name: 'reason', description: 'Reason for timeout', type: 3, required: false },
          ],
        },
        {
          name: 'warn',
          description: 'Issue a formal warning to a member',
          options: [
            { name: 'user', description: 'The member to warn', type: 6, required: true },
            { name: 'reason', description: 'Reason for warning', type: 3, required: true },
          ],
        },
        {
          name: 'purge',
          description: 'Bulk delete messages from channel',
          options: [
            { name: 'count', description: 'Number of messages to delete (1-100)', type: 4, required: true },
          ],
        },
      ]);
      console.log('✅ Registered Slash Commands (/setup-roles, /setup-event, /settings, /help, /ban, /kick, /timeout, /warn, /purge) with Discord API.');
    }
  } catch (slashErr) {
    console.error('Failed to register Slash Commands with Discord API:', slashErr);
  }

  // Start Event Auto-Scheduler Ticker
  try {
    EventScheduler.start();
  } catch (schedErr) {
    console.error('Failed to start Event Auto-Scheduler:', schedErr);
  }

  try {
    client.user?.setActivity('SMCore | Managing your server', { type: ActivityType.Watching });
  } catch (err) {
    console.error('Failed to set bot activity:', err);
  }

  try {
    // Sync all guilds in database
    const guilds = client.guilds.cache;
    console.log(`📡 Connected to ${guilds.size} Discord Guild(s). Syncing database records...`);

    for (const [guildId, guild] of guilds) {
      await prisma.guild.upsert({
        where: { id: guildId },
        update: {
          name: guild.name,
          icon: guild.iconURL() || null,
          ownerId: guild.ownerId,
        },
        create: {
          id: guildId,
          name: guild.name,
          icon: guild.iconURL() || null,
          ownerId: guild.ownerId,
        },
      });

      // Ensure default settings exist
      await prisma.guildSettings.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });

      await prisma.channelConfiguration.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });

      // Sync guild roles into Prisma
      await RoleService.syncGuildRoles(guildId);
    }

    // Purge any orphaned guilds in DB where bot is no longer present
    const currentGuildIds = Array.from(guilds.keys());
    const deleteResult = await prisma.guild.deleteMany({
      where: {
        id: {
          notIn: currentGuildIds,
        },
      },
    });
    if (deleteResult.count > 0) {
      console.log(`🧹 Purged ${deleteResult.count} orphaned guild(s) from database where bot was kicked.`);
    }

    console.log('✅ SMCore Guild sync complete.');
  } catch (error) {
    console.error('⚠️ Database sync during ready event failed:', error);
  }
}

