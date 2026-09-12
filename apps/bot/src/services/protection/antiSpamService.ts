import crypto from 'crypto';
import { GuildProtectionSettings, ProtectionType } from '@smcore/shared';
import { DetectionResult } from './protectionTypes';

interface MemberSpamRecord {
  timestamps: number[];
  messageHashes: { hash: string; time: number }[];
  lastPunished: number;
}

export class AntiSpamService {
  private static tracker = new Map<string, MemberSpamRecord>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  static {
    // Periodic garbage collection to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanupExpiredRecords(), 60 * 1000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  private static getKey(guildId: string, userId: string): string {
    return `${guildId}:${userId}`;
  }

  private static hashContent(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content.trim().toLowerCase())
      .digest('hex');
  }

  /**
   * Evaluates if a message from a member violates the anti-spam policy
   */
  public static checkSpam(
    guildId: string,
    userId: string,
    content: string,
    settings: GuildProtectionSettings,
    now: number = Date.now()
  ): DetectionResult {
    if (!settings.antiSpamEnabled) {
      return { violated: false };
    }

    const key = this.getKey(guildId, userId);
    let record = this.tracker.get(key);

    if (!record) {
      record = {
        timestamps: [],
        messageHashes: [],
        lastPunished: 0,
      };
      this.tracker.set(key, record);
    }

    const windowMs = settings.antiSpamWindowSeconds * 1000;
    const cutoff = now - windowMs;

    // Prune entries outside the sliding window
    record.timestamps = record.timestamps.filter((t) => t >= cutoff);
    record.messageHashes = record.messageHashes.filter((h) => h.time >= cutoff);

    // Record this message
    record.timestamps.push(now);
    const contentHash = this.hashContent(content);
    record.messageHashes.push({ hash: contentHash, time: now });

    // Cooldown check: prevent duplicate punishments for the same ongoing spam burst
    const COOLDOWN_MS = 10 * 1000;
    if (now - record.lastPunished < COOLDOWN_MS) {
      return {
        violated: true,
        protectionType: ProtectionType.SPAM,
        reason: 'Message blocked due to active anti-spam cooldown',
        punishment: settings.antiSpamPunishment,
        deleteMessage: true,
      };
    }

    // 1. Message Frequency Rate Check
    if (record.timestamps.length > settings.antiSpamMessageLimit) {
      record.lastPunished = now;
      return {
        violated: true,
        protectionType: ProtectionType.SPAM,
        reason: `Exceeded message frequency limit (${record.timestamps.length}/${settings.antiSpamMessageLimit} in ${settings.antiSpamWindowSeconds}s)`,
        punishment: settings.antiSpamPunishment,
        deleteMessage: settings.deleteViolatingMessages,
        metadata: {
          messageCount: record.timestamps.length,
          limit: settings.antiSpamMessageLimit,
          windowSeconds: settings.antiSpamWindowSeconds,
        },
      };
    }

    // 2. Duplicate Message Check (only if message has substantive content)
    if (content.trim().length > 3) {
      const duplicateCount = record.messageHashes.filter((h) => h.hash === contentHash).length;
      if (duplicateCount >= settings.duplicateMessageLimit) {
        record.lastPunished = now;
        return {
          violated: true,
          protectionType: ProtectionType.SPAM,
          reason: `Sent ${duplicateCount} duplicate messages within ${settings.antiSpamWindowSeconds}s`,
          punishment: settings.antiSpamPunishment,
          deleteMessage: settings.deleteViolatingMessages,
          metadata: {
            duplicateCount,
            limit: settings.duplicateMessageLimit,
          },
        };
      }
    }

    return { violated: false };
  }

  /**
   * Cleans up stale tracking records older than 2 minutes
   */
  public static cleanupExpiredRecords(now: number = Date.now()): void {
    const STALE_THRESHOLD = 120 * 1000;
    for (const [key, record] of this.tracker.entries()) {
      const latestActivity = Math.max(
        record.lastPunished,
        record.timestamps[record.timestamps.length - 1] || 0
      );
      if (now - latestActivity > STALE_THRESHOLD) {
        this.tracker.delete(key);
      }
    }
  }

  /**
   * Resets all in-memory trackers (useful for unit tests)
   */
  public static resetTracker(): void {
    this.tracker.clear();
  }
}
