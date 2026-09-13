'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useGuild } from '../lib/context/guildContext';
import { useAuth } from '../lib/context/authContext';

interface TopbarProps {
  onToggleMobileSidebar?: () => void;
}

export function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const { selectedGuildId, availableGuilds, health, isDbOffline } = useGuild();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId) || {
    name: selectedGuildId ? `Guild ${selectedGuildId}` : 'No Server Selected',
    id: selectedGuildId || '',
  };

  const displayName = user?.displayName ?? user?.username ?? 'Unknown';
  const avatarUrl = user?.avatarUrl ?? null;

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/90 backdrop-blur-xl z-40 border-b border-border-subtle shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
      <div className="h-16 w-full px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left Telemetry Strip & Mobile Hamburger */}
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg bg-surface-container text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors shrink-0"
            aria-label="Open sidebar menu"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Bot Gateway Telemetry */}
          <div
            className={`flex items-center gap-2 font-mono text-[11px] px-2.5 py-1 rounded-full border shrink-0 ${
              health.bot === 'online'
                ? 'bg-tertiary/15 text-tertiary border-tertiary/30'
                : 'bg-error/15 text-error border-error/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                health.bot === 'online' ? 'bg-tertiary animate-pulse' : 'bg-error'
              }`}
            />
            <span className="hidden sm:inline">
              Bot: {health.bot === 'online' ? 'Online' : 'Offline'}
            </span>
            <span className="sm:hidden">
              {health.bot === 'online' ? 'Online' : 'Offline'}
            </span>
            <span className="text-outline-variant">•</span>
            <span>{health.pingMs}ms</span>
          </div>

          {/* Database Health Pill */}
          <div
            className={`hidden md:flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-full border shrink-0 ${
              !isDbOffline && health.db === 'connected'
                ? 'bg-tertiary/15 text-tertiary border-tertiary/30'
                : 'bg-warning/15 text-warning border-warning/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !isDbOffline && health.db === 'connected' ? 'bg-tertiary' : 'bg-warning'
              }`}
            />
            <span>
              DB: {!isDbOffline && health.db === 'connected' ? 'Connected' : 'Unavailable'}
            </span>
          </div>

          {/* Current Guild Breadcrumb */}
          {currentGuild.id && (
            <div className="hidden xl:flex items-center gap-2 text-xs text-outline shrink truncate">
              <span className="material-symbols-outlined text-[16px] shrink-0">dns</span>
              <span className="text-on-surface font-semibold truncate max-w-[160px]">
                {currentGuild.name}
              </span>
              <span className="material-symbols-outlined text-[14px] shrink-0">chevron_right</span>
              <span className="text-on-surface-variant font-mono text-[11px] shrink-0">
                Operations Portal
              </span>
            </div>
          )}
        </div>

        {/* Right — User Identity & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isDbOffline && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warning/10 text-warning text-[11px] border border-warning/30">
              <span className="material-symbols-outlined text-[15px]">cloud_off</span>
              <span>Database unavailable</span>
            </div>
          )}

          {/* Quick Search trigger */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-container border border-border-subtle text-outline text-xs">
            <span className="material-symbols-outlined text-[16px]">search</span>
            <span className="hidden md:inline">Quick Search...</span>
            <kbd className="font-mono text-[10px] px-1 py-0.2 rounded bg-surface-container-high text-outline">
              ⌘K
            </kbd>
          </div>

          {/* Docs link */}
          <a
            href="https://github.com/SantoshM5050/SMcore"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 text-xs transition-colors border border-border-subtle"
            title="Read Documentation"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span className="hidden sm:inline">Docs</span>
          </a>

          <div className="w-px h-5 bg-border-subtle mx-0.5 hidden sm:block" />

          {/* User identity menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 pl-0.5 rounded-lg hover:bg-surface-container-high px-2 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="User menu"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
              id="user-menu-button"
            >
              {/* Avatar */}
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-surface-container-high animate-pulse" />
              ) : avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={`${displayName}'s avatar`}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full ring-1 ring-primary/30 object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/40">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <span className="text-xs font-semibold text-on-surface hidden md:inline max-w-[100px] truncate">
                {authLoading ? '...' : displayName}
              </span>
              <span className="material-symbols-outlined text-[14px] text-outline hidden sm:inline">
                expand_more
              </span>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 mt-2 w-52 bg-surface-container border border-border-subtle rounded-xl shadow-2xl z-20 overflow-hidden py-1"
                  role="menu"
                  aria-labelledby="user-menu-button"
                >
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-border-subtle">
                    <p className="text-xs font-semibold text-on-surface truncate">{displayName}</p>
                    {user?.username && user.username !== displayName && (
                      <p className="text-[11px] text-outline font-mono truncate mt-0.5">
                        @{user.username}
                      </p>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors text-left focus:outline-none focus-visible:bg-error/10"
                      role="menuitem"
                    >
                      <span className="material-symbols-outlined text-[17px]">logout</span>
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
