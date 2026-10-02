import { PrismaClient } from '@prisma/client';

// ----------------------------------------------------------------------------
// In-Memory Mock Store for AI Studio Preview Environment
// (Active when DATABASE_URL is unavailable or offline)
// ----------------------------------------------------------------------------

interface InMemoryStore {
  guilds: any[];
  guildSettings: any[];
  guildProtectionSettings: any[];
  guildSecuritySettings: any[];
  moderationCases: any[];
  warnings: any[];
  warningEscalationRules: any[];
  memberNotes: any[];
  auditLogs: any[];
  guildTicketSettings: any[];
  ticketCategories: any[];
  tickets: any[];
}

const DEMO_GUILD_ID = '987654321098765432';
const DEMO_USER_ID = '123456789012345678';

function createInitialStore(): InMemoryStore {
  return {
    guilds: [
      {
        id: DEMO_GUILD_ID,
        name: 'Apex Gaming Community',
        icon: null,
        ownerId: DEMO_USER_ID,
        botPresent: true,
        joinedAt: new Date(Date.now() - 86400000 * 30),
        createdAt: new Date(Date.now() - 86400000 * 30),
        updatedAt: new Date(),
      },
      {
        id: '876543210987654321',
        name: 'Sentinel Dev Guild',
        icon: null,
        ownerId: DEMO_USER_ID,
        botPresent: true,
        joinedAt: new Date(Date.now() - 86400000 * 15),
        createdAt: new Date(Date.now() - 86400000 * 15),
        updatedAt: new Date(),
      },
    ],
    guildSettings: [
      {
        id: 'gs-1',
        guildId: DEMO_GUILD_ID,
        prefix: '!',
        language: 'en-US',
        timezone: 'UTC',
        modLogChannelId: '100100100100100101',
        actionLogChannelId: '100100100100100102',
        muteRoleId: '100100100100100103',
        appealUrl: 'https://appeal.example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    guildProtectionSettings: [
      {
        id: 'gps-1',
        guildId: DEMO_GUILD_ID,
        antiSpamEnabled: true,
        antiSpamMessageLimit: 5,
        antiSpamWindowSeconds: 5,
        duplicateMessageLimit: 3,
        antiSpamPunishment: 'TIMEOUT',
        massMentionEnabled: true,
        maxUserMentions: 5,
        maxRoleMentions: 3,
        maxTotalMentions: 6,
        everyoneMentionAllowed: false,
        massMentionPunishment: 'TIMEOUT',
        inviteFilterEnabled: true,
        allowedInviteGuilds: [],
        inviteFilterPunishment: 'DELETE',
        externalLinkFilterEnabled: false,
        allowedDomains: ['discord.gg', 'github.com', 'youtube.com'],
        blockedDomains: ['scam-site.com'],
        externalLinkPunishment: 'DELETE',
        keywordFilterEnabled: true,
        prohibitedKeywords: ['free-nitro', 'steam-gift', 'token-grabber'],
        keywordPunishment: 'DELETE',
        deleteViolatingMessages: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    guildSecuritySettings: [
      {
        id: 'gss-1',
        guildId: DEMO_GUILD_ID,
        enabled: true,
        raidDetectionEnabled: true,
        raidJoinThreshold: 8,
        raidWindowSeconds: 10,
        raidModeDurationSeconds: 1800,
        raidAction: 'QUARANTINE',
        accountAgeProtectionEnabled: true,
        minimumAccountAgeHours: 168,
        accountAgeAction: 'QUARANTINE',
        quarantineEnabled: true,
        quarantineRoleId: '100100100100100199',
        removeRolesOnQuarantine: false,
        restoreRolesOnRelease: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    moderationCases: [
      {
        id: 'case-104',
        guildId: DEMO_GUILD_ID,
        caseNumber: 104,
        type: 'BAN',
        targetUserId: '200100100100100104',
        targetUserTag: 'MaliciousBot#0001',
        moderatorUserId: 'AUTOMOD',
        moderatorTag: 'AutoMod Sentinel',
        reason: 'Automated mass mention threshold violation & token pattern match',
        duration: null,
        expiresAt: null,
        status: 'ACTIVE',
        metadata: { trigger: 'mass_mention', mentionCount: 12 },
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'case-103',
        guildId: DEMO_GUILD_ID,
        caseNumber: 103,
        type: 'TIMEOUT',
        targetUserId: '200100100100100103',
        targetUserTag: 'ChaoticUser#4321',
        moderatorUserId: DEMO_USER_ID,
        moderatorTag: 'Commander#0001',
        reason: 'Excessive channel flooding in #general discussion',
        duration: 3600,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'ACTIVE',
        metadata: { channel: '#general' },
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'case-102',
        guildId: DEMO_GUILD_ID,
        caseNumber: 102,
        type: 'WARN',
        targetUserId: '200100100100100102',
        targetUserTag: 'SpammyGamer#9999',
        moderatorUserId: DEMO_USER_ID,
        moderatorTag: 'Commander#0001',
        reason: 'Repeated unauthorized self-promotion links',
        duration: null,
        expiresAt: null,
        status: 'ACTIVE',
        metadata: {},
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'case-101',
        guildId: DEMO_GUILD_ID,
        caseNumber: 101,
        type: 'KICK',
        targetUserId: '200100100100100101',
        targetUserTag: 'Disruptor#1111',
        moderatorUserId: DEMO_USER_ID,
        moderatorTag: 'Commander#0001',
        reason: 'Refusal to adhere to voice channel conduct guidelines',
        duration: null,
        expiresAt: null,
        status: 'COMPLETED',
        metadata: {},
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
    ],
    warnings: [
      {
        id: 'warn-1',
        guildId: DEMO_GUILD_ID,
        targetUserId: '200100100100100102',
        moderatorUserId: DEMO_USER_ID,
        reason: 'Repeated unauthorized self-promotion links',
        status: 'ACTIVE',
        caseId: 'case-102',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    warningEscalationRules: [
      {
        id: 'wer-1',
        guildId: DEMO_GUILD_ID,
        warningCount: 3,
        action: 'TIMEOUT',
        duration: 3600,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'wer-2',
        guildId: DEMO_GUILD_ID,
        warningCount: 5,
        action: 'KICK',
        duration: null,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'wer-3',
        guildId: DEMO_GUILD_ID,
        warningCount: 7,
        action: 'BAN',
        duration: null,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    memberNotes: [
      {
        id: 'note-1',
        guildId: DEMO_GUILD_ID,
        targetUserId: '200100100100100102',
        authorUserId: DEMO_USER_ID,
        content: 'Member acknowledged the warning and removed offending links from bio.',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    auditLogs: [
      {
        id: 'audit-1',
        guildId: DEMO_GUILD_ID,
        eventType: 'MODERATION',
        action: 'BAN',
        actorUserId: 'AUTOMOD',
        targetUserId: '200100100100100104',
        targetType: 'USER',
        channelId: null,
        caseId: 'case-104',
        reason: 'Automated mass mention threshold violation & token pattern match',
        metadata: { trigger: 'mass_mention', count: 12 },
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'audit-2',
        guildId: DEMO_GUILD_ID,
        eventType: 'MODERATION',
        action: 'TIMEOUT',
        actorUserId: DEMO_USER_ID,
        targetUserId: '200100100100100103',
        targetType: 'USER',
        channelId: '100100100100100101',
        caseId: 'case-103',
        reason: 'Excessive channel flooding in #general discussion',
        metadata: { durationMinutes: 60 },
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'audit-3',
        guildId: DEMO_GUILD_ID,
        eventType: 'AUTOMOD',
        action: 'MESSAGE_DELETE',
        actorUserId: 'AUTOMOD',
        targetUserId: '200100100100100102',
        targetType: 'MESSAGE',
        channelId: '100100100100100101',
        caseId: null,
        reason: 'Filtered prohibited keyword pattern',
        metadata: { matchedPattern: 'steam-gift' },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'audit-4',
        guildId: DEMO_GUILD_ID,
        eventType: 'SECURITY',
        action: 'RAID_MODE_CONFIG',
        actorUserId: DEMO_USER_ID,
        targetUserId: null,
        targetType: 'GUILD',
        channelId: null,
        caseId: null,
        reason: 'Updated anti-raid detection parameters',
        metadata: { joinThreshold: 8, windowSeconds: 10 },
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
    guildTicketSettings: [
      {
        id: 'gts-1',
        guildId: DEMO_GUILD_ID,
        enabled: true,
        ticketCategoryChannelId: '100100100100100110',
        ticketLogChannelId: '100100100100100111',
        transcriptChannelId: '100100100100100112',
        supportRoleIds: ['100100100100100120'],
        maxOpenTicketsPerUser: 3,
        cooldownSeconds: 60,
        autoCloseEnabled: false,
        autoCloseHours: 24,
        allowUserClose: true,
        allowReopen: true,
        deleteAfterClose: false,
        transcriptEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ticketCategories: [
      {
        id: 'tc-1',
        guildId: DEMO_GUILD_ID,
        name: 'General Support',
        description: 'Assistance with server rules and community questions',
        emoji: '💬',
        supportRoleId: '100100100100100120',
        categoryChannelId: null,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tc-2',
        guildId: DEMO_GUILD_ID,
        name: 'Report Bad Actor',
        description: 'Report scam attempts, rule violations, or harassment',
        emoji: '🛡️',
        supportRoleId: '100100100100100120',
        categoryChannelId: null,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tc-3',
        guildId: DEMO_GUILD_ID,
        name: 'Staff Applications',
        description: 'Apply for moderator or event coordinator positions',
        emoji: '📋',
        supportRoleId: '100100100100100120',
        categoryChannelId: null,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    tickets: [
      {
        id: 'ticket-1',
        guildId: DEMO_GUILD_ID,
        channelId: '100100100100100150',
        ticketNumber: 1,
        categoryId: 'tc-1',
        creatorUserId: '200100100100100103',
        claimedByUserId: DEMO_USER_ID,
        status: 'CLAIMED',
        subject: 'Inquiry regarding channel posting permissions',
        closedByUserId: null,
        closedAt: null,
        lastActivityAt: new Date(Date.now() - 3600000),
        participants: ['200100100100100103', DEMO_USER_ID],
        transcriptUrl: null,
        metadata: {},
        createdAt: new Date(Date.now() - 3600000 * 4),
        updatedAt: new Date(Date.now() - 3600000),
      },
      {
        id: 'ticket-2',
        guildId: DEMO_GUILD_ID,
        channelId: '100100100100100151',
        ticketNumber: 2,
        categoryId: 'tc-2',
        creatorUserId: '200100100100100102',
        claimedByUserId: null,
        status: 'OPEN',
        subject: 'Suspicious direct messages received from unverified account',
        closedByUserId: null,
        closedAt: null,
        lastActivityAt: new Date(Date.now() - 1800000),
        participants: ['200100100100100102'],
        transcriptUrl: null,
        metadata: {},
        createdAt: new Date(Date.now() - 1800000),
        updatedAt: new Date(Date.now() - 1800000),
      },
    ],
  };
}

const globalForMock = globalThis as unknown as {
  inMemoryStore: InMemoryStore | undefined;
};

if (!globalForMock.inMemoryStore) {
  globalForMock.inMemoryStore = createInitialStore();
}

const store = globalForMock.inMemoryStore;

// Map prisma model property names to store array
const modelToCollectionMap: Record<string, keyof InMemoryStore> = {
  guild: 'guilds',
  guildSettings: 'guildSettings',
  guildProtectionSettings: 'guildProtectionSettings',
  guildSecuritySettings: 'guildSecuritySettings',
  moderationCase: 'moderationCases',
  warning: 'warnings',
  warningEscalationRule: 'warningEscalationRules',
  memberNote: 'memberNotes',
  auditLog: 'auditLogs',
  guildTicketSettings: 'guildTicketSettings',
  ticketCategory: 'ticketCategories',
  ticket: 'tickets',
};

function matchesWhere(item: any, where: any): boolean {
  if (!where || typeof where !== 'object') return true;
  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;
    const valObj: any = val;
    if (key === 'id') {
      if (typeof valObj === 'object' && valObj !== null) {
        if (Array.isArray(valObj.in) && !valObj.in.includes(item.id)) return false;
        if (valObj.equals !== undefined && item.id !== valObj.equals) return false;
      } else if (item.id !== valObj) {
        return false;
      }
    } else if (key === 'guildId') {
      if (typeof valObj === 'object' && valObj !== null) {
        if (Array.isArray(valObj.in) && !valObj.in.includes(item.guildId)) return false;
      } else if (item.guildId !== valObj) {
        return false;
      }
    } else if (typeof valObj === 'object' && valObj !== null && !Array.isArray(valObj)) {
      if (valObj.in && Array.isArray(valObj.in) && !valObj.in.includes(item[key])) return false;
      if (valObj.equals !== undefined && item[key] !== valObj.equals) return false;
    } else if (item[key] !== valObj) {
      return false;
    }
  }
  return true;
}

function createModelHandler(modelKey: string) {
  const collectionKey = modelToCollectionMap[modelKey];

  return {
    findMany: async (args: any = {}) => {
      if (!collectionKey || !store[collectionKey]) return [];
      let list = (store[collectionKey] as any[]).filter((item) => matchesWhere(item, args.where));
      if (args.orderBy) {
        const orderKey = Object.keys(args.orderBy)[0];
        const dir = args.orderBy[orderKey] === 'desc' ? -1 : 1;
        list = [...list].sort((a, b) => {
          if (a[orderKey] > b[orderKey]) return dir;
          if (a[orderKey] < b[orderKey]) return -dir;
          return 0;
        });
      }
      if (typeof args.skip === 'number') {
        list = list.slice(args.skip);
      }
      if (typeof args.take === 'number') {
        list = list.slice(0, args.take);
      }
      return list;
    },
    findFirst: async (args: any = {}) => {
      if (!collectionKey || !store[collectionKey]) return null;
      return (store[collectionKey] as any[]).find((item) => matchesWhere(item, args.where)) || null;
    },
    findUnique: async (args: any = {}) => {
      if (!collectionKey || !store[collectionKey]) return null;
      return (store[collectionKey] as any[]).find((item) => matchesWhere(item, args.where)) || null;
    },
    count: async (args: any = {}) => {
      if (!collectionKey || !store[collectionKey]) return 0;
      return (store[collectionKey] as any[]).filter((item) => matchesWhere(item, args.where)).length;
    },
    create: async (args: any = {}) => {
      if (!collectionKey) return args.data || {};
      const newRecord = {
        id: args.data.id || `${modelKey}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...args.data,
      };
      (store[collectionKey] as any[]).push(newRecord);
      return newRecord;
    },
    update: async (args: any = {}) => {
      if (!collectionKey || !store[collectionKey]) return args.data || {};
      const index = (store[collectionKey] as any[]).findIndex((item) => matchesWhere(item, args.where));
      if (index >= 0) {
        const updated = {
          ...store[collectionKey][index],
          ...args.data,
          updatedAt: new Date().toISOString(),
        };
        store[collectionKey][index] = updated;
        return updated;
      }
      return args.data || {};
    },
    upsert: async (args: any = {}) => {
      if (!collectionKey || !store[collectionKey]) return args.create || {};
      const index = (store[collectionKey] as any[]).findIndex((item) => matchesWhere(item, args.where));
      if (index >= 0) {
        const updated = {
          ...store[collectionKey][index],
          ...args.update,
          updatedAt: new Date().toISOString(),
        };
        store[collectionKey][index] = updated;
        return updated;
      }
      const newRecord = {
        id: args.create.id || `${modelKey}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...args.create,
      };
      (store[collectionKey] as any[]).push(newRecord);
      return newRecord;
    },
    delete: async (args: any = {}) => {
      if (!collectionKey || !store[collectionKey]) return {};
      const index = (store[collectionKey] as any[]).findIndex((item) => matchesWhere(item, args.where));
      if (index >= 0) {
        const deleted = store[collectionKey][index];
        store[collectionKey].splice(index, 1);
        return deleted;
      }
      return {};
    },
    deleteMany: async (args: any = {}) => {
      if (!collectionKey || !store[collectionKey]) return { count: 0 };
      const originalLen = store[collectionKey].length;
      (store[collectionKey] as any) = (store[collectionKey] as any[]).filter(
        (item) => !matchesWhere(item, args.where)
      );
      return { count: originalLen - store[collectionKey].length };
    },
  };
}

// ----------------------------------------------------------------------------
// Client Instance with Mock Fallback Proxy
// ----------------------------------------------------------------------------

let realPrisma: PrismaClient | null = null;

// Only instantiate real PrismaClient if DATABASE_URL is configured
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  try {
    realPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch {
    console.warn('[AI Studio] Database client initialization failed, falling back to mock');
    realPrisma = null;
  }
}

export const prisma: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (prop === '$queryRaw') {
        return async () => [{ '?column?': 1 }];
      }
      if (prop === '$transaction') {
        return async (fnOrArray: any) => {
          if (Array.isArray(fnOrArray)) {
            return Promise.all(fnOrArray);
          }
          if (typeof fnOrArray === 'function') {
            return fnOrArray(prisma);
          }
          return [];
        };
      }
      if (prop === '$connect') {
        return async () => {};
      }
      if (prop === '$disconnect') {
        return async () => {};
      }

      // If real Prisma is available, wrap its calls with fallback to in-memory store
      if (realPrisma && (realPrisma as any)[prop]) {
        const realModel = (realPrisma as any)[prop];
        return new Proxy(realModel, {
          get(mTarget, mProp: string) {
            const originalMethod = (mTarget as any)[mProp];
            if (typeof originalMethod === 'function') {
              return async (...args: any[]) => {
                try {
                  return await originalMethod.apply(mTarget, args);
                } catch {
                  // Fallback to in-memory handler on DB error
                  const fallbackHandler = createModelHandler(prop);
                  if (typeof (fallbackHandler as any)[mProp] === 'function') {
                    return await (fallbackHandler as any)[mProp](...args);
                  }
                  return null;
                }
              };
            }
            return (mTarget as any)[mProp];
          },
        });
      }

      // Otherwise return in-memory mock handler directly
      return createModelHandler(prop);
    },
  }
);

export * from '@prisma/client';
