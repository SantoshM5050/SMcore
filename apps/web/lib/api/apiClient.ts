export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    fallback?: boolean;
    dbOffline?: boolean;
    message?: string;
    timestamp?: string;
  };
  nextCursor?: string | null;
}

export interface GuildItem {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  memberCount?: number;
  botPresent?: boolean;
}

export interface ModerationCaseItem {
  id: string;
  caseNumber: number;
  guildId: string;
  type: string;
  targetUserId: string;
  targetUserTag?: string;
  moderatorUserId: string;
  moderatorTag?: string;
  reason: string;
  duration?: number | null;
  expiresAt?: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  guildId: string;
  eventType?: string;
  action: string;
  targetType?: string;
  targetId?: string | null;
  actorUserId: string;
  targetUserId?: string | null;
  channelId?: string | null;
  caseId?: number | null;
  actorTag?: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface GuildSettingsData {
  guildId: string;
  prefix: string;
  language: string;
  timezone: string;
  modLogChannelId: string | null;
  actionLogChannelId: string | null;
  muteRoleId: string | null;
  appealUrl: string | null;
}

export interface ProtectionSettingsData {
  antiSpamEnabled: boolean;
  antiSpamMessageLimit: number;
  antiSpamWindowSeconds: number;
  duplicateMessageLimit: number;
  antiSpamPunishment: string;
  massMentionEnabled: boolean;
  maxUserMentions: number;
  maxRoleMentions: number;
  maxTotalMentions: number;
  everyoneMentionAllowed: boolean;
  massMentionPunishment: string;
  inviteFilterEnabled: boolean;
  allowedInviteGuilds: string[];
  inviteFilterPunishment: string;
  externalLinkFilterEnabled: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
  externalLinkPunishment: string;
  keywordFilterEnabled: boolean;
  prohibitedKeywords: string[];
  keywordPunishment: string;
  deleteViolatingMessages: boolean;
}

export interface SecuritySettingsData {
  enabled: boolean;
  raidDetectionEnabled: boolean;
  raidJoinThreshold: number;
  raidWindowSeconds: number;
  raidModeDurationSeconds: number;
  raidAction: string;
  accountAgeProtectionEnabled: boolean;
  minimumAccountAgeHours: number;
  accountAgeAction: string;
  quarantineEnabled: boolean;
  quarantineRoleId: string | null;
  removeRolesOnQuarantine: boolean;
  restoreRolesOnRelease: boolean;
  raidModeEnabled?: boolean;
}

export interface TicketItem {
  id: string;
  guildId: string;
  channelId: string;
  ticketNumber: number;
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
    emoji?: string | null;
  } | null;
  creatorUserId: string;
  claimedByUserId: string | null;
  status: 'OPEN' | 'CLAIMED' | 'CLOSED' | 'REOPENED' | 'RESOLVED';
  subject: string | null;
  closedByUserId: string | null;
  closedAt: string | null;
  lastActivityAt: string;
  participants: string[];
  transcriptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketSettingsData {
  guildId: string;
  enabled: boolean;
  ticketCategoryChannelId: string | null;
  logChannelId: string | null;
  transcriptChannelId: string | null;
  supportRoleIds: string[];
  maxOpenTicketsPerUser: number;
  cooldownSeconds: number;
  autoCloseHours: number;
  allowReopen: boolean;
  deleteAfterClose: boolean;
  transcriptEnabled: boolean;
}

export interface TicketCategoryItem {
  id: string;
  guildId: string;
  name: string;
  description: string | null;
  emoji: string | null;
  categoryChannelId: string | null;
  supportRoleId: string | null;
  ticketPrefix: string;
  defaultSubject: string | null;
  enabled: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = (await res.json().catch(() => null)) as ApiResponse<T> | null;

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || {
          code: `HTTP_${res.status}`,
          message: 'Request failed with status ' + res.status,
        },
      };
    }

    return data || { success: true };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network request failed or server unreachable',
      },
    };
  }
}

