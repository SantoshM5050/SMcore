import { EventEmitter } from 'node:events';
import {
  AuditAction,
  AuditEventType,
  AuditLogCreate,
  AuditTargetType,
  AutoModPunishment,
  ProtectionType,
  SecurityAction,
  SecurityEventType,
  SecurityRiskLevel,
} from '@smcore/shared';
import { logger } from '../../utils/logger';

export interface ModerationEventPayload {
  guildId: string;
  action: AuditAction;
  actorUserId: string;
  targetUserId?: string;
  channelId?: string;
  caseId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AutoModEventPayload {
  guildId: string;
  protectionType: ProtectionType;
  punishment: AutoModPunishment;
  authorId: string;
  channelId?: string;
  messageId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityEventPayload {
  guildId: string;
  eventType: SecurityEventType;
  action: SecurityAction;
  riskLevel: SecurityRiskLevel;
  targetUserId: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface TicketEventPayload {
  guildId: string;
  eventType: AuditEventType;
  action: AuditAction;
  actorUserId?: string;
  targetUserId?: string;
  channelId?: string;
  ticketId?: string;
  ticketNumber?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface SMCoreEvents {
  'audit.log': AuditLogCreate;
  'moderation.action': ModerationEventPayload;
  'automod.violation': AutoModEventPayload;
  'security.alert': SecurityEventPayload;
  'ticket.event': TicketEventPayload;
}

export class SMCoreEventBus extends EventEmitter {
  private static instance: SMCoreEventBus;

  public static getInstance(): SMCoreEventBus {
    if (!this.instance) {
      this.instance = new SMCoreEventBus();
      // Increase max listeners for monorepo services
      this.instance.setMaxListeners(50);
    }
    return this.instance;
  }

  /**
   * Emits a strongly typed event and catches any errors thrown in async listeners
   * to guarantee complete fault isolation for the Discord gateway.
   */
  public emitAsync<K extends keyof SMCoreEvents>(
    event: K,
    payload: SMCoreEvents[K]
  ): void {
    const listeners = this.rawListeners(event);
    for (const listener of listeners) {
      try {
        const result = listener(payload);
        if (result instanceof Promise) {
          result.catch((err) => {
            logger.error(
              { err, event },
              'Async error caught in SMCoreEventBus listener'
            );
          });
        }
      } catch (err) {
        logger.error(
          { err, event },
          'Sync error caught in SMCoreEventBus listener'
        );
      }
    }
  }
}

export const eventBus = SMCoreEventBus.getInstance();
