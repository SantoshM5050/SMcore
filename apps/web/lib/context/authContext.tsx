'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { discordAvatarUrl, discordGuildIconUrl, getBotInstallUrl } from '@/lib/auth/discord';

// ------------------------------------------------------------
// Auth context types
// ------------------------------------------------------------
export interface AuthUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  discriminator: string;
  avatarUrl: string | null;
  displayName: string;
}

export interface ManagedGuild {
  id: string;
  name: string;
  icon: string | null;
  iconUrl: string | null;
  owner: boolean;
  permissions: string;
  botPresent: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  managedGuilds: ManagedGuild[];
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  botInstallUrl: string;
  refreshAuth: () => Promise<void>;
}

// ------------------------------------------------------------
// Context
// ------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ------------------------------------------------------------
// Raw API response types (from /api/auth/me)
// ------------------------------------------------------------
interface MeResponse {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
    discriminator: string;
  };
  guilds?: Array<{
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    botPresent: boolean;
  }>;
}

// ------------------------------------------------------------
// Provider
// ------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [managedGuilds, setManagedGuilds] = useState<ManagedGuild[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });

      if (!res.ok) {
        setUser(null);
        setManagedGuilds([]);
        setIsAuthenticated(false);
        return;
      }

      const data = (await res.json()) as MeResponse;

      if (!data.authenticated || !data.user) {
        setUser(null);
        setManagedGuilds([]);
        setIsAuthenticated(false);
        return;
      }

      const u = data.user;
      const avatarUrl = discordAvatarUrl(u.id, u.avatar);

      setUser({
        id: u.id,
        username: u.username,
        globalName: u.globalName,
        avatar: u.avatar,
        discriminator: u.discriminator,
        avatarUrl,
        displayName: u.globalName ?? u.username,
      });

      if (data.guilds) {
        setManagedGuilds(
          data.guilds.map((g) => ({
            id: g.id,
            name: g.name,
            icon: g.icon,
            iconUrl: discordGuildIconUrl(g.id, g.icon),
            owner: g.owner,
            permissions: g.permissions,
            botPresent: g.botPresent,
          }))
        );
      }

      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setManagedGuilds([]);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } finally {
      setUser(null);
      setManagedGuilds([]);
      setIsAuthenticated(false);
      // Hard redirect to login
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        managedGuilds,
        isAuthenticated,
        isLoading,
        logout,
        botInstallUrl: getBotInstallUrl(),
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
