import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  SecurityRiskLevel,
  SecurityAction,
  SecurityEventType,
  GuildSecuritySettings,
  GuildSecuritySettingsSchema,
  GuildSecuritySettingsUpdateSchema,
} from '@smcore/shared';
import { RaidDetectionService } from '../services/security/raidDetectionService';
import { RaidModeService } from '../services/security/raidModeService';
import { AccountRiskService } from '../services/security/accountRiskService';
import { SecurityConfigService } from '../services/security/securityConfigService';
import { QuarantineService } from '../services/security/quarantineService';
import { JoinSecurityService } from '../services/security/joinSecurityService';

describe('Advanced Security & Anti-Raid Engine — Unit Test Suite', () => {
  let settings: GuildSecuritySettings;

  beforeEach(() => {
    RaidDetectionService.reset();
    RaidModeService.reset();
    QuarantineService.reset();
    settings = SecurityConfigService.getDefaultSettings('123456789012345678');
  });

  describe('1. Sliding-Window Raid Detection Engine', () => {
    it('allows join rate below configured threshold', () => {
      settings.raidDetectionEnabled = true;
      settings.raidJoinThreshold = 5;
      settings.raidWindowSeconds = 10;

      const now = 1000000;
      for (let i = 0; i < 4; i++) {
        const res = RaidDetectionService.checkRaid(settings.guildId, settings, now + i * 500);
        assert.equal(res.isRaid, false);
        assert.equal(res.joinCount, i + 1);
      }
    });

    it('triggers raid detection when join threshold is reached or exceeded', () => {
      settings.raidDetectionEnabled = true;
      settings.raidJoinThreshold = 3;
      settings.raidWindowSeconds = 10;

      const now = 1000000;
      RaidDetectionService.checkRaid(settings.guildId, settings, now);
      RaidDetectionService.checkRaid(settings.guildId, settings, now + 100);

      const triggerResult = RaidDetectionService.checkRaid(settings.guildId, settings, now + 200);
      assert.equal(triggerResult.isRaid, true);
      assert.equal(triggerResult.joinCount, 3);
      assert.equal(triggerResult.threshold, 3);
    });

    it('prunes expired join timestamps outside the sliding window', () => {
      settings.raidDetectionEnabled = true;
      settings.raidJoinThreshold = 3;
      settings.raidWindowSeconds = 5; // 5 second window

      const t0 = 1000000;
      // Record 2 joins at t0
      RaidDetectionService.checkRaid(settings.guildId, settings, t0);
      RaidDetectionService.checkRaid(settings.guildId, settings, t0 + 1000);

      // Fast forward 6 seconds (beyond 5-second window)
      const tAfter = t0 + 6000;
      const res = RaidDetectionService.checkRaid(settings.guildId, settings, tAfter);
      assert.equal(res.isRaid, false);
      // Older 2 joins expired, so join count is now 1
      assert.equal(res.joinCount, 1);
    });

    it('maintains strict isolation between different guilds', () => {
      settings.raidDetectionEnabled = true;
      settings.raidJoinThreshold = 2;
      settings.raidWindowSeconds = 10;

      const now = 1000000;
      // Guild A receives 2 joins
      RaidDetectionService.checkRaid('guild-A', settings, now);
      const resA = RaidDetectionService.checkRaid('guild-A', settings, now + 100);
      assert.equal(resA.isRaid, true);

      // Guild B receives 1 join
      const resB = RaidDetectionService.checkRaid('guild-B', settings, now + 200);
      assert.equal(resB.isRaid, false);
      assert.equal(resB.joinCount, 1);
    });

    it('returns false immediately when raid detection is disabled', () => {
      settings.raidDetectionEnabled = false;
      const res = RaidDetectionService.checkRaid(settings.guildId, settings);
      assert.equal(res.isRaid, false);
      assert.equal(res.joinCount, 0);
    });
  });

  describe('2. Account Risk & Age Evaluation Engine', () => {
    it('flags account younger than minimum age as HIGH risk and suspicious', () => {
      const now = new Date('2026-09-12T12:00:00Z');
      // Account created 2 hours ago, minimum is 24 hours
      const createdAt = new Date('2026-09-12T10:00:00Z');

      const risk = AccountRiskService.evaluateRisk(createdAt, 24, now);
      assert.equal(risk.riskLevel, SecurityRiskLevel.HIGH);
      assert.equal(risk.isSuspicious, true);
      assert.equal(risk.accountAgeHours, 2);
      assert.ok(risk.reason?.includes('below the required minimum'));
    });

    it('flags account between 1x and 2x minimum age as MEDIUM risk', () => {
      const now = new Date('2026-09-12T12:00:00Z');
      // Account created 30 hours ago, minimum is 24 hours (30 < 48)
      const createdAt = new Date(now.getTime() - 30 * 3600 * 1000);

      const risk = AccountRiskService.evaluateRisk(createdAt, 24, now);
      assert.equal(risk.riskLevel, SecurityRiskLevel.MEDIUM);
      assert.equal(risk.isSuspicious, false);
      assert.equal(risk.accountAgeHours, 30);
    });

    it('classifies mature accounts as LOW risk', () => {
      const now = new Date('2026-09-12T12:00:00Z');
      // Account created 30 days ago
      const createdAt = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

      const risk = AccountRiskService.evaluateRisk(createdAt, 24, now);
      assert.equal(risk.riskLevel, SecurityRiskLevel.LOW);
      assert.equal(risk.isSuspicious, false);
      assert.equal(risk.reason, undefined);
    });
  });

  describe('3. Raid Mode State Lifecycle', () => {
    it('activates and deactivates raid mode correctly', () => {
      assert.equal(RaidModeService.isRaidModeActive('g1'), false);
      assert.equal(RaidModeService.getRaidModeState('g1'), null);

      const state = RaidModeService.activateRaidMode('g1', 30, 'Join flood', 15, 10, 10);
      assert.equal(state.active, true);
      assert.equal(state.currentJoinCount, 15);
      assert.equal(RaidModeService.isRaidModeActive('g1'), true);

      const retrieved = RaidModeService.getRaidModeState('g1');
      assert.ok(retrieved);
      assert.equal(retrieved.active, true);
      assert.equal(retrieved.reason, 'Join flood');

      RaidModeService.deactivateRaidMode('g1');
      assert.equal(RaidModeService.isRaidModeActive('g1'), false);
      assert.equal(RaidModeService.getRaidModeState('g1'), null);
    });
  });

  describe('4. Quarantine Service & Role Restoration', () => {
    it('fails gracefully when quarantine role does not exist in guild', async () => {
      const mockMember = {
        id: 'user1',
        guild: {
          id: 'guild1',
          roles: { cache: new Map() },
        },
        roles: { cache: new Map() },
      } as any;

      const mockBot = { id: 'bot1', roles: { highest: { position: 10 } } } as any;

      const result = await QuarantineService.quarantineMember(
        mockMember,
        mockBot,
        'non-existent-role',
        'Security test'
      );

      assert.equal(result.success, false);
      assert.ok(result.error?.includes('not found'));
    });

    it('caches and restores previous member roles upon release', async () => {
      const role1 = { id: 'role1', position: 2, managed: false, guild: { id: 'guild1' } };
      const role2 = { id: 'role2', position: 3, managed: false, guild: { id: 'guild1' } };
      const qRole = { id: 'qRole', position: 5, managed: false, guild: { id: 'guild1' } };

      const rolesCache = new Map<string, any>([
        ['role1', role1],
        ['role2', role2],
        ['qRole', qRole],
      ]);

      const memberRoles = new Map<string, any>([
        ['role1', role1],
        ['role2', role2],
      ]);

      const addedRoles: string[] = [];
      const removedRoles: string[] = [];

      const mockMember = {
        id: 'target-user',
        guild: {
          id: 'guild1',
          ownerId: 'owner-id',
          roles: { cache: rolesCache },
        },
        roles: {
          cache: memberRoles,
          highest: { position: 3 },
          add: async (role: any) => {
            addedRoles.push(role.id);
            memberRoles.set(role.id, role);
          },
          remove: async (role: any) => {
            removedRoles.push(role.id);
            memberRoles.delete(role.id);
          },
        },
      } as any;

      const mockBot = {
        id: 'bot-id',
        guild: mockMember.guild,
        roles: { highest: { position: 10 } },
      } as any;

      // 1. Quarantine member
      const qRes = await QuarantineService.quarantineMember(mockMember, mockBot, 'qRole', 'Raid mitigation');
      assert.equal(qRes.success, true);
      assert.deepEqual(qRes.previousRoles, ['role1', 'role2']);
      assert.ok(addedRoles.includes('qRole'));

      // 2. Release member with restore
      const relRes = await QuarantineService.releaseMember(mockMember, mockBot, 'qRole', true);
      assert.equal(relRes.success, true);
      assert.ok(removedRoles.includes('qRole'));
    });
  });

  describe('5. Join Security Pipeline Integration', () => {
    it('bypasses bots and server owner', async () => {
      const mockBotUser = {
        id: 'bot-user-id',
        user: { bot: true },
        guild: { id: 'g1', ownerId: 'owner-id' },
        permissions: { has: () => false },
      } as any;

      const botRes = await JoinSecurityService.processMemberJoin(mockBotUser);
      assert.equal(botRes, null);

      const mockOwner = {
        id: 'owner-id',
        user: { bot: false },
        guild: { id: 'g1', ownerId: 'owner-id' },
        permissions: { has: () => false },
      } as any;

      const ownerRes = await JoinSecurityService.processMemberJoin(mockOwner);
      assert.equal(ownerRes, null);
    });

    it('enforces raid action on joins during active raid mode', async () => {
      RaidModeService.activateRaidMode(settings.guildId, 15, 'Active attack', 20, 10, 10);

      const mockTarget = {
        id: 'attacker1',
        user: { bot: false, createdAt: new Date() },
        guild: {
          id: settings.guildId,
          name: 'Test Guild',
          ownerId: 'owner-1',
          members: {
            me: { id: 'bot-1', roles: { highest: { position: 100 } } },
          },
          channels: { cache: new Map() },
        },
        permissions: { has: () => false },
        roles: {
          cache: new Map(),
          highest: { position: 1 },
        },
      } as any;

      const event = await JoinSecurityService.processMemberJoin(mockTarget);
      assert.ok(event);
      assert.equal(event.type, SecurityEventType.RAID_DETECTED);
      assert.equal(event.riskLevel, SecurityRiskLevel.HIGH);
      assert.ok(event.reason.includes('active raid mode'));
    });
  });

  describe('6. Schema Validation & Enums', () => {
    it('validates default security settings schema', () => {
      const defaults = SecurityConfigService.getDefaultSettings('123456789012345678');
      const parse = GuildSecuritySettingsSchema.safeParse(defaults);
      assert.equal(parse.success, true);
    });

    it('validates partial update schema', () => {
      const update = {
        raidDetectionEnabled: true,
        raidJoinThreshold: 15,
        raidWindowSeconds: 20,
        raidAction: SecurityAction.TIMEOUT,
      };

      const parse = GuildSecuritySettingsUpdateSchema.safeParse(update);
      assert.equal(parse.success, true);
      if (parse.success) {
        assert.equal(parse.data.raidJoinThreshold, 15);
        assert.equal(parse.data.raidAction, SecurityAction.TIMEOUT);
      }
    });

    it('rejects invalid parameters in update schema', () => {
      const invalidUpdate = {
        raidJoinThreshold: -5, // Negative threshold invalid
      };

      const parse = GuildSecuritySettingsUpdateSchema.safeParse(invalidUpdate);
      assert.equal(parse.success, false);
    });
  });
});
