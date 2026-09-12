import {
  AuditAction,
  AuditEventType,
  AuditLogCreate,
  AuditLogEntry,
  AuditLogQuery,
  AuditTargetType,
} from '@smcore/shared';

export interface AuditLogQueryResult {
  data: AuditLogEntry[];
  nextCursor: string | null;
  total?: number;
  fallback?: boolean;
}

export interface NativeDiscordAuditEntry {
  id: string;
  action: number;
  executorId: string | null;
  targetId: string | null;
  reason: string | null;
  createdAt: Date;
  extra?: unknown;
}

export interface NativeAuditResult {
  success: boolean;
  entries: NativeDiscordAuditEntry[];
  error?: string;
}

export interface RetentionCleanupResult {
  guildId: string;
  deletedCount: number;
  cutoffDate: Date;
}
