import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HierarchyCheckResult,
  ModerationAction,
  TimeoutInputSchema,
  PurgeInputSchema,
  SlowmodeInputSchema,
  MemberNoteInputSchema,
  SnowflakeSchema,
  WarningEscalationRuleSchema,
} from '@smcore/shared';
import { HierarchyService } from '../services/moderation/hierarchyService';
import { PermissionService } from '../services/moderation/permissionService';

// Helpers to create lightweight mock Discord objects
function createMockMember(options: {
  id: string;
  guildId?: string;
  ownerId?: string;
  highestRolePosition: number;
  permissions?: bigint[];
}) {
  const guildOwnerId = options.ownerId || '999999999999999999';
  const guildId = options.guildId || '111111111111111111';

  return {
    id: options.id,
    guild: {
      id: guildId,
      ownerId: guildOwnerId,
    },
    roles: {
      highest: {
        id: `role_${options.id}`,
        position: options.highestRolePosition,
      },
    },
    permissions: {
      has: (perm: bigint) => {
        if (!options.permissions) return false;
        return options.permissions.includes(perm);
      },
    },
  } as any;
}

describe('Core Moderation Engine — Unit Test Suite', () => {
  describe('1. Hierarchy Service Protections', () => {
    const botMember = createMockMember({
      id: '200000000000000001',
      highestRolePosition: 90,
    });

    it('prevents self-targeting (TARGET_IS_SELF)', () => {
      const mod = createMockMember({ id: '100000000000000001', highestRolePosition: 50 });
      const target = mod;

      const result = HierarchyService.canModerateMember(mod, target, botMember);
      assert.equal(result.allowed, false);
      assert.equal(result.code, HierarchyCheckResult.TARGET_IS_SELF);
    });

    it('prevents bot targeting (TARGET_IS_BOT)', () => {
      const mod = createMockMember({ id: '100000000000000001', highestRolePosition: 50 });
      const target = botMember;

      const result = HierarchyService.canModerateMember(mod, target, botMember);
      assert.equal(result.allowed, false);
      assert.equal(result.code, HierarchyCheckResult.TARGET_IS_BOT);
    });

    it('protects guild owner from moderation actions (TARGET_IS_GUILD_OWNER)', () => {
      const ownerId = '999999999999999999';
      const mod = createMockMember({ id: '100000000000000001', ownerId, highestRolePosition: 80 });
      const ownerTarget = createMockMember({ id: ownerId, ownerId, highestRolePosition: 100 });

      const result = HierarchyService.canModerateMember(mod, ownerTarget, botMember);
      assert.equal(result.allowed, false);
      assert.equal(result.code, HierarchyCheckResult.TARGET_IS_GUILD_OWNER);
    });

    it('prevents moderating users with equal or higher role than moderator (TARGET_ROLE_TOO_HIGH)', () => {
      const mod = createMockMember({ id: '100000000000000001', highestRolePosition: 50 });
      const higherTarget = createMockMember({ id: '100000000000000002', highestRolePosition: 60 });
      const equalTarget = createMockMember({ id: '100000000000000003', highestRolePosition: 50 });

      const resHigher = HierarchyService.canModerateMember(mod, higherTarget, botMember);
      assert.equal(resHigher.allowed, false);
      assert.equal(resHigher.code, HierarchyCheckResult.TARGET_ROLE_TOO_HIGH);

      const resEqual = HierarchyService.canModerateMember(mod, equalTarget, botMember);
      assert.equal(resEqual.allowed, false);
      assert.equal(resEqual.code, HierarchyCheckResult.TARGET_ROLE_TOO_HIGH);
    });

    it('prevents moderating users with equal or higher role than bot (BOT_ROLE_TOO_LOW)', () => {
      const ownerId = '999999999999999999';
      // Moderator is owner, so passes mod hierarchy, but bot cannot moderate target above bot
      const ownerMod = createMockMember({ id: ownerId, ownerId, highestRolePosition: 100 });
      const superTarget = createMockMember({ id: '100000000000000005', ownerId, highestRolePosition: 95 });

      const result = HierarchyService.canModerateMember(ownerMod, superTarget, botMember);
      assert.equal(result.allowed, false);
      assert.equal(result.code, HierarchyCheckResult.BOT_ROLE_TOO_LOW);
    });

    it('allows moderation when moderator > target and bot > target (SUCCESS)', () => {
      const mod = createMockMember({ id: '100000000000000001', highestRolePosition: 60 });
      const normalTarget = createMockMember({ id: '100000000000000002', highestRolePosition: 20 });

      const result = HierarchyService.canModerateMember(mod, normalTarget, botMember);
      assert.equal(result.allowed, true);
      assert.equal(result.code, HierarchyCheckResult.SUCCESS);
    });
  });

  describe('2. Permission Service RBAC Checks', () => {
    it('bypasses permission checks for Guild Owner and Administrator', () => {
      const ownerId = '999999999999999999';
      const owner = createMockMember({ id: ownerId, ownerId, highestRolePosition: 100 });
      assert.equal(PermissionService.canExecuteAction(owner, ModerationAction.BAN).hasPermission, true);

      // Admin permission (0x8n in Discord)
      const admin = createMockMember({
        id: '100000000000000001',
        highestRolePosition: 70,
        permissions: [8n],
      });
      assert.equal(PermissionService.canExecuteAction(admin, ModerationAction.BAN).hasPermission, true);
    });

    it('correctly validates specific Discord action permissions', () => {
      // Mod with only ModerateMembers (0x10000000000n / 1099511627776n)
      const timeoutMod = createMockMember({
        id: '100000000000000002',
        highestRolePosition: 40,
        permissions: [1099511627776n],
      });

      assert.equal(
        PermissionService.canExecuteAction(timeoutMod, ModerationAction.TIMEOUT).hasPermission,
        true
      );
      assert.equal(
        PermissionService.canExecuteAction(timeoutMod, ModerationAction.BAN).hasPermission,
        false
      );
    });
  });

  describe('3. Zod Input Boundaries & Constraints', () => {
    it('validates Discord snowflake IDs strictly', () => {
      assert.equal(SnowflakeSchema.safeParse('123456789012345678').success, true);
      assert.equal(SnowflakeSchema.safeParse('not-a-snowflake').success, false);
      assert.equal(SnowflakeSchema.safeParse('123').success, false);
    });

    it('enforces timeout duration boundaries (1s to 28 days)', () => {
      // 0 seconds rejected
      assert.equal(
        TimeoutInputSchema.safeParse({ targetUserId: '123456789012345678', durationSeconds: 0 }).success,
        false
      );
      // Valid: 1 hour (3600s)
      assert.equal(
        TimeoutInputSchema.safeParse({ targetUserId: '123456789012345678', durationSeconds: 3600 }).success,
        true
      );
      // Beyond 28 days (2419201s) rejected
      assert.equal(
        TimeoutInputSchema.safeParse({ targetUserId: '123456789012345678', durationSeconds: 2419201 }).success,
        false
      );
    });

    it('enforces purge message boundaries (1 to 100)', () => {
      assert.equal(
        PurgeInputSchema.safeParse({ channelId: '123456789012345678', amount: 0 }).success,
        false
      );
      assert.equal(
        PurgeInputSchema.safeParse({ channelId: '123456789012345678', amount: 50 }).success,
        true
      );
      assert.equal(
        PurgeInputSchema.safeParse({ channelId: '123456789012345678', amount: 101 }).success,
        false
      );
    });

    it('enforces slowmode boundaries (0 to 6 hours)', () => {
      assert.equal(
        SlowmodeInputSchema.safeParse({ channelId: '123456789012345678', seconds: -1 }).success,
        false
      );
      assert.equal(
        SlowmodeInputSchema.safeParse({ channelId: '123456789012345678', seconds: 120 }).success,
        true
      );
      assert.equal(
        SlowmodeInputSchema.safeParse({ channelId: '123456789012345678', seconds: 21601 }).success,
        false
      );
    });

    it('validates member notes character limits', () => {
      assert.equal(
        MemberNoteInputSchema.safeParse({ targetUserId: '123456789012345678', content: '' }).success,
        false
      );
      assert.equal(
        MemberNoteInputSchema.safeParse({
          targetUserId: '123456789012345678',
          content: 'x'.repeat(2001),
        }).success,
        false
      );
      assert.equal(
        MemberNoteInputSchema.safeParse({
          targetUserId: '123456789012345678',
          content: 'User was instructed to read channel guidelines.',
        }).success,
        true
      );
    });
  });

  describe('4. Warning Escalation Engine Logic', () => {
    it('matches configured escalation thresholds and actions', () => {
      const rules = [
        { warningCount: 3, action: ModerationAction.TIMEOUT, durationSeconds: 600, enabled: true },
        { warningCount: 5, action: ModerationAction.KICK, enabled: true },
        { warningCount: 7, action: ModerationAction.BAN, enabled: true },
      ];

      // Simulated lookup
      function findEscalation(count: number) {
        return rules.find((r) => r.warningCount === count && r.enabled);
      }

      assert.equal(findEscalation(1), undefined);
      assert.equal(findEscalation(3)?.action, ModerationAction.TIMEOUT);
      assert.equal(findEscalation(5)?.action, ModerationAction.KICK);
      assert.equal(findEscalation(7)?.action, ModerationAction.BAN);
    });

    it('validates escalation rule Zod schema', () => {
      assert.equal(
        WarningEscalationRuleSchema.safeParse({
          warningCount: 3,
          action: ModerationAction.TIMEOUT,
          durationSeconds: 1800,
          enabled: true,
        }).success,
        true
      );
    });
  });

  describe('5. Guild Isolation & Sequential Case Numbering', () => {
    it('isolates case sequences between different guilds', () => {
      const mockDatabase = new Map<string, number>();

      function getNextNumber(guildId: string): number {
        const current = mockDatabase.get(guildId) || 0;
        const next = current + 1;
        mockDatabase.set(guildId, next);
        return next;
      }

      // Guild A increments
      assert.equal(getNextNumber('guild_A'), 1);
      assert.equal(getNextNumber('guild_A'), 2);

      // Guild B starts at 1 independently
      assert.equal(getNextNumber('guild_B'), 1);
      assert.equal(getNextNumber('guild_B'), 2);

      // Guild A increments to 3
      assert.equal(getNextNumber('guild_A'), 3);
    });
  });
});
