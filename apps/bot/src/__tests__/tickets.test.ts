import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AuditAction,
  AuditEventType,
  TicketAction,
  TicketStatus,
} from '@smcore/shared';
import { eventBus } from '../services/events/eventBus';
import { TicketAutoCloseService } from '../services/tickets/ticketAutoCloseService';
import { TicketCategoryService } from '../services/tickets/ticketCategoryService';
import { TicketClaimService } from '../services/tickets/ticketClaimService';
import { TicketConfigService } from '../services/tickets/ticketConfigService';
import { TicketParticipantService } from '../services/tickets/ticketParticipantService';
import { TicketService } from '../services/tickets/ticketService';
import { TicketTranscriptService } from '../services/tickets/ticketTranscriptService';
import { TicketDTO } from '../services/tickets/ticketTypes';
import { prisma } from '@smcore/database';

function createMockMember(
  id: string,
  roles: string[] = [],
  isAdmin: boolean = false
): any {
  return {
    id,
    user: { id, tag: `user_${id}#0001` },
    roles: {
      cache: {
        has: (roleId: string) => roles.includes(roleId),
        some: (fn: (role: any) => boolean) => roles.map((r) => ({ id: r })).some(fn),
      },
    },
    permissions: {
      has: (perm: bigint) => isAdmin,
    },
  };
}

