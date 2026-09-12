import { prisma } from '@smcore/database';
import { GuildProtectionSettings, AutoModPunishment } from '@smcore/shared';
import { logger } from '../../utils/logger';

interface CacheEntry {
  settings: GuildProtectionSettings;
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 1000; // 1 minute cache TTL

export class ProtectionConfigService {
  private static cache = new Map<string, CacheEntry>();

  public static getDefaultSettings(guildId: string): GuildProtectionSettings {
    return {
      guildId,
      antiSpamEnabled: false,
      antiSpamMessageLimit: 5,
      antiSpamWindowSeconds: 5,
      duplicateMessageLimit: 3,
      antiSpamPunishment: AutoModPunishment.TIMEOUT,

      massMentionEnabled: false,
      maxUserMentions: 5,
      maxRoleMentions: 3,
      maxTotalMentions: 6,
      everyoneMentionAllowed: false,
      massMentionPunishment: AutoModPunishment.TIMEOUT,

      inviteFilterEnabled: false,
      allowedInviteGuilds: [],
      inviteFilterPunishment: AutoModPunishment.DELETE,

      externalLinkFilterEnabled: false,
      allowedDomains: [],
      blockedDomains: [],
      externalLinkPunishment: AutoModPunishment.DELETE,

      keywordFilterEnabled: false,
      prohibitedKeywords: [],
      keywordPunishment: AutoModPunishment.DELETE,

      deleteViolatingMessages: true,
    };
  }

  public static async getSettings(guildId: string): Promise<GuildProtectionSettings> {
    const cached = this.cache.get(guildId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.settings;
    }

    try {
      const record = await prisma.guildProtectionSettings.findUnique({
        where: { guildId },
      });

      if (!record) {
        const defaults = this.getDefaultSettings(guildId);
        this.cache.set(guildId, { settings: defaults, cachedAt: Date.now() });
        return defaults;
      }

      const settings: GuildProtectionSettings = {
        guildId: record.guildId,
        antiSpamEnabled: record.antiSpamEnabled,
        antiSpamMessageLimit: record.antiSpamMessageLimit,
        antiSpamWindowSeconds: record.antiSpamWindowSeconds,
        duplicateMessageLimit: record.duplicateMessageLimit,
        antiSpamPunishment: record.antiSpamPunishment as AutoModPunishment,

        massMentionEnabled: record.massMentionEnabled,
        maxUserMentions: record.maxUserMentions,
        maxRoleMentions: record.maxRoleMentions,
        maxTotalMentions: record.maxTotalMentions,
        everyoneMentionAllowed: record.everyoneMentionAllowed,
        massMentionPunishment: record.massMentionPunishment as AutoModPunishment,

        inviteFilterEnabled: record.inviteFilterEnabled,
        allowedInviteGuilds: record.allowedInviteGuilds,
        inviteFilterPunishment: record.inviteFilterPunishment as AutoModPunishment,

        externalLinkFilterEnabled: record.externalLinkFilterEnabled,
        allowedDomains: record.allowedDomains,
        blockedDomains: record.blockedDomains,
        externalLinkPunishment: record.externalLinkPunishment as AutoModPunishment,

        keywordFilterEnabled: record.keywordFilterEnabled,
        prohibitedKeywords: record.prohibitedKeywords,
        keywordPunishment: record.keywordPunishment as AutoModPunishment,

        deleteViolatingMessages: record.deleteViolatingMessages,
      };

      this.cache.set(guildId, { settings, cachedAt: Date.now() });
      return settings;
    } catch (err) {
      logger.warn({ err, guildId }, 'Failed to load protection settings from DB, using defaults');
      const defaults = this.getDefaultSettings(guildId);
      this.cache.set(guildId, { settings: defaults, cachedAt: Date.now() });
      return defaults;
    }
  }

  public static invalidateCache(guildId: string): void {
    this.cache.delete(guildId);
  }
}
