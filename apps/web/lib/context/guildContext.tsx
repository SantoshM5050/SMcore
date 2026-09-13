'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/apiClient';
import { useAuth, ManagedGuild } from './authContext';

export interface GuildItem {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  botPresent: boolean;
  memberCount?: number;
  iconUrl?: string | null;
}

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

function managedGuildToGuildItem(g: ManagedGuild): GuildItem {
  return {
    id: g.id,
    name: g.name,
    icon: g.icon,
    ownerId: g.owner ? 'self' : '',
    botPresent: g.botPresent,
    iconUrl: g.iconUrl,
  };
}

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const { managedGuilds, isLoading: authLoading } = useAuth();

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

  const [isDbOffline, setIsDbOffline] = useState(false);
  const [health, setHealth] = useState<HealthState>({
    bot: 'unknown',
    db: 'unknown',
    pingMs: 0,
    uptimeSeconds: 0,
    guildCount: 0,
  });

  // Derive available guilds from the auth context (real Discord OAuth guilds)
  const availableGuilds: GuildItem[] = managedGuilds.map(managedGuildToGuildItem);
  const isLoadingGuilds = authLoading;

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

  // Auto-select first guild if current selection is not in available guilds
  useEffect(() => {
    if (authLoading || availableGuilds.length === 0) return;

    const exists = availableGuilds.some((g) => g.id === selectedGuildId);
    if (!exists) {
      const firstBotGuild = availableGuilds.find((g) => g.botPresent);
      const firstGuild = firstBotGuild ?? availableGuilds[0];
      if (firstGuild) {
        setSelectedGuildId(firstGuild.id);
      }
    }
  }, [availableGuilds, selectedGuildId, authLoading, setSelectedGuildId]);

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

  // refreshGuilds is now a no-op: guilds come from authContext (OAuth session)
  const refreshGuilds = useCallback(async () => {
    // Guilds are sourced from the authenticated session via authContext.
    // No separate API call needed.
  }, []);

  useEffect(() => {
    refreshHealth();
    const healthInterval = setInterval(refreshHealth, 10000);
    return () => clearInterval(healthInterval);
  }, [refreshHealth]);

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