export const apiClient = {
  health: {
    get: () =>
      apiFetch<{
        api: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
        database: { status: 'connected' | 'offline' };
        gateway: {
          status: 'connected' | 'offline';
          pingMs: number;
          uptimeSeconds: number;
          guildCount: number;
        };
        latencyMs: number;
        timestamp: string;
      }>('/api/health'),
  },

  guilds: {
    list: () => apiFetch<GuildItem[]>('/api/guilds'),
  },

  cases: {
    list: (
      guildId: string,
      params?: { page?: number; pageSize?: number; limit?: number; type?: string; targetUserId?: string; search?: string }
    ) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.pageSize || params?.limit) query.set('pageSize', String(params.pageSize || params.limit));
      if (params?.type && params.type !== 'ALL') query.set('type', params.type);
      if (params?.targetUserId) query.set('targetUserId', params.targetUserId);
      return apiFetch<{
        items: ModerationCaseItem[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/api/guilds/${guildId}/cases?${query.toString()}`);
    },
  },

  moderation: {
    executeAction: (
      guildId: string,
      payload: {
        action: 'WARN' | 'TIMEOUT' | 'UNTIMEOUT' | 'KICK' | 'BAN' | 'UNBAN' | 'PURGE' | 'LOCK' | 'UNLOCK' | 'SLOWMODE';
        targetUserId?: string;
        moderatorUserId?: string;
        reason?: string;
        durationSeconds?: number;
        deleteMessageSeconds?: number;
        channelId?: string;
        messageCount?: number;
        slowmodeSeconds?: number;
      }
    ) =>
      apiFetch<{
        success: boolean;
        message: string;
        caseNumber?: number;
        error?: string;
      }>(`/api/guilds/${guildId}/actions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  members: {
    getWarnings: (guildId: string, userId: string) =>
      apiFetch<Array<{ id: string; reason: string; status: string; createdAt: string }>>(
        `/api/guilds/${guildId}/members/${userId}/warnings`
      ),
    getNotes: (guildId: string, userId: string) =>
      apiFetch<Array<{ id: string; note: string; createdAt: string }>>(
        `/api/guilds/${guildId}/members/${userId}/notes`
      ),
  },

  settings: {
    get: (guildId: string) => apiFetch<GuildSettingsData>(`/api/guilds/${guildId}/settings`),
    update: (guildId: string, data: Partial<GuildSettingsData>) =>
      apiFetch<GuildSettingsData>(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  protection: {
    get: (guildId: string) => apiFetch<ProtectionSettingsData>(`/api/guilds/${guildId}/protection`),
    update: (guildId: string, data: Partial<ProtectionSettingsData>) =>
      apiFetch<ProtectionSettingsData>(`/api/guilds/${guildId}/protection`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  security: {
    get: (guildId: string) => apiFetch<SecuritySettingsData>(`/api/guilds/${guildId}/security`),
    update: (guildId: string, data: Partial<SecuritySettingsData>) =>
      apiFetch<SecuritySettingsData>(`/api/guilds/${guildId}/security`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getStatus: (guildId: string) =>
      apiFetch<{
        active: boolean;
        recentJoins: number;
        quarantinedCount: number;
      }>(`/api/guilds/${guildId}/security/status`),
    toggleRaidMode: (guildId: string, payload: { engage: boolean; reason?: string }) =>
      apiFetch<{
        success: boolean;
        raidModeEnabled: boolean;
        message: string;
      }>(`/api/guilds/${guildId}/security/raid-mode`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  auditLogs: {
    list: (guildId: string, params?: { limit?: number; page?: number; eventType?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.page) query.set('page', String(params.page));
      if (params?.eventType && params.eventType !== 'ALL') query.set('eventType', params.eventType);
      return apiFetch<AuditLogItem[]>(`/api/guilds/${guildId}/audit-logs?${query.toString()}`);
    },
    getById: (guildId: string, id: string) =>
      apiFetch<AuditLogItem>(`/api/guilds/${guildId}/audit-logs/${id}`),
  },

  tickets: {
    list: (
      guildId: string,
      params?: { page?: number; limit?: number; pageSize?: number; status?: string; categoryId?: string; creatorUserId?: string; search?: string }
    ) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      const size = params?.pageSize || params?.limit;
      if (size) query.set('pageSize', String(size));
      if (params?.status && params.status !== 'ALL') query.set('status', params.status);
      if (params?.categoryId) query.set('categoryId', params.categoryId);
      if (params?.creatorUserId) query.set('creatorUserId', params.creatorUserId);
      if (params?.search) query.set('search', params.search);
      return apiFetch<{
        items: TicketItem[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/api/guilds/${guildId}/tickets?${query.toString()}`);
    },
    get: (guildId: string, ticketId: string) =>
      apiFetch<TicketItem>(`/api/guilds/${guildId}/tickets/${ticketId}`),
    getSettings: (guildId: string) =>
      apiFetch<TicketSettingsData>(`/api/guilds/${guildId}/ticket-settings`),
    updateSettings: (guildId: string, data: Partial<TicketSettingsData>) =>
      apiFetch<TicketSettingsData>(`/api/guilds/${guildId}/ticket-settings`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getCategories: (guildId: string) =>
      apiFetch<TicketCategoryItem[]>(`/api/guilds/${guildId}/ticket-categories`),
  },

  // Aliases
  getHealth: () => apiClient.health.get(),
  getGuilds: () => apiClient.guilds.list(),
  getCases: (
    guildId: string,
    params?: { page?: number; pageSize?: number; limit?: number; type?: string; targetUserId?: string; search?: string }
  ) => apiClient.cases.list(guildId, params),
  getSecuritySettings: (guildId: string) => apiClient.security.get(guildId),
  updateSecuritySettings: (guildId: string, data: Partial<SecuritySettingsData>) =>
    apiClient.security.update(guildId, data),
  getRaidStatus: (guildId: string) => apiClient.security.getStatus(guildId),
  getProtectionSettings: (guildId: string) => apiClient.protection.get(guildId),
  updateProtectionSettings: (guildId: string, data: Partial<ProtectionSettingsData>) =>
    apiClient.protection.update(guildId, data),
  getAuditLogs: (guildId: string, params?: { limit?: number; page?: number; eventType?: string; search?: string }) =>
    apiClient.auditLogs.list(guildId, params),
};
