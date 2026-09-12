import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuditAction,
  AuditEventType,
  AuditLogCreateSchema,
  AuditLogQuerySchema,
  AuditTargetType,
  AutoModPunishment,
  ProtectionType,
  SecurityAction,
  SecurityEventType,
  SecurityRiskLevel,
} from '@smcore/shared';
import { eventBus, SMCoreEventBus } from '../services/events/eventBus';
import { AuditLogService } from '../services/audit/auditLogService';
import { AuditQueryService } from '../services/audit/auditQueryService';
import { DiscordAuditLogService } from '../services/audit/discordAuditLogService';
import { AuditRetentionService } from '../services/audit/auditRetentionService';

describe('Audit Logs & Event System — Unit Test Suite', () => {
  beforeEach(() => {
    AuditLogService.initialize();
  });

  describe('1. Central Event Bus Fault Isolation', () => {
    it('dispatches typed events to asynchronous listeners', async () => {
      let receivedPayload: any = null;
      const testBus = new SMCoreEventBus();

      testBus.on('moderation.action', (payload) => {
        receivedPayload = payload;
      });

      testBus.emitAsync('moderation.action', {
        guildId: '123456789012345678',
        action: AuditAction.BAN,
        actorUserId: '111111111111111111',
        targetUserId: '222222222222222222',
        reason: 'Violation of rule 1',
      });

      // Give microtask tick to process
      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.ok(receivedPayload);
      assert.equal(receivedPayload.guildId, '123456789012345678');
      assert.equal(receivedPayload.action, AuditAction.BAN);
    });

    it('isolates listener errors and does not crash other listeners', async () => {
      const testBus = new SMCoreEventBus();
      let secondListenerRan = false;

      // First listener throws an error
      testBus.on('security.alert', () => {
        throw new Error('Simulated listener crash');
      });

      // Second listener must still execute
      testBus.on('security.alert', () => {
        secondListenerRan = true;
      });

      testBus.emitAsync('security.alert', {
        guildId: '123456789012345678',
        eventType: SecurityEventType.RAID_DETECTED,
        action: SecurityAction.QUARANTINE,
        riskLevel: SecurityRiskLevel.HIGH,
        targetUserId: '333333333333333333',
        reason: 'Raid threshold burst',
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(secondListenerRan, true);
    });
  });

  describe('2. Metadata Sanitization & Security Boundary', () => {
    it('redacts sensitive security credentials and tokens', () => {
      const unsafeMetadata = {
        normalKey: 'safe value',
        botToken: 'secret-discord-token',
        user_password: 'super-secret-password',
        authHeader: 'Bearer 12345',
        nested: {
          apiKey: 'secret-api-key',
          clean: 'allowed',
        },
      };

      const sanitized = AuditLogService.sanitizeMetadata(unsafeMetadata);
      assert.ok(sanitized);
      assert.equal(sanitized.normalKey, 'safe value');
      assert.equal(sanitized.botToken, '[REDACTED]');
      assert.equal(sanitized.user_password, '[REDACTED]');
      assert.equal(sanitized.authHeader, '[REDACTED]');
      assert.equal((sanitized.nested as any).apiKey, '[REDACTED]');
      assert.equal((sanitized.nested as any).clean, 'allowed');
    });

    it('truncates excessively long metadata strings to prevent DOS', () => {
      const longString = 'x'.repeat(2500);
      const sanitized = AuditLogService.sanitizeMetadata({ details: longString });
      assert.ok(sanitized);
      assert.ok((sanitized.details as string).includes('...[truncated]'));
      assert.ok((sanitized.details as string).length < 1500);
    });
  });

  describe('3. Audit Creation & Schema Validation', () => {
    it('validates conforming audit log creation payload', () => {
      const validPayload = {
        guildId: '123456789012345678',
        eventType: AuditEventType.MODERATION_ACTION,
        action: AuditAction.KICK,
        actorUserId: '111111111111111111',
        targetUserId: '222222222222222222',
        targetType: AuditTargetType.USER,
        channelId: '333333333333333333',
        reason: 'Kicked for rule infraction',
        metadata: { rule: 3 },
      };

      const parsed = AuditLogCreateSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);
    });

    it('rejects invalid snowflake IDs in audit payload', () => {
      const invalidPayload = {
        guildId: 'invalid-id',
        eventType: AuditEventType.MODERATION_ACTION,
        action: AuditAction.BAN,
      };

      const parsed = AuditLogCreateSchema.safeParse(invalidPayload);
      assert.equal(parsed.success, false);
    });

    it('handles database disconnection safely without throwing', async () => {
      const result = await AuditLogService.createAuditLog({
        guildId: '123456789012345678',
        eventType: AuditEventType.SYSTEM_EVENT,
        action: AuditAction.SYSTEM,
        reason: 'Test offline DB handling',
      });

      // When DB is offline, returns null and logs warning rather than crashing
      assert.equal(result, null);
    });
  });

  describe('4. Audit Query Service & Guild Isolation', () => {
    it('validates query filter schemas and coercion', () => {
      const rawQuery = {
        limit: '25',
        eventType: AuditEventType.SPAM_DETECTED,
        action: AuditAction.TIMEOUT,
        from: '2026-09-01T00:00:00Z',
      };

      const parsed = AuditLogQuerySchema.safeParse(rawQuery);
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.limit, 25);
        assert.equal(parsed.data.eventType, AuditEventType.SPAM_DETECTED);
        assert.ok(parsed.data.from instanceof Date);
      }
    });

    it('returns structured fallback response when database is disconnected', async () => {
      const queryResult = await AuditQueryService.queryAuditLogs(
        '123456789012345678',
        { limit: 10 }
      );

      assert.ok(queryResult);
      assert.deepEqual(queryResult.data, []);
      assert.equal(queryResult.nextCursor, null);
      assert.equal(queryResult.fallback, true);
    });

    it('returns null safely when querying single audit log without active database', async () => {
      const item = await AuditQueryService.getAuditLogById(
        '123456789012345678',
        'cuid123456'
      );
      assert.equal(item, null);
    });
  });

  describe('5. Discord Native Audit Log Service', () => {
    it('returns MISSING_PERMISSIONS when bot lacks ViewAuditLog permission', async () => {
      const mockGuildWithoutPerms = {
        id: '123456789012345678',
        members: {
          me: {
            permissions: {
              has: () => false, // No ViewAuditLog
            },
          },
        },
      } as any;

      const result = await DiscordAuditLogService.fetchNativeAuditLogs(
        mockGuildWithoutPerms
      );
      assert.equal(result.success, false);
      assert.ok(result.error?.includes('MISSING_PERMISSIONS'));
      assert.deepEqual(result.entries, []);
    });

    it('processes native audit logs correctly when permission is present', async () => {
      const mockDate = new Date();
      const mockGuildWithPerms = {
        id: '123456789012345678',
        members: {
          me: {
            permissions: {
              has: () => true,
            },
          },
        },
        fetchAuditLogs: async () => ({
          entries: [
            {
              id: 'log-1',
              action: 22,
              executorId: 'mod-1',
              targetId: 'user-1',
              reason: 'Rule breach',
              createdAt: mockDate,
              extra: null,
            },
          ],
        }),
      } as any;

      const result = await DiscordAuditLogService.fetchNativeAuditLogs(
        mockGuildWithPerms,
        { limit: 5 }
      );

      assert.equal(result.success, true);
      assert.equal(result.entries.length, 1);
      assert.equal(result.entries[0].id, 'log-1');
      assert.equal(result.entries[0].executorId, 'mod-1');
      assert.equal(result.entries[0].targetId, 'user-1');
    });
  });

  describe('6. Retention Service Foundation', () => {
    it('rejects invalid non-positive retention days', async () => {
      await assert.rejects(
        async () => {
          await AuditRetentionService.cleanupGuildAuditLogs(
            '123456789012345678',
            0
          );
        },
        { message: 'Retention days must be greater than zero' }
      );
    });

    it('computes correct retention cutoff and handles database disconnection safely', async () => {
      const result = await AuditRetentionService.cleanupGuildAuditLogs(
        '123456789012345678',
        30
      );

      assert.ok(result);
      assert.equal(result.guildId, '123456789012345678');
      assert.equal(result.deletedCount, 0); // DB offline
      assert.ok(result.cutoffDate instanceof Date);
    });
  });
});
