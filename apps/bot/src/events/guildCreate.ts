import { Guild } from 'discord.js';
import { prisma } from '@repo/database';
import { RoleService } from '../services/roleService';

export async function onGuildCreate(guild: Guild) {
  console.log(`📥 Joined new guild: ${guild.name} (${guild.id})`);

  await prisma.guild.upsert({
    where: { id: guild.id },
    update: {
      name: guild.name,
      icon: guild.iconURL() || null,
      ownerId: guild.ownerId,
    },
    create: {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL() || null,
      ownerId: guild.ownerId,
    },
  });

  await prisma.guildSettings.upsert({
    where: { guildId: guild.id },
    update: {},
    create: { guildId: guild.id },
  });

  await prisma.channelConfiguration.upsert({
    where: { guildId: guild.id },
    update: {},
    create: { guildId: guild.id },
  });

  await RoleService.syncGuildRoles(guild.id);
}
