import { prisma } from '@smcore/database';
import {
  GuildTicketSettings,
  GuildTicketSettingsSchema,
  GuildTicketSettingsUpdate,
  GuildTicketSettingsUpdateSchema,
} from '@smcore/shared';
import { logger } from '../../utils/logger';
import { GuildTicketSettingsDTO } from './ticketTypes';

const DEFAULT_SETTINGS = (guildId: string): GuildTicketSettingsDTO => ({
  id: `default-${guildId}`,
  guildId,
  enabled: true,
  ticketCategoryChannelId: null,
  ticketLogChannelId: null,
  transcriptChannelId: null,
  supportRoleIds: [],
  maxOpenTicketsPerUser: 3,
  cooldownSeconds: 60,
  autoCloseEnabled: false,
  autoCloseHours: 24,
  allowUserClose: true,
  allowReopen: true,
  deleteAfterClose: false,
  transcriptEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export class TicketConfigService {
  private static settingsCache = new Map<string, { settings: GuildTicketSettingsDTO; cachedAt: number }>();
  private static CACHE_TTL_MS = 60_000;

  /**
   * Retrieves guild ticket settings with caching and safe offline fallback
   */
  public static async getSettings(guildId: string): Promise<GuildTicketSettingsDTO> {
    const cached = this.settingsCache.get(guildId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.settings;
    }

    try {
      const record = await prisma.guildTicketSettings.findUnique({
        where: { guildId },
      });

      if (record) {
        const dto: GuildTicketSettingsDTO = {
          ...record,
          supportRoleIds: record.supportRoleIds || [],
        };
        this.settingsCache.set(guildId, { settings: dto, cachedAt: Date.now() });
        return dto;
      }

      // Create default if not found
      const defaultData = DEFAULT_SETTINGS(guildId);
      try {
        const created = await prisma.guildTicketSettings.create({
          data: {
            guildId,
            enabled: defaultData.enabled,
            maxOpenTicketsPerUser: defaultData.maxOpenTicketsPerUser,
            cooldownSeconds: defaultData.cooldownSeconds,
            autoCloseEnabled: defaultData.autoCloseEnabled,
            autoCloseHours: defaultData.autoCloseHours,
            allowUserClose: defaultData.allowUserClose,
            allowReopen: defaultData.allowReopen,
            deleteAfterClose: defaultData.deleteAfterClose,
            transcriptEnabled: defaultData.transcriptEnabled,
          },
        });
        const dto: GuildTicketSettingsDTO = {
          ...created,
          supportRoleIds: created.supportRoleIds || [],
        };
        this.settingsCache.set(guildId, { settings: dto, cachedAt: Date.now() });
        return dto;
      } catch {
        this.settingsCache.set(guildId, { settings: defaultData, cachedAt: Date.now() });
        return defaultData;
      }
    } catch (err) {
      logger.warn({ guildId, err }, 'Failed to query ticket settings from DB, using fallback defaults');
      const fallback = DEFAULT_SETTINGS(guildId);
      this.settingsCache.set(guildId, { settings: fallback, cachedAt: Date.now() });
      return fallback;
    }
  }

  /**
   * Updates guild ticket settings
   */
  public static async updateSettings(
    guildId: string,
    update: GuildTicketSettingsUpdate
  ): Promise<GuildTicketSettingsDTO> {
    const parsed = GuildTicketSettingsUpdateSchema.parse(update);
    const current = await this.getSettings(guildId);

    const merged: GuildTicketSettingsDTO = {
      ...current,
      ...parsed,
      supportRoleIds: parsed.supportRoleIds !== undefined ? parsed.supportRoleIds : current.supportRoleIds,
      updatedAt: new Date(),
    };

    try {
      const record = await prisma.guildTicketSettings.upsert({
        where: { guildId },
        create: {
          guildId,
          ...parsed,
        },
        update: parsed,
      });

      const dto: GuildTicketSettingsDTO = {
        ...record,
        supportRoleIds: record.supportRoleIds || [],
      };
      this.settingsCache.set(guildId, { settings: dto, cachedAt: Date.now() });
      return dto;
    } catch (err) {
      logger.warn({ guildId, err }, 'Failed to update ticket settings in DB, updated memory cache');
      this.settingsCache.set(guildId, { settings: merged, cachedAt: Date.now() });
      return merged;
    }
  }

  /**
   * Checks if ticket system is enabled for a guild
   */
  public static async isEnabled(guildId: string): Promise<boolean> {
    const settings = await this.getSettings(guildId);
    return settings.enabled;
  }

  /**
   * Clears cached settings (e.g. for testing)
   */
  public static clearCache(guildId?: string): void {
    if (guildId) {
      this.settingsCache.delete(guildId);
    } else {
      this.settingsCache.clear();
    }
  }
}
