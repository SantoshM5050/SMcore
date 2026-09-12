'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/apiClient';

export interface GuildInfo {
  id: string;
  name: string;
  memberCount?: number;
  icon?: string | null;
}

export interface HealthState {
  bot: 'online' | 'offline' | 'unknown';
  db: 'connected' | 'degraded' | 'offline' | 'unknown';
  pingMs: number;
}

interface GuildContextValue {
  selectedGuildId: string;
  setSelectedGuildId: (id: string) => void;
  availableGuilds: GuildInfo[];
  isLoadingGuilds: boolean;
  isDbOffline: boolean;
  health: HealthState;
  refreshGuilds: () => Promise<void>;
  refreshHealth: () => Promise<void>;
}

const GuildContext = createContext<GuildContextValue | undefined>(undefined);

const DEFAULT_FALLBACK_GUILD: GuildInfo = {
  id: '123456789012345678',
  name: 'Apex Network',
  memberCount: 148200,
  icon: null,
};

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const [selectedGuildId, setSelectedGuildIdState] = useState<string>('123456789012345678');
  const [availableGuilds, setAvailableGuilds] = useState<GuildInfo[]>([DEFAULT_FALLBACK_GUILD]);
  const [isLoadingGuilds, setIsLoadingGuilds] = useState(true);
  const [isDbOffline, setIsDbOffline] = useState(false);
  const [health, setHealth] = useState<HealthState>({
    bot: 'unknown',
    db: 'unknown',
    pingMs: 24,
  });

  const setSelectedGuildId = useCallback((id: string) => {
    setSelectedGuildIdState(id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smcore_selected_guild_id', id);
      } catch {
        // Ignore localStorage error
      }
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const res = await apiClient.getHealth();
      if (res.success && res.data) {
        const dbStatus = res.data.database?.status;
        const botStatus = res.data.gateway?.status;
        setHealth({
          db: dbStatus === 'connected' ? 'connected' : dbStatus === 'degraded' ? 'degraded' : 'offline',
          bot: botStatus === 'connected' ? 'online' : 'offline',
          pingMs: res.data.gateway?.pingMs ?? 24,
        });
        if (dbStatus === 'offline') {
          setIsDbOffline(true);
        } else if (dbStatus === 'connected') {
          setIsDbOffline(false);
        }
      } else {
        setHealth((prev) => ({ ...prev, db: 'offline' }));
        setIsDbOffline(true);
      }
    } catch {
      setHealth((prev) => ({ ...prev, db: 'offline', bot: 'offline' }));
      setIsDbOffline(true);
    }
  }, []);

  const refreshGuilds = useCallback(async () => {
    setIsLoadingGuilds(true);
    try {
      const res = await apiClient.getGuilds();
      if (res.meta?.dbOffline || res.meta?.fallback) {
        setIsDbOffline(true);
      }
      if (res.success && res.data && res.data.length > 0) {
        setAvailableGuilds(res.data);
        // If current guild is not in list, pick first
        setSelectedGuildIdState((prev) => {
          const exists = res.data!.some((g) => g.id === prev);
          return exists ? prev : res.data![0].id;
        });
      } else {
        setAvailableGuilds([DEFAULT_FALLBACK_GUILD]);
      }
    } catch {
      setIsDbOffline(true);
      setAvailableGuilds([DEFAULT_FALLBACK_GUILD]);
    } finally {
      setIsLoadingGuilds(false);
    }
  }, []);

  useEffect(() => {
    // Restore saved guild id from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smcore_selected_guild_id');
        if (saved && /^\d{17,20}$/.test(saved)) {
          setSelectedGuildIdState(saved);
        }
      } catch {
        // Ignore
      }
    }

    refreshHealth();
    refreshGuilds();

    // Periodic health poll (every 30s)
    const interval = setInterval(refreshHealth, 30000);
    return () => clearInterval(interval);
  }, [refreshHealth, refreshGuilds]);

  return (
    <GuildContext.Provider
      value={{
        selectedGuildId,
        setSelectedGuildId,
        availableGuilds,
        isLoadingGuilds,
        isDbOffline,
        health,
        refreshGuilds,
        refreshHealth,
      }}
    >
      {children}
    </GuildContext.Provider>
  );
}

export function useGuild(): GuildContextValue {
  const ctx = useContext(GuildContext);
  if (!ctx) {
    throw new Error('useGuild must be used within a GuildProvider');
  }
  return ctx;
}
