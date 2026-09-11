import { Guild } from 'discord.js';
import { prisma, LogCategory } from '@repo/database';
import { logger } from '../logger';

export async function onGuildCreate(guild: Guild) {
  logger.info({ name: guild.name, id: guild.id }, '📥 Joined new guild');

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

  await prisma.antiSpamConfig.upsert({
    where: { guildId: guild.id },
    update: {},
    create: { guildId: guild.id },
  });

  await prisma.antiLinkConfig.upsert({
    where: { guildId: guild.id },
    update: {},
    create: { guildId: guild.id },
  });

  await prisma.antiInviteConfig.upsert({
    where: { guildId: guild.id },
    update: {},
    create: { guildId: guild.id },
  });

  await prisma.antiMentionConfig.upsert({
    where: { guildId: guild.id },
    update: {},
    create: { guildId: guild.id },
  });

  await prisma.antiRaidConfig.upsert({
    where: { guildId: guild.id },
    update: {},
    create: { guildId: guild.id },
  });

  await prisma.joinSecurityConfig.upsert({
    where: { guildId: guild.id },
    update: {},
    create: { guildId: guild.id },
  });

  const categories: LogCategory[] = [
    LogCategory.MEMBER,
    LogCategory.MODERATION,
    LogCategory.VOICE,
    LogCategory.CHANNEL,
    LogCategory.ROLE,
    LogCategory.MESSAGE,
    LogCategory.SERVER,
  ];

  for (const category of categories) {
    await prisma.logConfiguration.upsert({
      where: {
        guildId_category: {
          guildId: guild.id,
          category,
        },
      },
      update: {},
      create: {
        guildId: guild.id,
        category,
      },
    });
  }
}
