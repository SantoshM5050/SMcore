'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, GuildItem } from '../api/apiClient';

export interface HealthState {
  bot: 'online' | 'offline' | 'unknown';
  db: 'connected' | 'offline' | 'unknown';
  pingMs: number;
  uptimeSeconds: number;
  guildCount: number;
}

interface GuildContextValue {
  selectedGuildId: string;
  setSelectedGuildId: (id: string) => void;
  availableGuilds: GuildItem[];
  isLoadingGuilds: boolean;
  isDbOffline: boolean;
  health: HealthState;
  refreshGuilds: () => Promise<void>;
  refreshHealth: () => Promise<void>;
}

const GuildContext = createContext<GuildContextValue | undefined>(undefined);

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const [selectedGuildId, setSelectedGuildIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('smcore_selected_guild_id') || '';
      } catch {
        return '';
      }
    }
    return '';
  });

  const [availableGuilds, setAvailableGuilds] = useState<GuildItem[]>([]);
  const [isLoadingGuilds, setIsLoadingGuilds] = useState(true);
  const [isDbOffline, setIsDbOffline] = useState(false);
  const [health, setHealth] = useState<HealthState>({
    bot: 'unknown',
    db: 'unknown',
    pingMs: 0,
    uptimeSeconds: 0,
    guildCount: 0,
  });

  const setSelectedGuildId = useCallback((id: string) => {
    setSelectedGuildIdState(id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smcore_selected_guild_id', id);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const res = await apiClient.health.get();
      if (res.success && res.data) {
        const dbConnected = res.data.database.status === 'connected';
        const botConnected = res.data.gateway.status === 'connected';

        setHealth({
          db: dbConnected ? 'connected' : 'offline',
          bot: botConnected ? 'online' : 'offline',
          pingMs: res.data.gateway.pingMs,
          uptimeSeconds: res.data.gateway.uptimeSeconds,
          guildCount: res.data.gateway.guildCount,
        });

        setIsDbOffline(!dbConnected);
      } else {
        setHealth((prev) => ({ ...prev, db: 'offline', bot: 'offline' }));
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
      const res = await apiClient.guilds.list();
      if (res.success && Array.isArray(res.data)) {
        setAvailableGuilds(res.data);
        setIsDbOffline(false);

        setSelectedGuildIdState((current) => {
          if (res.data!.length === 0) return '';
          const exists = res.data!.some((g) => g.id === current);
          if (exists) return current;
          const firstId = res.data![0].id;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('smcore_selected_guild_id', firstId);
            } catch {
              // Ignore
            }
          }
          return firstId;
        });
      } else {
        setAvailableGuilds([]);
        if (res.error?.code === 'DATABASE_UNAVAILABLE') {
          setIsDbOffline(true);
        }
      }
    } catch {
      setAvailableGuilds([]);
      setIsDbOffline(true);
    } finally {
      setIsLoadingGuilds(false);
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    refreshGuilds();

    const healthInterval = setInterval(refreshHealth, 10000);
    return () => clearInterval(healthInterval);
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
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuild must be used within a GuildProvider');
  }
  return context;
}
