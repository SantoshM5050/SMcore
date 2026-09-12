import {
  AuditLogEvent,
  Guild,
  PermissionsBitField,
  UserResolvable,
} from 'discord.js';
import { NativeAuditResult, NativeDiscordAuditEntry } from './auditTypes';
import { logger } from '../../utils/logger';

export interface FetchNativeAuditOptions {
  limit?: number;
  actionType?: AuditLogEvent;
  user?: UserResolvable;
}

export class DiscordAuditLogService {
  /**
   * Fetches native Discord audit logs with strict permission validation and error handling.
   * Does NOT continuously poll Discord; provides an on-demand retrieval foundation.
   */
  public static async fetchNativeAuditLogs(
    guild: Guild,
    options: FetchNativeAuditOptions = {}
  ): Promise<NativeAuditResult> {
    const botMember = guild.members.me;

    // 1. Verify bot has ViewAuditLog permission
    if (
      !botMember ||
      !botMember.permissions.has(PermissionsBitField.Flags.ViewAuditLog)
    ) {
      logger.warn(
        { guildId: guild.id },
        'Bot lacks ViewAuditLog permission to read native Discord audit logs'
      );
      return {
        success: false,
        error: 'MISSING_PERMISSIONS: Bot requires ViewAuditLog permission',
        entries: [],
      };
    }

    const limit = Math.min(Math.max(1, options.limit || 25), 100);

    try {
      const logs = await guild.fetchAuditLogs({
        limit,
        type: options.actionType,
        user: options.user,
      });

      const entries: NativeDiscordAuditEntry[] = logs.entries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        executorId: entry.executorId,
        targetId: entry.targetId,
        reason: entry.reason,
        createdAt: entry.createdAt,
        extra: entry.extra,
      }));

      return {
        success: true,
        entries,
      };
    } catch (err: any) {
      logger.error(
        { err: err?.message || err, guildId: guild.id },
        'Error retrieving native Discord audit logs'
      );
      return {
        success: false,
        error: err?.message || 'Failed to fetch native Discord audit logs',
        entries: [],
      };
    }
  }
}
