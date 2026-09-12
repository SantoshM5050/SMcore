import { prisma } from '@smcore/database';
import {
  AuditAction,
  AuditEventType,
  AuditLogCreate,
  AuditLogCreateSchema,
  AuditLogEntry,
  AuditTargetType,
  AutoModPunishment,
  ProtectionType,
  SecurityAction,
  SecurityEventType,
} from '@smcore/shared';
import {
  AutoModEventPayload,
  eventBus,
  ModerationEventPayload,
  SecurityEventPayload,
  TicketEventPayload,
} from '../events/eventBus';
import { logger } from '../../utils/logger';

const SENSITIVE_KEY_REGEX = /(token|secret|password|passwd|credential|auth|cookie|api_?key|private_?key)/i;
const MAX_METADATA_STRING_LEN = 1000;

export class AuditLogService {
  private static initialized = false;

  /**
   * Initializes event bus subscriptions for automatic audit log ingestion
   */
  public static initialize(): void {
    if (this.initialized) return;

    eventBus.on('audit.log', async (data: AuditLogCreate) => {
      await this.createAuditLog(data).catch(() => null);
    });

    eventBus.on('moderation.action', async (payload: ModerationEventPayload) => {
      await this.handleModerationEvent(payload).catch(() => null);
    });

    eventBus.on('automod.violation', async (payload: AutoModEventPayload) => {
      await this.handleAutoModEvent(payload).catch(() => null);
    });

    eventBus.on('security.alert', async (payload: SecurityEventPayload) => {
      await this.handleSecurityEvent(payload).catch(() => null);
    });

    eventBus.on('ticket.event', async (payload: TicketEventPayload) => {
      await this.handleTicketEvent(payload).catch(() => null);
    });

    this.initialized = true;
    logger.info('AuditLogService subscriptions initialized successfully');
  }

  /**
   * Creates and persists an audit log entry to the database safely
   */
  public static async createAuditLog(
    data: AuditLogCreate
  ): Promise<AuditLogEntry | null> {
    const parseResult = AuditLogCreateSchema.safeParse(data);
    if (!parseResult.success) {
      logger.warn(
        { errors: parseResult.error.format(), guildId: data.guildId },
        'Invalid audit log payload rejected'
      );
      return null;
    }

    const validData = parseResult.data;
    const sanitizedMeta = this.sanitizeMetadata(validData.metadata);

    try {
      const created = await prisma.auditLog.create({
        data: {
          guildId: validData.guildId,
          eventType: validData.eventType,
          action: validData.action,
          actorUserId: validData.actorUserId ?? null,
          targetUserId: validData.targetUserId ?? null,
          targetType: validData.targetType ?? null,
          channelId: validData.channelId ?? null,
          caseId: validData.caseId ?? null,
          reason: validData.reason ? validData.reason.slice(0, 1000) : null,
          metadata: (sanitizedMeta as any) ?? undefined,
        },
      });

      return {
        id: created.id,
        guildId: created.guildId,
        eventType: created.eventType as AuditEventType,
        action: created.action as AuditAction,
        actorUserId: created.actorUserId,
        targetUserId: created.targetUserId,
        targetType: (created.targetType as AuditTargetType) ?? undefined,
        channelId: created.channelId,
        caseId: created.caseId,
        reason: created.reason,
        metadata: (created.metadata as Record<string, unknown>) ?? undefined,
        createdAt: created.createdAt,
      };
    } catch (err) {
      logger.warn(
        { err, guildId: validData.guildId, action: validData.action },
        'Failed to persist audit log to database (database unavailable or disconnected)'
      );
      return null;
    }
  }