function createMockGuild(id: string, roles: string[] = []): any {
  return {
    id,
    roles: {
      everyone: { id: 'everyone-role' },
      cache: {
        has: (rId: string) => roles.includes(rId),
      },
    },
    members: {
      me: { id: 'bot-id' },
    },
    channels: {
      cache: new Map(),
      create: async (opts: any) => ({
        id: `mock-chan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: opts.name,
        type: opts.type,
        send: async () => ({ id: 'mock-msg-1' }),
        setName: async (n: string) => n,
        permissionOverwrites: {
          edit: async () => null,
          delete: async () => null,
        },
        delete: async () => null,
      }),
    },
  };
}

test('Premium Ticketing System — Unit Test Suite', async (t) => {
  const testGuildIds = ['123456789012345678', '111111111111111111', '222222222222222222'];

  t.before(async () => {
    for (const gid of testGuildIds) {
      await prisma.guild.upsert({
        where: { id: gid },
        update: {},
        create: { id: gid, name: `Test Guild ${gid}`, ownerId: '1067745184160423946' },
      }).catch(() => null);
    }
  });

  t.after(async () => {
    for (const gid of testGuildIds) {
      await prisma.guild.delete({ where: { id: gid } }).catch(() => null);
    }
  });

  t.beforeEach(async () => {
    TicketService.clearMemory();
    TicketConfigService.clearCache();
    TicketCategoryService.clearMemory();
    await prisma.ticket.deleteMany({
      where: { guildId: { in: testGuildIds } },
    }).catch(() => null);
    await prisma.ticketCategory.deleteMany({
      where: { guildId: { in: testGuildIds } },
    }).catch(() => null);
  });

  await t.test('1. Sequential Ticket Numbering & Guild Isolation', async () => {
    const guildA = '111111111111111111';
    const guildB = '222222222222222222';

    const numA1 = await TicketService.getNextTicketNumber(guildA);
    const numA2 = await TicketService.getNextTicketNumber(guildA);
    const numA3 = await TicketService.getNextTicketNumber(guildA);

    assert.equal(numA1, 1);
    assert.equal(numA2, 2);
    assert.equal(numA3, 3);

    // Guild B must start independently at 1 (guild isolation)
    const numB1 = await TicketService.getNextTicketNumber(guildB);
    assert.equal(numB1, 1);

    const numA4 = await TicketService.getNextTicketNumber(guildA);
    assert.equal(numA4, 4);
  });

  await t.test('2. Ticket User Limits & Cooldown Enforcement', async () => {
    const guildId = '123456789012345678';
    const userId = '987654321098765432';

    // Set max tickets to 2 and cooldown to 10 seconds
    await TicketConfigService.updateSettings(guildId, {
      maxOpenTicketsPerUser: 2,
      cooldownSeconds: 10,
      enabled: true,
    });

    const check1 = await TicketService.canUserCreateTicket(guildId, userId);
    assert.equal(check1.allowed, true);

    const mockGuild = createMockGuild(guildId);
    const created1 = await TicketService.createTicket(mockGuild, userId);
    assert.equal(created1.success, true);

    // Immediate second attempt should be blocked by cooldown
    const checkCooldown = await TicketService.canUserCreateTicket(guildId, userId);
    assert.equal(checkCooldown.allowed, false);
    assert.match(checkCooldown.reason || '', /cooldown|wait/i);

    // Reset cooldown to test max open tickets
    await TicketConfigService.updateSettings(guildId, { cooldownSeconds: 0 });

    const created2 = await TicketService.createTicket(mockGuild, userId);
    assert.equal(created2.success, true);

    // 3rd attempt exceeds maxOpenTicketsPerUser (2)
    const checkMax = await TicketService.canUserCreateTicket(guildId, userId);
    assert.equal(checkMax.allowed, false);
    assert.match(checkMax.reason || '', /limit/i);

    // System disabled check
    await TicketConfigService.updateSettings(guildId, { enabled: false });
    const checkDisabled = await TicketService.canUserCreateTicket(guildId, 'other-user');
    assert.equal(checkDisabled.allowed, false);
    assert.match(checkDisabled.reason || '', /disabled/i);
  });

  await t.test('3. Ticket Category Management', async () => {
    const guildId = '123456789012345678';

    const cat1 = await TicketCategoryService.createCategory(guildId, {
      name: 'Billing Support',
      description: 'Payments, subscriptions and invoices',
      emoji: '💳',
      supportRoleId: '555555555555555555',
    });

    assert.equal(cat1.name, 'Billing Support');
    assert.equal(cat1.emoji, '💳');

    const cat2 = await TicketCategoryService.createCategory(guildId, {
      name: 'Technical Issue',
      emoji: '🔧',
    });

    const list = await TicketCategoryService.getCategories(guildId);
    assert.equal(list.length, 2);

    // Update category
    const updated = await TicketCategoryService.updateCategory(guildId, cat1.id, {
      name: 'Billing & Subscriptions',
    });
    assert.equal(updated?.name, 'Billing & Subscriptions');

    // Delete category
    const deleted = await TicketCategoryService.deleteCategory(guildId, cat2.id);
    assert.equal(deleted, true);

    const afterList = await TicketCategoryService.getCategories(guildId);
    assert.equal(afterList.length, 1);
    assert.equal(afterList[0].id, cat1.id);
  });

  await t.test('4. Support Staff Claims & Unclaims', async () => {
    const guildId = '123456789012345678';
    const supportRoleId = '777777777777777777';

    await TicketConfigService.updateSettings(guildId, {
      supportRoleIds: [supportRoleId],
    });

    const mockTicket: TicketDTO = {
      id: 'ticket-claim-test',
      guildId,
      channelId: 'chan-claim-test',
      ticketNumber: 101,
      categoryId: null,
      creatorUserId: 'user-normal',
      claimedByUserId: null,
      status: TicketStatus.OPEN,
      subject: 'Need help',
      closedByUserId: null,
      closedAt: null,
      lastActivityAt: new Date(),
      participants: [],
      transcriptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const normalMember = createMockMember('user-normal');
    const staffMember1 = createMockMember('staff-1', [supportRoleId]);
    const staffMember2 = createMockMember('staff-2', [supportRoleId]);

    // Unauthorized user cannot claim
    const nonStaffClaim = await TicketClaimService.claimTicket(mockTicket, normalMember);
    assert.equal(nonStaffClaim.success, false);
    assert.match(nonStaffClaim.error || '', /permission/i);

    // Authorized staff claims ticket
    const staffClaim = await TicketClaimService.claimTicket(mockTicket, staffMember1);
    assert.equal(staffClaim.success, true);
    assert.equal(staffClaim.ticket?.status, TicketStatus.CLAIMED);
    assert.equal(staffClaim.ticket?.claimedByUserId, 'staff-1');

    // Duplicate claim by another staff member rejected
    const dupClaim = await TicketClaimService.claimTicket(staffClaim.ticket!, staffMember2);
    assert.equal(dupClaim.success, false);
    assert.match(dupClaim.error || '', /already claimed/i);

    // Unauthorized staff unclaim rejected
    const unauthUnclaim = await TicketClaimService.unclaimTicket(staffClaim.ticket!, staffMember2);
    assert.equal(unauthUnclaim.success, false);
    assert.match(unauthUnclaim.error || '', /Only the claimer/i);

    // Claimer unclaims successfully
    const validUnclaim = await TicketClaimService.unclaimTicket(staffClaim.ticket!, staffMember1);
    assert.equal(validUnclaim.success, true);
    assert.equal(validUnclaim.ticket?.status, TicketStatus.OPEN);
    assert.equal(validUnclaim.ticket?.claimedByUserId, null);
  });

  await t.test('5. Ticket Lifecycle (Create, Close, Reopen, Delete)', async () => {
    const guildId = '123456789012345678';
    const mockGuild = createMockGuild(guildId);
    const creatorMember = createMockMember('ticket-creator');
    const staffMember = createMockMember('staff-closer', [], true);

    await TicketConfigService.updateSettings(guildId, {
      enabled: true,
      cooldownSeconds: 0,
      allowReopen: true,
      allowUserClose: true,
    });

    // 1. Create
    const createRes = await TicketService.createTicket(mockGuild, creatorMember.id, {
      subject: 'Billing inquiry',
    });
    assert.equal(createRes.success, true);
    assert.ok(createRes.ticket);
    assert.equal(createRes.ticket.status, TicketStatus.OPEN);
    assert.equal(createRes.ticket.subject, 'Billing inquiry');

    const channelId = createRes.ticket.channelId;

    // 2. Close
    const closeRes = await TicketService.closeTicket(mockGuild, channelId, staffMember, {
      reason: 'Resolved issue',
    });
    assert.equal(closeRes.success, true);
    assert.equal(closeRes.ticket?.status, TicketStatus.CLOSED);
    assert.equal(closeRes.ticket?.closedByUserId, staffMember.id);
    assert.ok(closeRes.ticket?.closedAt);

    // 3. Reopen
    const reopenRes = await TicketService.reopenTicket(mockGuild, channelId, staffMember);
    assert.equal(reopenRes.success, true);
    assert.equal(reopenRes.ticket?.status, TicketStatus.REOPENED);
    assert.equal(reopenRes.ticket?.closedByUserId, null);

    // 4. Delete
    const deleteRes = await TicketService.deleteTicket(mockGuild, channelId, staffMember);
    assert.equal(deleteRes.success, true);
  });

  await t.test('6. Ticket Participant Management', async () => {
    const guildId = '123456789012345678';
    const mockGuild = createMockGuild(guildId);
    const creator = createMockMember('creator-id');
    const friend = createMockMember('friend-id');
    const staff = createMockMember('staff-id', [], true);

    const mockTicket: TicketDTO = {
      id: 'ticket-part-test',
      guildId,
      channelId: 'chan-part-test',
      ticketNumber: 105,
      categoryId: null,
      creatorUserId: 'creator-id',
      claimedByUserId: null,
      status: TicketStatus.OPEN,
      subject: 'Group ticket',
      closedByUserId: null,
      closedAt: null,
      lastActivityAt: new Date(),
      participants: [],
      transcriptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add participant by creator
    const addRes = await TicketParticipantService.addUser(mockGuild, mockTicket, friend.id, creator);
    assert.equal(addRes.success, true);
    assert.equal(addRes.ticket?.participants.includes(friend.id), true);

    // Adding creator rejected
    const addCreatorRes = await TicketParticipantService.addUser(mockGuild, addRes.ticket!, creator.id, staff);
    assert.equal(addCreatorRes.success, false);
    assert.match(addCreatorRes.error || '', /creator is already/i);

    // Remove participant by staff
    const remRes = await TicketParticipantService.removeUser(mockGuild, addRes.ticket!, friend.id, staff);
    assert.equal(remRes.success, true);
    assert.equal(remRes.ticket?.participants.includes(friend.id), false);

    // Removing creator rejected
    const remCreatorRes = await TicketParticipantService.removeUser(mockGuild, remRes.ticket!, creator.id, staff);
    assert.equal(remCreatorRes.success, false);
    assert.match(remCreatorRes.error || '', /Cannot remove the ticket creator/i);
  });

  await t.test('7. Bounded Transcript Generation', async () => {
    const mockChannel: any = {
      id: 'chan-transcript-1',
      messages: {
        fetch: async () => {
          const map = new Map();
          map.set('msg-1', {
            id: 'msg-1',
            author: { id: 'u1', tag: 'UserOne#0001', bot: false },
            cleanContent: 'I need billing assistance',
            attachments: new Map(),
            createdAt: new Date('2026-09-12T10:00:00Z'),
            createdTimestamp: 1000,
          });
          map.set('msg-2', {
            id: 'msg-2',
            author: { id: 's1', tag: 'Support#0001', bot: false },
            cleanContent: 'Checking your account now',
            attachments: new Map(),
            createdAt: new Date('2026-09-12T10:01:00Z'),
            createdTimestamp: 2000,
          });
          return map;
        },
      },
    };

    const mockTicket: TicketDTO = {
      id: 'ticket-transcript-test',
      guildId: '123456789012345678',
      channelId: 'chan-transcript-1',
      ticketNumber: 42,
      categoryId: null,
      creatorUserId: 'u1',
      claimedByUserId: 's1',
      status: TicketStatus.OPEN,
      subject: 'Billing',
      closedByUserId: null,
      closedAt: null,
      lastActivityAt: new Date(),
      participants: [],
      transcriptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const transcript = await TicketTranscriptService.generateTranscript(mockChannel, mockTicket);
    assert.equal(transcript.messageCount, 2);
    assert.equal(transcript.ticketNumber, 42);
    assert.match(transcript.content, /I need billing assistance/);
    assert.match(transcript.content, /Checking your account now/);
  });

  await t.test('8. Auto-Close Inactivity Evaluator', async () => {
    const recentTicket: TicketDTO = {
      id: 't-recent',
      guildId: 'g1',
      channelId: 'c1',
      ticketNumber: 1,
      categoryId: null,
      creatorUserId: 'u1',
      claimedByUserId: null,
      status: TicketStatus.OPEN,
      subject: null,
      closedByUserId: null,
      closedAt: null,
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      participants: [],
      transcriptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const oldTicket: TicketDTO = {
      ...recentTicket,
      id: 't-old',
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 48 hours ago
    };

    // Auto-close threshold: 24 hours
    assert.equal(TicketAutoCloseService.isTicketInactive(recentTicket, 24), false);
    assert.equal(TicketAutoCloseService.isTicketInactive(oldTicket, 24), true);
  });

  await t.test('9. Audit Event Integration for Ticket Lifecycle', async () => {
    const eventsCaptured: any[] = [];
    const listener = (payload: any) => eventsCaptured.push(payload);
    eventBus.on('ticket.event', listener);

    const guildId = '123456789012345678';
    const mockGuild = createMockGuild(guildId);
    const staff = createMockMember('staff-audit', [], true);

    await TicketConfigService.updateSettings(guildId, { enabled: true, cooldownSeconds: 0 });
    const createRes = await TicketService.createTicket(mockGuild, 'creator-audit');
    assert.ok(createRes.ticket);

    await TicketService.closeTicket(mockGuild, createRes.ticket.channelId, staff);

    eventBus.off('ticket.event', listener);

    const createdEvent = eventsCaptured.find(
      (e) => e.eventType === AuditEventType.TICKET_CREATED && e.action === AuditAction.TICKET_CREATE
    );
    const closedEvent = eventsCaptured.find(
      (e) => e.eventType === AuditEventType.TICKET_CLOSED && e.action === AuditAction.TICKET_CLOSE
    );

    assert.ok(createdEvent, 'TICKET_CREATED audit event was emitted');
    assert.ok(closedEvent, 'TICKET_CLOSED audit event was emitted');
  });
});
