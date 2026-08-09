import { Client, ActivityType } from 'discord.js';
import { prisma } from '@repo/database';
import { RoleService } from '../services/roleService';

export async function onReady(client: Client) {
  console.log(`⚡ SMCore Bot logged in as ${client.user?.tag} (ID: ${client.user?.id})`);

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

    console.log('✅ SMCore Guild sync complete.');
  } catch (error) {
    console.error('⚠️ Database sync during ready event failed:', error);
  }
}