  /**
   * Sanitizes and strips sensitive security tokens, passwords, and bounds string lengths
   */
  public static sanitizeMetadata(
    metadata?: Record<string, unknown> | null
  ): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== 'object') return null;

    const sanitized: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(metadata)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      if (typeof val === 'string') {
        sanitized[key] = val.length > MAX_METADATA_STRING_LEN
          ? `${val.slice(0, MAX_METADATA_STRING_LEN)}...[truncated]`
          : val;
      } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        sanitized[key] = this.sanitizeMetadata(val as Record<string, unknown>);
      } else {
        sanitized[key] = val;
      }
    }

    return sanitized;
  }

  // --- Handlers for domain events ---

  private static async handleModerationEvent(
    payload: ModerationEventPayload
  ): Promise<void> {
    await this.createAuditLog({
      guildId: payload.guildId,
      eventType: AuditEventType.MODERATION_ACTION,
      action: payload.action,
      actorUserId: payload.actorUserId,
      targetUserId: payload.targetUserId,
      targetType: AuditTargetType.USER,
      channelId: payload.channelId,
      caseId: payload.caseId,
      reason: payload.reason,
      metadata: payload.metadata,
    });
  }

  private static async handleAutoModEvent(
    payload: AutoModEventPayload
  ): Promise<void> {
    let eventType = AuditEventType.AUTOMOD_TRIGGERED;
    switch (payload.protectionType) {
      case ProtectionType.SPAM:
        eventType = AuditEventType.SPAM_DETECTED;
        break;
      case ProtectionType.MASS_MENTION:
        eventType = AuditEventType.MASS_MENTION_DETECTED;
        break;
      case ProtectionType.DISCORD_INVITE:
        eventType = AuditEventType.DISCORD_INVITE_DETECTED;
        break;
      case ProtectionType.EXTERNAL_LINK:
        eventType = AuditEventType.EXTERNAL_LINK_DETECTED;
        break;
      case ProtectionType.PROHIBITED_KEYWORD:
        eventType = AuditEventType.PROHIBITED_KEYWORD_DETECTED;
        break;
    }

    let action = AuditAction.DELETE_MESSAGE;
    switch (payload.punishment) {
      case AutoModPunishment.WARN:
        action = AuditAction.WARN;
        break;
      case AutoModPunishment.TIMEOUT:
        action = AuditAction.TIMEOUT;
        break;
      case AutoModPunishment.KICK:
        action = AuditAction.KICK;
        break;
      case AutoModPunishment.BAN:
        action = AuditAction.BAN;
        break;
      case AutoModPunishment.DELETE:
      default:
        action = AuditAction.DELETE_MESSAGE;
        break;
    }

    await this.createAuditLog({
      guildId: payload.guildId,
      eventType,
      action,
      actorUserId: 'AUTOMOD',
      targetUserId: payload.authorId,
      targetType: AuditTargetType.USER,
      channelId: payload.channelId,
      reason: payload.reason || `AutoMod triggered: ${payload.protectionType}`,
      metadata: {
        protectionType: payload.protectionType,
        punishment: payload.punishment,
        messageId: payload.messageId,
        ...payload.metadata,
      },
    });
  }

  private static async handleSecurityEvent(
    payload: SecurityEventPayload
  ): Promise<void> {
    let eventType = AuditEventType.SECURITY_EVENT;
    switch (payload.eventType) {
      case SecurityEventType.SUSPICIOUS_JOIN:
        eventType = AuditEventType.SUSPICIOUS_JOIN;
        break;
      case SecurityEventType.ACCOUNT_TOO_YOUNG:
        eventType = AuditEventType.ACCOUNT_TOO_YOUNG;
        break;
      case SecurityEventType.RAID_DETECTED:
        eventType = AuditEventType.RAID_DETECTED;
        break;
      case SecurityEventType.RAID_MODE_STARTED:
        eventType = AuditEventType.RAID_MODE_STARTED;
        break;
      case SecurityEventType.RAID_MODE_ENDED:
        eventType = AuditEventType.RAID_MODE_ENDED;
        break;
      case SecurityEventType.QUARANTINED_MEMBER:
        eventType = AuditEventType.MEMBER_QUARANTINED;
        break;
      case SecurityEventType.RELEASED_MEMBER:
        eventType = AuditEventType.MEMBER_RELEASED;
        break;
      case SecurityEventType.SECURITY_ACTION_FAILED:
        eventType = AuditEventType.SECURITY_ACTION_FAILED;
        break;
    }

    let action = AuditAction.SYSTEM;
    switch (payload.action) {
      case SecurityAction.QUARANTINE:
        action = AuditAction.QUARANTINE;
        break;
      case SecurityAction.WARN:
        action = AuditAction.WARN;
        break;
      case SecurityAction.TIMEOUT:
        action = AuditAction.TIMEOUT;
        break;
      case SecurityAction.KICK:
        action = AuditAction.KICK;
        break;
      case SecurityAction.BAN:
        action = AuditAction.BAN;
        break;
      case SecurityAction.NONE:
      default:
        action = AuditAction.SYSTEM;
        break;
    }

    await this.createAuditLog({
      guildId: payload.guildId,
      eventType,
      action,
      targetUserId: payload.targetUserId,
      targetType: AuditTargetType.USER,
      reason: payload.reason,
      metadata: {
        riskLevel: payload.riskLevel,
        securityEventType: payload.eventType,
        securityAction: payload.action,
        ...payload.metadata,
      },
    });
  }

  private static async handleTicketEvent(
    payload: TicketEventPayload
  ): Promise<void> {
    await this.createAuditLog({
      guildId: payload.guildId,
      eventType: payload.eventType,
      action: payload.action,
      actorUserId: payload.actorUserId,
      targetUserId: payload.targetUserId,
      targetType: AuditTargetType.TICKET,
      channelId: payload.channelId,
      reason: payload.reason,
      metadata: {
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        ...payload.metadata,
      },
    });
  }
}
