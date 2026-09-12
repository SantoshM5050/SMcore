import { Client, Events, Message, PermissionsBitField } from 'discord.js';
import { ProtectionConfigService } from '../services/protection/protectionConfigService';
import { MentionProtectionService } from '../services/protection/mentionProtectionService';
import { InviteFilterService } from '../services/protection/inviteFilterService';
import { ExternalLinkService } from '../services/protection/externalLinkService';
import { KeywordFilterService } from '../services/protection/keywordFilterService';
import { AntiSpamService } from '../services/protection/antiSpamService';
import { PunishmentService } from '../services/protection/punishmentService';
import { DetectionResult } from '../services/protection/protectionTypes';
import { logger } from '../utils/logger';

export function registerMessageCreateEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message: Message) => {
    // 1. Ignore bot messages, system messages, webhooks, and DMs
    if (message.author.bot || message.system || message.webhookId || !message.guild) {
      return;
    }

    try {
      const member = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
      if (!member) return;

      // 2. Ignore Server Owner and Administrators
      if (
        member.id === message.guild.ownerId ||
        member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return;
      }

      // 3. Load guild protection settings
      const settings = await ProtectionConfigService.getSettings(message.guild.id);

      const content = message.content || '';
      let violation: DetectionResult = { violated: false };

      // 4. Sequential Detector Pipeline:

      // (a) Mass Mention Check
      if (!violation.violated && settings.massMentionEnabled) {
        violation = MentionProtectionService.checkMentions(
          {
            userCount: message.mentions.users.size,
            roleCount: message.mentions.roles.size,
            hasEveryone: message.mentions.everyone,
            hasHere: content.includes('@here'),
          },
          settings
        );
      }

      // (b) Discord Invite Check
      if (!violation.violated && settings.inviteFilterEnabled) {
        violation = InviteFilterService.checkInvites(content, settings);
      }

      // (c) External Link Check
      if (!violation.violated && settings.externalLinkFilterEnabled) {
        violation = ExternalLinkService.checkExternalLinks(content, settings);
      }

      // (d) Prohibited Keyword Check
      if (!violation.violated && settings.keywordFilterEnabled) {
        violation = KeywordFilterService.checkKeywords(content, settings);
      }

      // (e) Anti-Spam Check (message frequency and duplicate content)
      if (!violation.violated && settings.antiSpamEnabled) {
        violation = AntiSpamService.checkSpam(
          message.guild.id,
          message.author.id,
          content,
          settings
        );
      }

      // 5. Apply Automated Punishment if violated
      if (violation.violated) {
        await PunishmentService.applyPunishment(message, violation);
      }
    } catch (err) {
      logger.error(
        { err, messageId: message.id, guildId: message.guild.id, authorId: message.author.id },
        'Error running message protection pipeline'
      );
    }
  });
}
