'use client';

import React from 'react';
import { useGuild } from '../lib/context/guildContext';

export function Topbar() {
  const { selectedGuildId, availableGuilds, health, isDbOffline } = useGuild();
  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId) || {
    name: selectedGuildId ? `Guild ${selectedGuildId}` : 'No Server Selected',
    id: selectedGuildId || '',
  };

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-surface/85 backdrop-blur-xl z-40 border-b border-outline-variant/30 shadow-[0_1px_12px_rgba(0,0,0,0.35)]">
      <div className="h-16 w-full px-6 flex items-center justify-between">
        {/* Left Telemetry Strip */}
        <div className="flex items-center gap-4">
          {/* Bot Gateway Telemetry */}
          <div
            className={`flex items-center gap-2 font-mono text-[11px] px-2.5 py-1 rounded-full border ${
              health.bot === 'online'
                ? 'bg-tertiary-container/20 text-tertiary border-tertiary/30'
                : 'bg-error-container/20 text-error border-error/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                health.bot === 'online' ? 'bg-tertiary animate-pulse' : 'bg-error'
              }`}
            />
            <span>Bot Gateway: {health.bot === 'online' ? 'Online' : 'Offline'}</span>
            <span className="text-outline-variant">•</span>
            <span>{health.pingMs}ms</span>
            {health.guildCount > 0 && (
              <>
                <span className="text-outline-variant">•</span>
                <span>{health.guildCount} guild{health.guildCount === 1 ? '' : 's'}</span>
              </>
            )}
          </div>

          {/* Database Health Pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-full border ${
              !isDbOffline && health.db === 'connected'
                ? 'bg-tertiary-container/20 text-tertiary border-tertiary/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !isDbOffline && health.db === 'connected' ? 'bg-tertiary' : 'bg-amber-400'
              }`}
            />
            <span>DB: {!isDbOffline && health.db === 'connected' ? 'Connected' : 'Database Unavailable'}</span>
          </div>

          {/* Current Guild Breadcrumb */}
          {currentGuild.id && (
            <div className="hidden xl:flex items-center gap-2 text-xs text-outline">
              <span className="material-symbols-outlined text-[16px]">dns</span>
              <span className="text-on-surface font-semibold truncate max-w-[180px]">{currentGuild.name}</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-on-surface-variant font-mono text-[11px]">Control Panel</span>
            </div>
          )}
        </div>

        {/* Right Action Icons & Status */}
        <div className="flex items-center gap-3">
          {isDbOffline && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-[11px] border border-amber-500/30">
              <span className="material-symbols-outlined text-[15px]">cloud_off</span>
              <span>Database unavailable</span>
            </div>
          )}

          {/* Docs Link */}
          <a
            href="https://github.com/SantoshM5050/SMcore"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span className="hidden lg:inline">Docs</span>
          </a>

          <div className="w-px h-5 bg-surface-container-highest mx-1 hidden sm:block" />

          {/* Staff SecOps Badge */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs ring-1 ring-primary/40">
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            </div>
            <span className="text-xs font-semibold text-on-surface hidden md:inline">SecOps Staff</span>
          </div>
        </div>
      </div>
    </header>
  );
}
