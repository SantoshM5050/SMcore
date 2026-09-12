import { GuildSecuritySettings } from '@smcore/shared';

export interface RaidDetectionResult {
  isRaid: boolean;
  joinCount: number;
  threshold: number;
  windowSeconds: number;
}

export class RaidDetectionService {
  private static guildJoinHistory = new Map<string, number[]>();

  /**
   * Records a member join event within an in-memory sliding window and prunes expired entries.
   */
  public static recordJoin(
    guildId: string,
    windowSeconds: number,
    now: number = Date.now()
  ): number {
    const cutoff = now - windowSeconds * 1000;
    const history = this.guildJoinHistory.get(guildId) || [];

    // Filter out timestamps outside the sliding window
    const activeJoins = history.filter((timestamp) => timestamp > cutoff);
    activeJoins.push(now);

    this.guildJoinHistory.set(guildId, activeJoins);
    return activeJoins.length;
  }

  /**
   * Evaluates if the current join pushes the join rate over the configured raid threshold.
   */
  public static checkRaid(
    guildId: string,
    settings: GuildSecuritySettings,
    now: number = Date.now()
  ): RaidDetectionResult {
    if (!settings.raidDetectionEnabled) {
      return {
        isRaid: false,
        joinCount: 0,
        threshold: settings.raidJoinThreshold,
        windowSeconds: settings.raidWindowSeconds,
      };
    }

    const count = this.recordJoin(guildId, settings.raidWindowSeconds, now);
    const isRaid = count >= settings.raidJoinThreshold;

    return {
      isRaid,
      joinCount: count,
      threshold: settings.raidJoinThreshold,
      windowSeconds: settings.raidWindowSeconds,
    };
  }

  /**
   * Retrieves the current join count within the specified window without recording a new join.
   */
  public static getRecentJoinCount(
    guildId: string,
    windowSeconds: number,
    now: number = Date.now()
  ): number {
    const cutoff = now - windowSeconds * 1000;
    const history = this.guildJoinHistory.get(guildId) || [];
    return history.filter((timestamp) => timestamp > cutoff).length;
  }

  /**
   * Clears in-memory join records (useful for testing or manual resets).
   */
  public static reset(guildId?: string): void {
    if (guildId) {
      this.guildJoinHistory.delete(guildId);
    } else {
      this.guildJoinHistory.clear();
    }
  }
}
