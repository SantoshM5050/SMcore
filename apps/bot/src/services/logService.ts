import {
  Client,
  EmbedBuilder,
  ForumChannel,
  Guild,
  TextChannel,
  ThreadChannel,
  ChannelType,
} from 'discord.js';
import {
  prisma,
  LogCategory,
  LogDestinationType,
  ForumThreadMode,
} from '@repo/database';
import { logger } from '../logger';

export interface LogPayload {
  guild: Guild;
  category: LogCategory;
  eventType: string;
  title: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  targetId?: string;
  targetTag?: string;
  executorId?: string;
  executorTag?: string;
  channelId?: string;
  caseNumber?: number;
  colorHex?: string;
  metadata?: Record<string, any>;
}

export class LogService {
  private static threadCache: Map<string, string> = new Map();

  /**
   * Dispatches a log entry to database and to Discord (Text or Forum channel).
   */
  public static async log(payload: LogPayload): Promise<void> {
    const { guild, category, eventType, title, description, fields, targetId, targetTag, executorId, executorTag, channelId, caseNumber, colorHex, metadata } = payload;

    try {
      // 1. Persist to Database LogEntry
      await prisma.logEntry.create({
        data: {
          guildId: guild.id,
          category,
          eventType,
          targetId: targetId || null,
          targetTag: targetTag || null,
          executorId: executorId || null,
          executorTag: executorTag || null,
          channelId: channelId || null,
          details: {
            title,
            description,
            fields: fields || [],
            caseNumber: caseNumber || null,
            metadata: metadata || {},
          },
        },
      }).catch((dbErr) => {
        logger.warn({ err: dbErr.message }, 'Failed to save LogEntry to database');
      });

      // 2. Fetch Log Configuration for Guild & Category
      const config = await prisma.logConfiguration.findUnique({
        where: {
          guildId_category: {
            guildId: guild.id,
            category,
          },
        },
      });

      if (!config || !config.enabled || !config.channelId) {
        return;
      }

      // 3. Construct Embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor((colorHex as any) || (config.embedColor as any) || 0x5865f2)
        .setTimestamp();

      if (description) {
        embed.setDescription(description);
      }

      if (fields && fields.length > 0) {
        embed.addFields(fields);
      }

      // Format footer with case ID and timestamp
      const footerParts: string[] = [];
      if (caseNumber && config.showIds) {
        footerParts.push(`Case #${caseNumber}`);
      }
      if (targetId && config.showIds) {
        footerParts.push(`User ID: ${targetId}`);
      }
      footerParts.push(`Category: ${category}`);
      embed.setFooter({ text: footerParts.join(' • ') });

      // 4. Dispatch to Discord Channel
      const targetChannel = await guild.channels.fetch(config.channelId).catch(() => null);
      if (!targetChannel) {
        return;
      }

      if (config.destinationType === LogDestinationType.TEXT_CHANNEL && targetChannel.isTextBased()) {
        await (targetChannel as TextChannel).send({ embeds: [embed] }).catch((err) => {
          logger.warn({ err: err.message, channelId: targetChannel.id }, 'Failed to post log to text channel');
        });
      } else if (config.destinationType === LogDestinationType.FORUM_CHANNEL && targetChannel.type === ChannelType.GuildForum) {
        await this.dispatchToForum(guild, targetChannel as ForumChannel, config.forumThreadMode, category, eventType, caseNumber, embed);
      }
    } catch (err: any) {
      logger.error({ err: err.message, category, eventType }, 'Unexpected error in LogService');
    }
  }

