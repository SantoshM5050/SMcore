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

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || {
          code: `HTTP_${res.status}`,
          message: data?.message || `Request failed with status ${res.status}`,
        },
      };
    }

    return data || { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Network request failed or server unreachable',
      },
    };
  }
}

export const apiClient = {
  health: {
    get: () =>
      apiFetch<{
        api: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
        database: { status: 'connected' | 'offline' | 'degraded' };
        gateway: { status: 'connected' | 'offline'; pingMs?: number };
      }>('/api/health'),
  },

  guilds: {
    list: () =>
      apiFetch<
        Array<{
          id: string;
          name: string;
          icon?: string | null;
          ownerId?: string;
          memberCount?: number;
          botPresent?: boolean;
        }>
      >('/api/guilds'),
  },

  cases: {
    list: (
      guildId: string,
      params?: { page?: number; pageSize?: number; type?: string; search?: string; limit?: number }
    ) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.pageSize || params?.limit) query.set('pageSize', String(params.pageSize || params.limit));
      if (params?.type && params.type !== 'all') query.set('type', params.type);
      return apiFetch<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/api/guilds/${guildId}/cases?${query.toString()}`);
    },
  },

  members: {
    getWarnings: (guildId: string, userId: string) =>
      apiFetch<any[]>(`/api/guilds/${guildId}/members/${userId}/warnings`),
    getNotes: (guildId: string, userId: string) =>
      apiFetch<any[]>(`/api/guilds/${guildId}/members/${userId}/notes`),
  },

  protection: {
    get: (guildId: string) =>
      apiFetch<any>(`/api/guilds/${guildId}/protection`),
    update: (guildId: string, settings: any) =>
      apiFetch<any>(`/api/guilds/${guildId}/protection`, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      }),
  },

  security: {
    get: (guildId: string) =>
      apiFetch<any>(`/api/guilds/${guildId}/security`),
    update: (guildId: string, settings: any) =>
      apiFetch<any>(`/api/guilds/${guildId}/security`, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      }),
    getStatus: (guildId: string) =>
      apiFetch<any>(`/api/guilds/${guildId}/security/status`),
  },

  auditLogs: {
    list: (guildId: string, params?: Record<string, string | number | undefined>) => {
      const query = new URLSearchParams();
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== '') query.set(k, String(v));
        }
      }
      return apiFetch<any[]>(`/api/guilds/${guildId}/audit-logs?${query.toString()}`);
    },
    getById: (guildId: string, id: string) =>
      apiFetch<any>(`/api/guilds/${guildId}/audit-logs/${id}`),
  },

  // Top-level aliases
  getHealth: () => apiClient.health.get(),
  getGuilds: () => apiClient.guilds.list(),
  getCases: (guildId: string, params?: any) => apiClient.cases.list(guildId, params),
  getSecuritySettings: (guildId: string) => apiClient.security.get(guildId),
  updateSecuritySettings: (guildId: string, data: any) => apiClient.security.update(guildId, data),
  getRaidStatus: (guildId: string) => apiClient.security.getStatus(guildId),
  getProtectionSettings: (guildId: string) => apiClient.protection.get(guildId),
  updateProtectionSettings: (guildId: string, data: any) => apiClient.protection.update(guildId, data),
  getAuditLogs: (guildId: string, params?: any) => apiClient.auditLogs.list(guildId, params),
};
