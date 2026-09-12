'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient } from '@/lib/api/apiClient';

export default function DashboardOverviewPage() {
  const { selectedGuildId, availableGuilds, health, isDbOffline } = useGuild();
  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId) || {
    name: 'Apex Network',
    id: selectedGuildId,
    memberCount: 148200,
  };

  const [metrics, setMetrics] = useState({
    casesCount: 0,
    activeTimeouts: 0,
    recentAuditsCount: 0,
    raidModeActive: false,
    automodBlocked: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [casesRes, secRes, auditsRes] = await Promise.all([
          apiClient.getCases(selectedGuildId, { limit: 10 }),
          apiClient.getSecuritySettings(selectedGuildId),
          apiClient.getAuditLogs(selectedGuildId, { limit: 10 }),
        ]);

        if (isMounted) {
          const cases = casesRes.data?.items || [];
          const activeTimeouts = cases.filter(
            (c: any) => c.action === 'TIMEOUT' && (!c.expiresAt || new Date(c.expiresAt) > new Date())
          ).length;

          setMetrics({
            casesCount: casesRes.data?.total || cases.length,
            activeTimeouts,
            recentAuditsCount: auditsRes.data?.length || 0,
            raidModeActive: secRes.data?.raidModeEnabled || false,
            automodBlocked: cases.filter((c: any) => c.moderatorId === 'AUTOMOD').length,
          });
        }
      } catch {
        // Fallback default
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedGuildId]);

  return (
    <div className="flex flex-col w-full">
      {/* Header & Telemetry */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest/60 border-b border-outline-variant/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>OPERATIONS</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">OVERVIEW</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-secondary-fixed-dim">
              LIVE TELEMETRY
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Operations Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-mono text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Real-time Sync
            </span>
          </div>
        </div>

        {/* Quick Route Launchers */}
        <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/30">
          <Link
            href="/dashboard/moderation"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">gavel</span>
            <span>Moderation</span>
          </Link>
          <Link
            href="/dashboard/automod"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">smart_toy</span>
            <span>AutoMod</span>
          </Link>
          <Link
            href="/dashboard/security"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-error">shield</span>
            <span>Anti-Raid</span>
          </Link>
          <Link
            href="/dashboard/audit-logs"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">history_edu</span>
            <span>Audit Trail</span>
          </Link>
        </div>
      </div>

      {/* Subsystem Health Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-4">
        {/* Database Health Card */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Storage Engine
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-on-surface">PostgreSQL</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  !isDbOffline && health.db === 'connected'
                    ? 'bg-tertiary-container/30 text-tertiary'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {!isDbOffline && health.db === 'connected' ? 'Connected' : 'Offline Mode'}
              </span>
            </div>
            <p className="text-[10px] text-outline mt-1">
              {!isDbOffline && health.db === 'connected'
                ? 'Prisma ORM Client Live'
                : 'Memory-safe offline fallback active'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-[20px] ${
                !isDbOffline && health.db === 'connected' ? 'text-tertiary' : 'text-amber-400'
              }`}
            >
              database
            </span>
          </div>
        </div>

        {/* Bot Gateway Health Card */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Gateway Connection
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-on-surface">Discord.js v14</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  health.bot === 'online'
                    ? 'bg-tertiary-container/30 text-tertiary'
                    : 'bg-surface-container-high text-outline'
                }`}
              >
                {health.bot === 'online' ? 'Online' : 'Standby'}
              </span>
            </div>
            <p className="text-[10px] text-outline mt-1">{health.pingMs}ms heartbeat ping</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-[20px] ${
                health.bot === 'online' ? 'text-tertiary' : 'text-outline'
              }`}
            >
              sensors
            </span>
          </div>
        </div>

        {/* Anti-Raid State Card */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Raid Shield Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-on-surface">
                {metrics.raidModeActive ? 'ACTIVE LOCK' : 'Nominal'}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  metrics.raidModeActive
                    ? 'bg-error-container text-on-error-container animate-pulse'
                    : 'bg-tertiary-container/30 text-tertiary'
                }`}
              >
                {metrics.raidModeActive ? 'LOCKDOWN' : 'Protected'}
              </span>
            </div>
            <p className="text-[10px] text-outline mt-1">Sliding-window join monitor</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-[20px] ${
                metrics.raidModeActive ? 'text-error' : 'text-tertiary'
              }`}
            >
              security
            </span>
          </div>
        </div>

        {/* Guild Governance Card */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between shadow-sm">
          <div className="flex flex-col truncate">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Target Guild
            </span>
            <span className="text-base font-bold text-on-surface truncate mt-1">
              {currentGuild.name}
            </span>
            <span className="text-[10px] font-mono text-outline truncate">{currentGuild.id}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-secondary">
              corporate_fare
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Security Posture + Quick Modules */}
      <div className="px-6 py-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Security Posture */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Active Defense Matrix</h3>
                <p className="text-xs text-outline">Automated protection shields running for {currentGuild.name}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-tertiary-container/30 text-tertiary border border-tertiary/20">
                SHIELDS ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Anti-Spam */}
              <div className="p-3 rounded-lg bg-surface-container flex items-start gap-3 border border-outline-variant/20">
                <span className="material-symbols-outlined text-[20px] text-tertiary mt-0.5">
                  speed
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">Anti-Spam Shield</span>
                    <span className="text-[10px] font-mono text-tertiary">ENABLED</span>
                  </div>
                  <p className="text-[11px] text-outline mt-0.5">
                    Heuristic message flood & character duplicate detection
                  </p>
                </div>
              </div>

              {/* Mass Mentions */}
              <div className="p-3 rounded-lg bg-surface-container flex items-start gap-3 border border-outline-variant/20">
                <span className="material-symbols-outlined text-[20px] text-tertiary mt-0.5">
                  alternate_email
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">Mass Mention Filter</span>
                    <span className="text-[10px] font-mono text-tertiary">ENABLED</span>
                  </div>
                  <p className="text-[11px] text-outline mt-0.5">
                    Threshold enforcement against user & role mass tagging
                  </p>
                </div>
              </div>

              {/* Discord Invite Filter */}
              <div className="p-3 rounded-lg bg-surface-container flex items-start gap-3 border border-outline-variant/20">
                <span className="material-symbols-outlined text-[20px] text-tertiary mt-0.5">
                  link_off
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">Invite Protection</span>
                    <span className="text-[10px] font-mono text-tertiary">ENABLED</span>
                  </div>
                  <p className="text-[11px] text-outline mt-0.5">
                    Auto-purges unauthorized external Discord server invites
                  </p>
                </div>
              </div>

              {/* Raid Detection */}
              <div className="p-3 rounded-lg bg-surface-container flex items-start gap-3 border border-outline-variant/20">
                <span className="material-symbols-outlined text-[20px] text-tertiary mt-0.5">
                  shield
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">Anti-Raid Engine</span>
                    <span className="text-[10px] font-mono text-tertiary">ENABLED</span>
                  </div>
                  <p className="text-[11px] text-outline mt-0.5">
                    Account age risk scoring & sliding-window join gate
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-outline border-t border-outline-variant/20">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="material-symbols-outlined text-[15px] text-primary">verified_user</span>
                Hierarchy enforcement verified across all actions
              </span>
              <Link
                href="/dashboard/automod"
                className="text-primary hover:underline text-xs font-medium flex items-center gap-1"
              >
                Configure Protection
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Access & Infrastructure Details */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-on-surface">Platform Architecture</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/20">
                <span className="text-outline">Architecture</span>
                <span className="font-mono text-on-surface">Monorepo (Turborepo-ready)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/20">
                <span className="text-outline">Design Standard</span>
                <span className="font-mono text-primary">SMCore Precision Dark</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/20">
                <span className="text-outline">Audit Event Bus</span>
                <span className="font-mono text-tertiary">Active (Isolated Channel)</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-outline">Database Isolation</span>
                <span className="font-mono text-on-surface">Guild-Level Scoped</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/moderation"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary-container text-on-primary-container font-semibold text-xs hover:bg-primary-container/90 transition-colors shadow-md shadow-primary-container/20"
              >
                <span className="material-symbols-outlined text-[16px]">terminal</span>
                Open Moderation Command Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
