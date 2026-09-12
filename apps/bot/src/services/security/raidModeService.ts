import { RaidModeState } from './securityTypes';
import { logger } from '../../utils/logger';

interface RaidModeEntry {
  state: RaidModeState;
  timer?: NodeJS.Timeout;
}

export class RaidModeService {
  private static activeRaidModes = new Map<string, RaidModeEntry>();

  /**
   * Activates automated raid lockdown mode for a guild with an auto-expiration timer.
   */
  public static activateRaidMode(
    guildId: string,
    durationSeconds: number,
    reason: string,
    currentJoinCount: number,
    threshold: number,
    windowSeconds: number
  ): RaidModeState {
    const existing = this.activeRaidModes.get(guildId);
    if (existing?.timer) {
      clearTimeout(existing.timer);
    }

    const now = new Date();
    const durationMs = durationSeconds * 1000;
    const expiresAt = new Date(now.getTime() + durationMs);

    const state: RaidModeState = {
      active: true,
      triggeredAt: now,
      expiresAt,
      reason,
      currentJoinCount,
      threshold,
      windowSeconds,
    };

    const timer = setTimeout(() => {
      this.deactivateRaidMode(guildId);
      logger.info({ guildId }, 'Raid mode auto-expired and has been deactivated');
    }, durationMs);

    // Prevent timer from keeping the process alive during test teardown or shutdown
    if (timer.unref) {
      timer.unref();
    }

    this.activeRaidModes.set(guildId, { state, timer });

    logger.warn(
      { guildId, durationSeconds, joinCount: currentJoinCount, threshold, reason },
      '🚨 RAID MODE ACTIVATED for guild'
    );

    return state;
  }

  /**
   * Manually or automatically deactivates raid mode for a guild.
   */
  public static deactivateRaidMode(guildId: string): void {
    const entry = this.activeRaidModes.get(guildId);
    if (entry) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      this.activeRaidModes.delete(guildId);
      logger.info({ guildId }, 'Raid mode deactivated');
    }
  }

  /**
   * Checks whether raid mode is currently active and not expired.
   */
  public static isRaidModeActive(guildId: string): boolean {
    const entry = this.activeRaidModes.get(guildId);
    if (!entry || !entry.state.active) return false;

    if (entry.state.expiresAt && Date.now() > entry.state.expiresAt.getTime()) {
      this.deactivateRaidMode(guildId);
      return false;
    }

    return true;
  }

  /**
   * Retrieves the current raid mode state for a guild, if any.
   */
  public static getRaidModeState(guildId: string): RaidModeState | null {
    if (!this.isRaidModeActive(guildId)) {
      return null;
    }
    return this.activeRaidModes.get(guildId)?.state || null;
  }

  /**
   * Resets active raid modes (useful for testing).
   */
  public static reset(guildId?: string): void {
    if (guildId) {
      this.deactivateRaidMode(guildId);
    } else {
      for (const entry of this.activeRaidModes.values()) {
        if (entry.timer) clearTimeout(entry.timer);
      }
      this.activeRaidModes.clear();
    }
  }
}
