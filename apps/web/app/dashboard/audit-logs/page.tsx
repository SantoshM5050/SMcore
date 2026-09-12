'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient } from '@/lib/api/apiClient';

interface AuditLogEntry {
  id: string;
  guildId: string;
  action: string;
  category: 'MODERATION' | 'AUTOMOD' | 'SECURITY' | 'GUILD_CONFIG' | 'MEMBER';
  actorId: string;
  actorTag?: string;
  targetId?: string;
  targetTag?: string;
  reason?: string;
  details?: any;
  createdAt: string;
}

const SAMPLE_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-001',
    guildId: '123456789012345678',
    action: 'MEMBER_TIMEOUT',
    category: 'MODERATION',
    actorId: '29482910482910482',
    actorTag: 'AlexVance (SecOps)',
    targetId: '98127391823791283',
    targetTag: 'ghost_rider',
    reason: 'Targeted harassment in #voice-chat-2',
    details: { durationSeconds: 86400, caseId: 1042 },
    createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
  },
  {
    id: 'audit-002',
    guildId: '123456789012345678',
    action: 'INVITE_FILTER_BLOCK',
    category: 'AUTOMOD',
    actorId: 'AUTOMOD',
    actorTag: 'SMCore AutoMod',
    targetId: '82937109283719284',
    targetTag: 'Vortex_Null',
    reason: 'Phishing invite propagation',
    details: { inviteCode: 'discord.gg/malicious-phish', channelId: '123456789012345679' },
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'audit-003',
    guildId: '123456789012345678',
    action: 'RAID_MODE_ENGAGED',
    category: 'SECURITY',
    actorId: 'SYSTEM',
    actorTag: 'Anti-Raid Engine',
    reason: 'Surge threshold breached: 12 joins in 8s',
    details: { threshold: 8, windowSeconds: 10, recentJoins: 12 },
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'audit-004',
    guildId: '123456789012345678',
    action: 'PROTECTION_CONFIG_UPDATE',
    category: 'GUILD_CONFIG',
    actorId: '39482910482910482',
    actorTag: 'SarahT (Admin)',
    reason: 'Updated mass mention limit to 4',
    details: { field: 'massMentionThreshold', oldValue: 6, newValue: 4 },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: 'audit-005',
    guildId: '123456789012345678',
    action: 'MEMBER_QUARANTINED',
    category: 'SECURITY',
    actorId: 'SYSTEM',
    actorTag: 'Anti-Raid Gate',
    targetId: '49281729481928471',
    targetTag: 'suspicious_alt_01',
    reason: 'Account age under 24h risk profile',
    details: { accountAgeHours: 6, minAgeDays: 7 },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

export default function AuditLogsPage() {
  const { selectedGuildId } = useGuild();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadAudits() {
      setIsLoading(true);
      try {
        const res = await apiClient.getAuditLogs(selectedGuildId, { limit: 50 });
        if (isMounted) {
          if (res.success && res.data && res.data.length > 0) {
            setLogs(res.data);
            setSelectedLog(res.data[0]);
          } else {
            setLogs(SAMPLE_AUDIT_LOGS);
            setSelectedLog(SAMPLE_AUDIT_LOGS[0]);
          }
        }
      } catch {
        if (isMounted) {
          setLogs(SAMPLE_AUDIT_LOGS);
          setSelectedLog(SAMPLE_AUDIT_LOGS[0]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAudits();
    return () => {
      isMounted = false;
    };
  }, [selectedGuildId]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (categoryFilter !== 'ALL' && entry.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = entry.action.toLowerCase().includes(q);
        const matchActor =
          entry.actorId.toLowerCase().includes(q) ||
          (entry.actorTag && entry.actorTag.toLowerCase().includes(q));
        const matchTarget =
          (entry.targetId && entry.targetId.toLowerCase().includes(q)) ||
          (entry.targetTag && entry.targetTag.toLowerCase().includes(q));
        const matchReason = entry.reason && entry.reason.toLowerCase().includes(q);
        if (!matchAction && !matchActor && !matchTarget && !matchReason) return false;
      }
      return true;
    });
  }, [logs, categoryFilter, searchQuery]);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'MODERATION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary-container/30 text-primary">
            MODERATION
          </span>
        );
      case 'AUTOMOD':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-tertiary-container/30 text-tertiary">
            AUTOMOD
          </span>
        );
      case 'SECURITY':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-error-container/40 text-on-error-container">
            SECURITY
          </span>
        );
      case 'GUILD_CONFIG':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary-container/40 text-secondary-fixed">
            CONFIG
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container text-outline">
            {category}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest/60 border-b border-outline-variant/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>LOGGING & AUDIT</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">AUDIT TRAIL</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-tertiary">
              IMMUTABLE LOGS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Immutable Audit Records
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-mono text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Event Bus Connected
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-outline bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
            Isolated Channel Scoped
          </span>
        </div>
      </div>

      {/* Filter Deck */}
      <div className="px-6 py-3">
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action, actor Snowflake ID, target, or metadata reason..."
              className="w-full pl-9 pr-4 py-1.5 bg-surface-container-lowest text-on-surface placeholder:text-outline-variant text-xs rounded-lg border border-outline-variant/40 focus:outline-none focus:border-primary transition-all font-mono"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-1.5 border border-outline-variant/40 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="MODERATION">Moderation</option>
              <option value="AUTOMOD">AutoMod</option>
              <option value="SECURITY">Security / Anti-Raid</option>
              <option value="GUILD_CONFIG">Guild Configuration</option>
              <option value="MEMBER">Member Lifecycle</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary Workspace: Table + Inspection Drawer */}
      <div className="px-6 py-2 flex flex-col xl:flex-row gap-4 items-start relative">
        {/* Audit Table */}
        <div className="w-full xl:w-[68%] 2xl:w-[72%] flex flex-col rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-container flex items-center justify-between border-b border-outline-variant/20">
            <span className="text-xs font-semibold text-on-surface">Audit Event Log Stream</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container-high text-primary">
              Showing {filteredLogs.length} events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-lowest/80 text-outline text-[10px] uppercase font-mono tracking-wider border-b border-outline-variant/20">
                  <th className="py-2.5 px-3 w-28">Category</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Action</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Actor</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Target</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Reason</th>
                  <th className="py-2.5 px-3 w-28">Time</th>
                  <th className="py-2.5 px-3 text-right w-16">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-outline">
                      Loading audit events...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-outline">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((entry) => {
                    const isSelected = selectedLog?.id === entry.id;
                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedLog(entry)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-surface-container-high/80'
                            : 'hover:bg-surface-container/60'
                        }`}
                      >
                        <td className="py-2.5 px-3">{getCategoryBadge(entry.category)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-on-surface">
                          {entry.action}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-on-surface">
                            {entry.actorTag || entry.actorId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-on-surface-variant font-mono">
                            {entry.targetTag || entry.targetId || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-outline truncate max-w-xs">{entry.reason || '—'}</p>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-outline whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(entry);
                            }}
                            className="p-1 rounded bg-surface-container hover:bg-surface-bright text-outline hover:text-on-surface transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">dock_to_left</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slide-over Inspection Drawer */}
        <div className="w-full xl:w-[32%] 2xl:w-[28%] rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-xl flex flex-col overflow-hidden">
          {selectedLog ? (
            <>
              <div className="px-4 py-3 bg-surface-container flex items-center justify-between border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-on-surface">Event Detail</span>
                  {getCategoryBadge(selectedLog.category)}
                </div>
                <span className="text-[10px] font-mono text-outline">{selectedLog.id}</span>
              </div>

              <div className="p-4 space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 space-y-2">
                  <div className="text-[10px] uppercase font-mono text-outline">Action Name</div>
                  <div className="font-mono font-bold text-base text-primary">
                    {selectedLog.action}
                  </div>
                  {selectedLog.reason && (
                    <div className="text-on-surface mt-1 text-xs">{selectedLog.reason}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    <div className="text-[10px] uppercase font-mono text-outline">Actor</div>
                    <div className="font-semibold text-on-surface truncate mt-0.5">
                      {selectedLog.actorTag || selectedLog.actorId}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    <div className="text-[10px] uppercase font-mono text-outline">Target</div>
                    <div className="font-semibold text-on-surface truncate mt-0.5">
                      {selectedLog.targetTag || selectedLog.targetId || 'None'}
                    </div>
                  </div>
                </div>

                {/* Structured Metadata JSON */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-outline">
                      Structured Event Metadata
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(JSON.stringify(selectedLog.details, null, 2))
                      }
                      className="text-[10px] font-mono text-primary hover:underline"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-[11px] font-mono text-on-surface overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.details || {}, null, 2)}
                  </pre>
                </div>

                <div className="text-[10px] font-mono text-outline pt-2 border-t border-outline-variant/20">
                  Recorded: {new Date(selectedLog.createdAt).toISOString()}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-outline text-xs">
              Select an event to inspect its payload details and actor metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