  /**
   * Resolves or creates a thread in a Forum Channel based on forumThreadMode.
   */
  private static async dispatchToForum(
    guild: Guild,
    forumChannel: ForumChannel,
    mode: ForumThreadMode,
    category: LogCategory,
    eventType: string,
    caseNumber: number | undefined,
    embed: EmbedBuilder
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      let threadKey = '';
      let defaultName = '';

      switch (mode) {
        case ForumThreadMode.DAILY:
          threadKey = `DAILY_${category}_${today}`;
          defaultName = `📅 ${category} Logs - ${today}`;
          break;
        case ForumThreadMode.EVENT_TYPE:
          threadKey = `EVENT_${category}_${eventType}`;
          defaultName = `⚡ ${category} - ${eventType}`;
          break;
        case ForumThreadMode.PER_CASE:
          if (caseNumber) {
            threadKey = `CASE_${caseNumber}`;
            defaultName = `🔨 Case #${caseNumber} - ${eventType}`;
          } else {
            threadKey = `CATEGORY_${category}`;
            defaultName = this.getCategoryThreadName(category);
          }
          break;
        case ForumThreadMode.CATEGORY:
        default:
          threadKey = `CATEGORY_${category}`;
          defaultName = this.getCategoryThreadName(category);
          break;
      }

      // Check DB for existing thread
      let forumRecord = await prisma.forumLogThread.findUnique({
        where: {
          guildId_forumChannelId_threadKey: {
            guildId: guild.id,
            forumChannelId: forumChannel.id,
            threadKey,
          },
        },
      });

      let thread: ThreadChannel | null = null;
      if (forumRecord) {
        thread = (await forumChannel.threads.fetch(forumRecord.threadId).catch(() => null)) as ThreadChannel | null;
      }

      // If thread exists but is archived, unarchive it
      if (thread) {
        if (thread.archived) {
          await thread.setArchived(false).catch(() => null);
        }
      } else {
        // Create new Forum Thread
        const newThread = await forumChannel.threads.create({
          name: defaultName.slice(0, 100),
          message: {
            content: `📜 **${defaultName}**\nLogs for \`${category}\` automatically synchronized by SMCore.`,
            embeds: [embed],
          },
        });

        thread = newThread;

        // Save or update DB record
        await prisma.forumLogThread.upsert({
          where: {
            guildId_forumChannelId_threadKey: {
              guildId: guild.id,
              forumChannelId: forumChannel.id,
              threadKey,
            },
          },
          create: {
            guildId: guild.id,
            forumChannelId: forumChannel.id,
            category,
            threadKey,
            threadId: newThread.id,
            threadName: defaultName,
          },
          update: {
            threadId: newThread.id,
            threadName: defaultName,
          },
        }).catch((err) => {
          logger.warn({ err: err.message }, 'Failed to upsert ForumLogThread in DB');
        });

        return; // Embed already posted as the starter message
      }

      // Post to active thread
      if (thread) {
        await thread.send({ embeds: [embed] }).catch((err) => {
          logger.warn({ err: err.message, threadId: thread?.id }, 'Failed to post message to forum thread');
        });
      }
    } catch (err: any) {
      logger.warn({ err: err.message, forumId: forumChannel.id }, 'Failed to dispatch to forum channel');
    }
  }

  private static getCategoryThreadName(category: LogCategory): string {
    switch (category) {
      case LogCategory.MODERATION:
        return '🔨 Moderation Logs';
      case LogCategory.MEMBER:
        return '👤 Member Logs';
      case LogCategory.VOICE:
        return '🔊 Voice Logs';
      case LogCategory.MESSAGE:
        return '💬 Message Logs';
      case LogCategory.ROLE:
        return '🎭 Role Logs';
      case LogCategory.CHANNEL:
        return '#️⃣ Channel Logs';
      case LogCategory.SERVER:
      default:
        return '⚙️ Server Logs';
    }
  }

  /**
   * Dispatches a test log entry to verify channel & forum permissions.
   */
  public static async sendTestLog(guild: Guild, category: LogCategory): Promise<boolean> {
    try {
      await this.log({
        guild,
        category,
        eventType: 'TEST_LOG',
        title: `🧪 Test Log - ${category}`,
        description: `This is a verification test log dispatched from the **SMCore Dashboard**. Permissions and routing for \`${category}\` are operational.`,
        colorHex: '#10B981',
        fields: [
          { name: 'Status', value: '✅ Operational', inline: true },
          { name: 'Server', value: guild.name, inline: true },
        ],
      });
      return true;
    } catch (err) {
      return false;
    }
  }
}
