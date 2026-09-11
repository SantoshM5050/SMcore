import { Message, TextChannel } from 'discord.js';
import {
  prisma,
  AutoModAction,
  LogCategory,
} from '@repo/database';
import { ModerationService } from './moderationService';
import { LogService } from './logService';
import { logger } from '../logger';

interface MessageTracker {
  timestamps: number[];
  contents: string[];
}

export class AutoModService {
  // In-memory sliding window cache: key = `${guildId}:${userId}`
  private static userMessageMap: Map<string, MessageTracker> = new Map();

  /**
   * Main inspection pipeline for incoming messages.
   * Returns true if message was deleted/punished by AutoMod.
   */
  public static async processMessage(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot || !message.member) {
      return false;
    }

    const { guild, member, channel, content } = message;

    // Check if AutoMod is enabled for guild
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings || !settings.autoModEnabled) {
      return false;
    }

    const memberRoleIds = Array.from(member.roles.cache.keys());

    // 1. Anti-Invite Check
    if (settings.antiInviteEnabled) {
      const inviteConfig = await prisma.antiInviteConfig.findUnique({
        where: { guildId: guild.id },
      });

      if (inviteConfig && inviteConfig.enabled) {
        const isExempt =
          inviteConfig.exemptChannelIds.includes(channel.id) ||
          memberRoleIds.some((r) => inviteConfig.exemptRoleIds.includes(r));

        if (!isExempt) {
          const inviteRegex = /(discord\.(gg|io|me|li)\/.+|discordapp\.com\/invite\/.+|discord\.com\/invite\/.+)/i;
          if (inviteRegex.test(content)) {
            await this.handleViolation(
              message,
              'Anti-Invite',
              'Posting Discord server invite links is prohibited.',
              inviteConfig.action,
              inviteConfig.timeoutMinutes
            );
            return true;
          }
        }
      }
    }

    // 2. Anti-Link Check
    if (settings.antiLinkEnabled) {
      const linkConfig = await prisma.antiLinkConfig.findUnique({
        where: { guildId: guild.id },
      });

      if (linkConfig && linkConfig.enabled) {
        const isExempt =
          linkConfig.exemptChannelIds.includes(channel.id) ||
          memberRoleIds.some((r) => linkConfig.exemptRoleIds.includes(r));

        if (!isExempt) {
          const urlRegex = /(https?:\/\/[^\s]+)/gi;
          const urls = content.match(urlRegex);

          if (urls && urls.length > 0) {
            let blocked = false;

            for (const urlStr of urls) {
              try {
                const parsedUrl = new URL(urlStr);
                const hostname = parsedUrl.hostname.toLowerCase();

                // Whitelisted domains
                if (linkConfig.whitelistedDomains.some((d) => hostname.includes(d.toLowerCase()))) {
                  continue;
                }

                // YouTube check
                if (linkConfig.allowYouTube && (hostname.includes('youtube.com') || hostname.includes('youtu.be'))) {
                  continue;
                }

                // Twitch check
                if (linkConfig.allowTwitch && hostname.includes('twitch.tv')) {
                  continue;
                }

                // Discord check
                if (linkConfig.allowDiscordLinks && (hostname.includes('discord.com') || hostname.includes('discord.gg'))) {
                  continue;
                }

                // Blacklisted domains or blockAll
                if (linkConfig.blockAll || linkConfig.blacklistedDomains.some((d) => hostname.includes(d.toLowerCase()))) {
                  blocked = true;
                  break;
                }
              } catch {
                // Invalid URL string
              }
            }

            if (blocked) {
              await this.handleViolation(
                message,
                'Anti-Link',
                'Posting unauthorized external links is prohibited.',
                linkConfig.action,
                linkConfig.timeoutMinutes
              );
              return true;
            }
          }
        }
      }
    }

    // 3. Anti-Mention Check
    if (settings.antiMentionEnabled) {
      const mentionConfig = await prisma.antiMentionConfig.findUnique({
        where: { guildId: guild.id },
      });

      if (mentionConfig && mentionConfig.enabled) {
        const isExempt =
          mentionConfig.exemptChannelIds.includes(channel.id) ||
          memberRoleIds.some((r) => mentionConfig.exemptRoleIds.includes(r));

        if (!isExempt) {
          let violated = false;
          let reason = '';

          if (mentionConfig.blockEveryone && (content.includes('@everyone') || content.includes('@here'))) {
            violated = true;
            reason = 'Unauthorized @everyone or @here mention';
          } else if (message.mentions.users.size > mentionConfig.maxUserMentions) {
            violated = true;
            reason = `Excessive user mentions (${message.mentions.users.size}/${mentionConfig.maxUserMentions})`;
          } else if (message.mentions.roles.size > mentionConfig.maxRoleMentions) {
            violated = true;
            reason = `Excessive role mentions (${message.mentions.roles.size}/${mentionConfig.maxRoleMentions})`;
          }

          if (violated) {
            await this.handleViolation(
              message,
              'Anti-Mention',
              reason,
              mentionConfig.action,
              mentionConfig.timeoutMinutes
            );
            return true;
          }
        }
      }
    }

    // 4. Anti-Spam Check (Rate limit & duplicates)
    if (settings.antiSpamEnabled) {
      const spamConfig = await prisma.antiSpamConfig.findUnique({
        where: { guildId: guild.id },
      });

      if (spamConfig && spamConfig.enabled) {
        const isExempt =
          spamConfig.exemptChannelIds.includes(channel.id) ||
          memberRoleIds.some((r) => spamConfig.exemptRoleIds.includes(r));

        if (!isExempt) {
          const now = Date.now();
          const trackerKey = `${guild.id}:${member.id}`;
          const tracker = this.userMessageMap.get(trackerKey) || { timestamps: [], contents: [] };

          const windowMs = spamConfig.timeWindowSeconds * 1000;
          tracker.timestamps = tracker.timestamps.filter((t) => now - t < windowMs);
          tracker.contents = tracker.contents.slice(-10);

          tracker.timestamps.push(now);
          tracker.contents.push(content.trim().toLowerCase());
          this.userMessageMap.set(trackerKey, tracker);

          // Check frequency
          if (tracker.timestamps.length > spamConfig.maxMessages) {
            await this.handleViolation(
              message,
              'Anti-Spam',
              `Sending messages too quickly (${tracker.timestamps.length} msgs in ${spamConfig.timeWindowSeconds}s)`,
              spamConfig.action,
              spamConfig.timeoutMinutes
            );
            return true;
          }

          // Check duplicate content
          const duplicates = tracker.contents.filter((c) => c === content.trim().toLowerCase() && c.length > 3);
          if (duplicates.length >= spamConfig.maxDuplicates) {
            await this.handleViolation(
              message,
              'Anti-Spam',
              `Repeated message spam detected (${duplicates.length} duplicate messages)`,
              spamConfig.action,
              spamConfig.timeoutMinutes
            );
            return true;
          }
        }
      }
    }

    // 5. Blocked Words & Regex Rules (AutoModRule table)
    const customRules = await prisma.autoModRule.findMany({
      where: { guildId: guild.id, enabled: true },
    });

    for (const rule of customRules) {
      const isExempt =
        rule.exemptChannelIds.includes(channel.id) ||
        memberRoleIds.some((r) => rule.exemptRoleIds.includes(r));

      if (isExempt) continue;

      if (rule.ruleType === 'BLOCKED_WORDS' && rule.patterns.length > 0) {
        const lower = content.toLowerCase();
        const matchedWord = rule.patterns.find((word) => lower.includes(word.toLowerCase()));
        if (matchedWord) {
          await this.handleViolation(
            message,
            'AutoMod Filter',
            `Message contained blocked term: \`${matchedWord}\``,
            rule.action,
            rule.timeoutDurationMinutes || 10
          );
          return true;
        }
      } else if (rule.ruleType === 'CAPS_ABUSE' && content.length > 10) {
        const letters = content.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 8) {
          const upper = letters.replace(/[^A-Z]/g, '').length;
          const ratio = upper / letters.length;
          if (ratio > 0.75) {
            await this.handleViolation(
              message,
              'AutoMod Filter',
              `Excessive capital letters (${Math.round(ratio * 100)}% caps)`,
              rule.action,
              rule.timeoutDurationMinutes || 10
            );
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Executes configured punishment for a violation.
   */
  private static async handleViolation(
    message: Message,
    filterName: string,
    reason: string,
    action: AutoModAction,
    timeoutMinutes: number
  ): Promise<void> {
    const { guild, member, channel, author } = message;
    if (!guild || !member) return;

    // 1. Delete message
    await message.delete().catch(() => null);

    // 2. Alert in channel briefly
    const alertMsg = await (channel as TextChannel)
      .send(`⚠️ <@${author.id}>, your message was removed by **${filterName}** (${reason}).`)
      .catch(() => null);

    if (alertMsg) {
      setTimeout(() => alertMsg.delete().catch(() => null), 5000);
    }

    // 3. Apply Action
    if (action === AutoModAction.TIMEOUT) {
      await ModerationService.timeout(
        guild,
        null,
        member,
        timeoutMinutes,
        `[AutoMod: ${filterName}] ${reason}`
      );
    } else if (action === AutoModAction.WARN) {
      await ModerationService.warn(
        guild,
        null,
        member,
        `[AutoMod: ${filterName}] ${reason}`
      );
    } else if (action === AutoModAction.KICK) {
      await ModerationService.kick(
        guild,
        null,
        member,
        `[AutoMod: ${filterName}] ${reason}`
      );
    } else if (action === AutoModAction.BAN) {
      await ModerationService.ban(
        guild,
        null,
        author,
        `[AutoMod: ${filterName}] ${reason}`
      );
    }

    // 4. Dispatch Moderation Log
    await LogService.log({
      guild,
      category: LogCategory.MODERATION,
      eventType: 'AUTOMOD_TRIGGERED',
      title: `🛡️ AutoMod Triggered: ${filterName}`,
      targetId: author.id,
      targetTag: author.tag,
      channelId: channel.id,
      colorHex: '#F97316',
      fields: [
        { name: 'Target', value: `<@${author.id}> (${author.id})`, inline: true },
        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'Filter', value: filterName, inline: true },
        { name: 'Action Taken', value: action, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Message Content', value: `\`\`\`${message.content.slice(0, 500)}\`\`\``, inline: false },
      ],
    });
  }
}
