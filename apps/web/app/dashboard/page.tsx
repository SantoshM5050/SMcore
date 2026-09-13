'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient, ModerationCaseItem, AuditLogItem, TicketItem } from '@/lib/api/apiClient';
import { StatCard } from '@/components/ui/statCard';
import { StatusBadge } from '@/components/ui/statusBadge';
import { LoadingState } from '@/components/ui/loadingState';
import { EmptyState } from '@/components/ui/emptyState';

export default function DashboardOverviewPage() {
  const { selectedGuildId, availableGuilds, health, isDbOffline, isLoadingGuilds } = useGuild();
  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId);

  const [metrics, setMetrics] = useState({
    casesCount: 0,
    activeTimeouts: 0,
    recentAuditsCount: 0,
    raidModeActive: false,
    openTickets: 0,
    antiSpamActive: false,
    massMentionActive: false,
    inviteFilterActive: false,
  });

  const [recentCases, setRecentCases] = useState<ModerationCaseItem[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditLogItem[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!selectedGuildId) {
      setIsLoading(false);
      return;
    }

    async function loadData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const [casesRes, secRes, auditsRes, protRes, ticketsRes] = await Promise.all([
          apiClient.getCases(selectedGuildId, { limit: 10 }),
          apiClient.getSecuritySettings(selectedGuildId),
          apiClient.getAuditLogs(selectedGuildId, { limit: 5 }),
          apiClient.getProtectionSettings(selectedGuildId),
          apiClient.tickets.list(selectedGuildId, { limit: 5 }),
        ]);

        if (isMounted) {
          if (casesRes.error?.code === 'DATABASE_UNAVAILABLE' || auditsRes.error?.code === 'DATABASE_UNAVAILABLE') {
            setErrorMsg('Database unavailable');
          }

          const casesList = casesRes.data?.items || [];
          const activeTimeouts = casesList.filter(
            (c) => c.type === 'TIMEOUT' && (!c.expiresAt || new Date(c.expiresAt) > new Date())
          ).length;

          setRecentCases(casesList.slice(0, 5));
          setRecentAudits(auditsRes.data?.slice(0, 5) || []);
          setRecentTickets(ticketsRes.data?.items.slice(0, 5) || []);

          setMetrics({
            casesCount: casesRes.data?.total ?? casesList.length,
            activeTimeouts,
            recentAuditsCount: auditsRes.data?.length || 0,
            raidModeActive: secRes.data?.raidModeEnabled || false,
            openTickets: ticketsRes.data?.total || 0,
            antiSpamActive: protRes.data?.antiSpamEnabled || false,
            massMentionActive: protRes.data?.massMentionEnabled || false,
            inviteFilterActive: protRes.data?.inviteFilterEnabled || false,
          });
        }
      } catch {
        if (isMounted) {
          setErrorMsg('Failed to load dashboard metrics');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedGuildId]);

  if (isLoadingGuilds || (isLoading && !currentGuild)) {
    return <LoadingState message="Connecting to operational telemetry..." />;
  }

  if (!currentGuild && availableGuilds.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          icon="dns"
          title="No Discord Servers Connected"
          description="Invite the SMCore bot to your Discord server or ensure it has completed initial database synchronization."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Header & Operational Telemetry */}
      <div className="px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>OPERATIONS</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary-light font-medium">COMMAND CENTER</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-secondary-fixed">
              LIVE DISPATCH
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              Operations Command Center
            </h1>
            <StatusBadge
              variant={health.bot === 'online' ? 'emerald' : 'rose'}
              pulse={health.bot === 'online'}
            >
              {health.bot === 'online' ? 'Real-time Telemetry' : 'Bot Offline'}
            </StatusBadge>
          </div>
        </div>

        {/* Quick Route Launchers */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-container-lowest p-1.5 rounded-xl border border-border-subtle">
          <Link
            href="/dashboard/moderation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">gavel</span>
            <span>Moderation</span>
          </Link>
          <Link
            href="/dashboard/tickets"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">confirmation_number</span>
            <span>Tickets</span>
          </Link>
          <Link
            href="/dashboard/automod"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">smart_toy</span>
            <span>AutoMod</span>
          </Link>
          <Link
            href="/dashboard/security"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-error">shield</span>
            <span>Anti-Raid</span>
          </Link>
        </div>
      </div>

      {/* Error / Warning Alert Strip */}
      {(errorMsg || isDbOffline) && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-3 text-xs text-warning">
          <span className="material-symbols-outlined text-[20px]">warning</span>
          <span>{errorMsg || 'Database unavailable — please verify connection to Neon PostgreSQL.'}</span>
        </div>
      )}

      {/* Subsystem Health Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 px-4 sm:px-6 py-4">
        {/* Database Health Card */}
        <div className="p-4 rounded-xl bg-surface-container border border-border-medium flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Storage Engine
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display text-lg font-bold text-on-surface">PostgreSQL</span>
              <StatusBadge variant={!isDbOffline && health.db === 'connected' ? 'emerald' : 'amber'}>
                {!isDbOffline && health.db === 'connected' ? 'Connected' : 'Unavailable'}
              </StatusBadge>
            </div>
            <p className="text-[11px] text-outline mt-1 font-sans">
              {!isDbOffline && health.db === 'connected'
                ? 'Prisma ORM Client Live'
                : 'Connection failed or credentials unverified'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-[20px] ${
                !isDbOffline && health.db === 'connected' ? 'text-tertiary' : 'text-warning'
              }`}
            >
              database
            </span>
          </div>
        </div>

        {/* Bot Gateway Health Card */}
        <div className="p-4 rounded-xl bg-surface-container border border-border-medium flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Gateway Connection
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display text-lg font-bold text-on-surface">Discord.js v14</span>
              <StatusBadge variant={health.bot === 'online' ? 'emerald' : 'rose'}>
                {health.bot === 'online' ? 'Online' : 'Offline'}
              </StatusBadge>
            </div>
            <p className="text-[11px] text-outline mt-1 font-sans">
              {health.bot === 'online' ? `${health.pingMs}ms heartbeat latency` : 'Bot bridge unreachable'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center">
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
        <div className="p-4 rounded-xl bg-surface-container border border-border-medium flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Raid Shield Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display text-lg font-bold text-on-surface">
                {metrics.raidModeActive ? 'ACTIVE LOCK' : 'Nominal'}
              </span>
              <StatusBadge variant={metrics.raidModeActive ? 'rose' : 'emerald'} pulse={metrics.raidModeActive}>
                {metrics.raidModeActive ? 'LOCKDOWN' : 'Protected'}
              </StatusBadge>
            </div>
            <p className="text-[11px] text-outline mt-1 font-sans">Sliding-window join gate</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-[20px] ${
                metrics.raidModeActive ? 'text-error' : 'text-tertiary'
              }`}
            >
              security
            </span>
          </div>
        </div>

        {/* Target Guild Governance Card */}
        <div className="p-4 rounded-xl bg-surface-container border border-border-medium flex items-center justify-between shadow-sm">
          <div className="flex flex-col truncate">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Active Server Context
            </span>
            <span className="font-display text-base font-bold text-on-surface truncate mt-1">
              {currentGuild?.name || 'No Guild Selected'}
            </span>
            <span className="text-[11px] font-mono text-outline truncate">
              {currentGuild?.memberCount !== undefined
                ? `${currentGuild.memberCount.toLocaleString()} members`
                : currentGuild?.id || '—'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-secondary">
              corporate_fare
            </span>
          </div>
        </div>
      </div>

      {/* Real KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 px-4 sm:px-6 py-2">
        <StatCard
          label="Recorded Cases"
          value={metrics.casesCount}
          sparklineColor="primary"
          icon="gavel"
        />
        <StatCard
          label="Active Timeouts"
          value={metrics.activeTimeouts}
          sparklineColor="tertiary"
          icon="timer"
          badge={metrics.activeTimeouts > 0 ? 'Active' : undefined}
          badgeVariant="amber"
        />
        <StatCard
          label="Open Tickets"
          value={metrics.openTickets}
          sparklineColor="primary"
          icon="confirmation_number"
        />
        <StatCard
          label="Audit Events"
          value={metrics.recentAuditsCount}
          sparklineColor="tertiary"
          icon="history_edu"
        />
      </div>

      {/* Main Command Center Layout: 2 Columns */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Protection & Recent Moderation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Defense Matrix */}
          <div className="p-5 rounded-xl bg-surface-container border border-border-medium shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-on-surface">Active Defense Matrix</h3>
                <p className="text-xs text-outline font-sans">
                  Automated protection shields running for {currentGuild?.name || 'server'}
                </p>
              </div>
              <StatusBadge variant="emerald" pulse>
                SHIELD ACTIVE
              </StatusBadge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-surface-container-high flex items-start gap-3 border border-border-subtle">
                <span className="material-symbols-outlined text-[20px] text-tertiary mt-0.5">
                  speed
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">Anti-Spam Shield</span>
                    <StatusBadge variant={metrics.antiSpamActive ? 'emerald' : 'neutral'}>
                      {metrics.antiSpamActive ? 'ENABLED' : 'DISABLED'}
                    </StatusBadge>
                  </div>
                  <p className="text-[11px] text-outline mt-1 font-sans">
                    Rate-limit enforcement and message flood detection
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-container-high flex items-start gap-3 border border-border-subtle">
                <span className="material-symbols-outlined text-[20px] text-tertiary mt-0.5">
                  alternate_email
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">Mass Mention Filter</span>
                    <StatusBadge variant={metrics.massMentionActive ? 'emerald' : 'neutral'}>
                      {metrics.massMentionActive ? 'ENABLED' : 'DISABLED'}
                    </StatusBadge>
                  </div>
                  <p className="text-[11px] text-outline mt-1 font-sans">
                    Threshold mitigation against user and role mass pings
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-container-high flex items-start gap-3 border border-border-subtle">
                <span className="material-symbols-outlined text-[20px] text-tertiary mt-0.5">
                  link_off
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">Discord Invite Protection</span>
                    <StatusBadge variant={metrics.inviteFilterActive ? 'emerald' : 'neutral'}>
                      {metrics.inviteFilterActive ? 'ENABLED' : 'DISABLED'}
                    </StatusBadge>
                  </div>
                  <p className="text-[11px] text-outline mt-1 font-sans">
                    Auto-purges unauthorized external Discord server links
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-container-high flex items-start gap-3 border border-border-subtle">
                <span className="material-symbols-outlined text-[20px] text-tertiary mt-0.5">
                  shield
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">Anti-Raid Engine</span>
                    <StatusBadge variant={metrics.raidModeActive ? 'rose' : 'emerald'}>
                      {metrics.raidModeActive ? 'LOCKDOWN' : 'MONITORING'}
                    </StatusBadge>
                  </div>
                  <p className="text-[11px] text-outline mt-1 font-sans">
                    Account age risk scoring and join wave quarantine
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-outline border-t border-border-subtle">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="material-symbols-outlined text-[15px] text-primary">verified_user</span>
                Hierarchy enforcement verified across all actions
              </span>
              <Link
                href="/dashboard/automod"
                className="text-primary hover:text-primary-light font-medium flex items-center gap-1 transition-colors"
              >
                Configure Protection
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Recent Moderation Cases Section */}
          <div className="p-5 rounded-xl bg-surface-container border border-border-medium shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-on-surface">Recent Infractions</h3>
                <p className="text-xs text-outline font-sans">Latest disciplinary actions taken on this server</p>
              </div>
              <Link
                href="/dashboard/moderation"
                className="text-xs text-primary hover:text-primary-light font-medium flex items-center gap-1"
              >
                View Repository
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {recentCases.length === 0 ? (
              <div className="py-8 text-center text-xs text-outline font-mono">
                No activity yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle text-outline font-mono text-[10px] uppercase">
                      <th className="py-2 px-3">Case</th>
                      <th className="py-2 px-3">Target</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Reason</th>
                      <th className="py-2 px-3 text-right">Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle font-sans">
                    {recentCases.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-container-high transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                          #{c.caseNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-on-surface">
                            {c.targetUserTag || c.targetUserId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge
                            variant={
                              c.type === 'BAN'
                                ? 'rose'
                                : c.type === 'TIMEOUT'
                                ? 'amber'
                                : c.type === 'WARN'
                                ? 'indigo'
                                : 'neutral'
                            }
                          >
                            {c.type}
                          </StatusBadge>
                        </td>
                        <td className="py-2.5 px-3 text-on-surface-variant truncate max-w-[200px]">
                          {c.reason}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[10px] text-outline whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Live Audit Trail & Ticket Summary */}
        <div className="space-y-6">
          {/* Recent Audit Stream */}
          <div className="p-5 rounded-xl bg-surface-container border border-border-medium shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-on-surface">Live Audit Stream</h3>
                <p className="text-xs text-outline font-sans">Event bus telemetry</p>
              </div>
              <Link
                href="/dashboard/audit-logs"
                className="text-xs text-primary hover:text-primary-light font-medium flex items-center gap-1"
              >
                All Logs
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {recentAudits.length === 0 ? (
              <div className="py-6 text-center text-xs text-outline font-mono">
                No activity yet
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentAudits.map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-lg bg-surface-container-high border border-border-subtle flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-primary-light">
                        {a.action}
                      </span>
                      <span className="font-mono text-[10px] text-outline">
                        {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-outline">
                      <span>Actor:</span>
                      <span className="font-mono text-on-surface">{a.actorTag || a.actorUserId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Support Tickets */}
          <div className="p-5 rounded-xl bg-surface-container border border-border-medium shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-on-surface">Active Tickets</h3>
                <p className="text-xs text-outline font-sans">Customer support queues</p>
              </div>
              <Link
                href="/dashboard/tickets"
                className="text-xs text-primary hover:text-primary-light font-medium flex items-center gap-1"
              >
                Queue
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {recentTickets.length === 0 ? (
              <div className="py-6 text-center text-xs text-outline font-mono">
                No activity yet
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">#{t.ticketNumber}</span>
                      <span className="font-medium text-on-surface truncate max-w-[120px]">
                        {t.subject || t.category?.name || 'Support Ticket'}
                      </span>
                    </div>
                    <StatusBadge
                      variant={
                        t.status === 'OPEN'
                          ? 'emerald'
                          : t.status === 'CLAIMED'
                          ? 'amber'
                          : 'neutral'
                      }
                    >
                      {t.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
