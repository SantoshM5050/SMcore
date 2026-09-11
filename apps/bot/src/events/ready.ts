import { Client, ActivityType } from 'discord.js';
import { prisma, LogCategory } from '@repo/database';
import { SlashCommandHandler } from '../handlers/slashCommandHandler';
import { logger } from '../logger';

export async function onReady(client: Client) {
  logger.info({ tag: client.user?.tag, id: client.user?.id }, '⚡ SMCore Moderation Bot successfully logged in');

  // Register Slash Commands with Discord API
  try {
    if (client.application) {
      const commands = SlashCommandHandler.getCommands();
      await client.application.commands.set(commands);
      logger.info({ count: commands.length }, '✅ Registered Moderation Slash Commands with Discord API');
    }
  } catch (slashErr: any) {
    logger.error({ err: slashErr.message }, 'Failed to register Slash Commands with Discord API');
  }

  try {
    client.user?.setActivity('SMCore | Protecting your server', { type: ActivityType.Watching });
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to set bot activity');
  }

  try {
    // Sync all guilds in database
    const guilds = client.guilds.cache;
    logger.info({ count: guilds.size }, '📡 Syncing connected Discord guilds with PostgreSQL database');

    const categories: LogCategory[] = [
      LogCategory.MEMBER,
      LogCategory.MODERATION,
      LogCategory.VOICE,
      LogCategory.CHANNEL,
      LogCategory.ROLE,
      LogCategory.MESSAGE,
      LogCategory.SERVER,
    ];

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

      // Ensure default Anti-Spam, Anti-Link, Anti-Invite, Anti-Mention, Anti-Raid configs exist
      await prisma.antiSpamConfig.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });

      await prisma.antiLinkConfig.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });

      await prisma.antiInviteConfig.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });

      await prisma.antiMentionConfig.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });

      await prisma.antiRaidConfig.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });

      await prisma.joinSecurityConfig.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });

      // Ensure default log configurations exist for all 7 categories
      for (const category of categories) {
        await prisma.logConfiguration.upsert({
          where: {
            guildId_category: {
              guildId,
              category,
            },
          },
          update: {},
          create: {
            guildId,
            category,
          },
        });
      }
    }

    logger.info('✅ SMCore Multi-Guild database synchronization complete');
  } catch (error: any) {
    logger.error({ err: error.message }, '⚠️ Database sync during ready event failed');
  }
}
