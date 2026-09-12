import { prisma } from '@smcore/database';
import {
  GuildSecuritySettings,
  SecurityAction,
} from '@smcore/shared';
import { logger } from '../../utils/logger';

interface CacheEntry {
  settings: GuildSecuritySettings;
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

export class SecurityConfigService {
  private static cache = new Map<string, CacheEntry>();

  public static getDefaultSettings(guildId: string): GuildSecuritySettings {
    return {
      guildId,
      enabled: false,

      raidDetectionEnabled: false,
      raidJoinThreshold: 10,
      raidWindowSeconds: 10,
      raidModeDurationSeconds: 300,
      raidAction: SecurityAction.QUARANTINE,

      accountAgeProtectionEnabled: false,
      minimumAccountAgeHours: 24,
      accountAgeAction: SecurityAction.QUARANTINE,

      quarantineEnabled: false,
      quarantineRoleId: null,
      removeRolesOnQuarantine: false,
      restoreRolesOnRelease: false,
    };
  }

  public static async getSettings(guildId: string): Promise<GuildSecuritySettings> {
    const cached = this.cache.get(guildId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.settings;
    }

    try {
      const record = await prisma.guildSecuritySettings.findUnique({
        where: { guildId },
      });

      if (!record) {
        const defaults = this.getDefaultSettings(guildId);
        this.cache.set(guildId, { settings: defaults, cachedAt: Date.now() });
        return defaults;
      }

      const settings: GuildSecuritySettings = {
        guildId: record.guildId,
        enabled: record.enabled,

        raidDetectionEnabled: record.raidDetectionEnabled,
        raidJoinThreshold: record.raidJoinThreshold,
        raidWindowSeconds: record.raidWindowSeconds,
        raidModeDurationSeconds: record.raidModeDurationSeconds,
        raidAction: record.raidAction as SecurityAction,

        accountAgeProtectionEnabled: record.accountAgeProtectionEnabled,
        minimumAccountAgeHours: record.minimumAccountAgeHours,
        accountAgeAction: record.accountAgeAction as SecurityAction,

        quarantineEnabled: record.quarantineEnabled,
        quarantineRoleId: record.quarantineRoleId,
        removeRolesOnQuarantine: record.removeRolesOnQuarantine,
        restoreRolesOnRelease: record.restoreRolesOnRelease,
      };

      this.cache.set(guildId, { settings, cachedAt: Date.now() });
      return settings;
    } catch (err) {
      logger.warn({ err, guildId }, 'Failed to load security settings from DB, using defaults');
      const defaults = this.getDefaultSettings(guildId);
      this.cache.set(guildId, { settings: defaults, cachedAt: Date.now() });
      return defaults;
    }
  }

  public static invalidateCache(guildId: string): void {
    this.cache.delete(guildId);
  }
}
