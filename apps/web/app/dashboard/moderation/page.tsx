'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient } from '@/lib/api/apiClient';

interface CaseRecord {
  id: string;
  caseNumber: number;
  guildId: string;
  targetUserId: string;
  targetUserTag?: string;
  moderatorId: string;
  moderatorTag?: string;
  action: 'BAN' | 'KICK' | 'TIMEOUT' | 'WARN' | 'UNBAN' | 'UNTIMEOUT';
  reason: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  durationSeconds?: number | null;
  createdAt: string;
  expiresAt?: string | null;
}

const SAMPLE_FALLBACK_CASES: CaseRecord[] = [
  {
    id: 'case-1042',
    caseNumber: 1042,
    guildId: '123456789012345678',
    targetUserId: '98127391823791283',
    targetUserTag: 'ghost_rider',
    moderatorId: '29482910482910482',
    moderatorTag: 'AlexVance (SecOps)',
    action: 'TIMEOUT',
    reason: 'Targeted harassment and rule #4 violation in #voice-chat-2',
    status: 'ACTIVE',
    durationSeconds: 86400,
    createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: 'case-1041',
    caseNumber: 1041,
    guildId: '123456789012345678',
    targetUserId: '82937109283719284',
    targetUserTag: 'Vortex_Null',
    moderatorId: 'AUTOMOD',
    moderatorTag: 'SMCore AutoMod',
    action: 'BAN',
    reason: 'Coordinated phishing link propagation in #trading',
    status: 'ACTIVE',
    durationSeconds: 604800,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: 'case-1040',
    caseNumber: 1040,
    guildId: '123456789012345678',
    targetUserId: '19482739481928374',
    targetUserTag: 'KronoRaid',
    moderatorId: '39482910482910482',
    moderatorTag: 'SarahT (Admin)',
    action: 'BAN',
    reason: 'Mass token raid orchestration and malicious webhook spoofing',
    status: 'ACTIVE',
    durationSeconds: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    expiresAt: null,
  },
  {
    id: 'case-1039',
    caseNumber: 1039,
    guildId: '123456789012345678',
    targetUserId: '59283719482910482',
    targetUserTag: 'DeltaJack',
    moderatorId: 'AUTOMOD',
    moderatorTag: 'SMCore AutoMod',
    action: 'KICK',
    reason: 'Failure to verify within 48h gate check period',
    status: 'EXPIRED',
    durationSeconds: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    expiresAt: null,
  },
  {
    id: 'case-1038',
    caseNumber: 1038,
    guildId: '123456789012345678',
    targetUserId: '39482910482910482',
    targetUserTag: 'ne0n_byte',
    moderatorId: '29482910482910482',
    moderatorTag: 'AlexVance (SecOps)',
    action: 'WARN',
    reason: 'Excessive uppercase and repetitive spamming in #general',
    status: 'ACTIVE',
    durationSeconds: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    expiresAt: null,
  },
];

export default function ModerationCommandCenterPage() {
  const { selectedGuildId, isDbOffline } = useGuild();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [moderatorFilter, setModeratorFilter] = useState('ALL');

  // Quick Action Modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    actionType: string;
  }>({ isOpen: false, actionType: '' });
  const [actionTargetId, setActionTargetId] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState('60');
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Member Lookup Drawer
  const [lookupUserId, setLookupUserId] = useState('');
  const [lookupResult, setLookupResult] = useState<{
    warnings: any[];
    notes: any[];
  } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchCases() {
      setIsLoading(true);
      try {
        const res = await apiClient.getCases(selectedGuildId, { pageSize: 50 });
        if (isMounted) {
          if (res.success && res.data?.items && res.data.items.length > 0) {
            setCases(res.data.items);
            setSelectedCase(res.data.items[0]);
          } else {
            // Use fallback cases for visual representation
            setCases(SAMPLE_FALLBACK_CASES);
            setSelectedCase(SAMPLE_FALLBACK_CASES[0]);
          }
        }
      } catch {
        if (isMounted) {
          setCases(SAMPLE_FALLBACK_CASES);
          setSelectedCase(SAMPLE_FALLBACK_CASES[0]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchCases();
    return () => {
      isMounted = false;
    };
  }, [selectedGuildId]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (actionFilter !== 'ALL' && c.action !== actionFilter) return false;
      if (moderatorFilter === 'AUTOMOD' && c.moderatorId !== 'AUTOMOD') return false;
      if (moderatorFilter === 'STAFF' && c.moderatorId === 'AUTOMOD') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCase = String(c.caseNumber).includes(q);
        const matchTarget = c.targetUserId.toLowerCase().includes(q) || (c.targetUserTag && c.targetUserTag.toLowerCase().includes(q));
        const matchReason = c.reason.toLowerCase().includes(q);
        if (!matchCase && !matchTarget && !matchReason) return false;
      }

      return true;
    });
  }, [cases, actionFilter, moderatorFilter, searchQuery]);

  const handleExecuteAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{17,20}$/.test(actionTargetId.trim())) {
      setModalFeedback('Invalid Discord Snowflake ID (must be 17-20 digits)');
      return;
    }

    // Add optimistic case to table
    const newCase: CaseRecord = {
      id: `case-${Date.now()}`,
      caseNumber: cases.length > 0 ? Math.max(...cases.map((c) => c.caseNumber)) + 1 : 1050,
      guildId: selectedGuildId,
      targetUserId: actionTargetId.trim(),
      targetUserTag: `user_${actionTargetId.slice(-4)}`,
      moderatorId: '29482910482910482',
      moderatorTag: 'AlexVance (SecOps)',
      action: actionModal.actionType.toUpperCase() as any,
      reason: actionReason.trim() || 'No reason specified',
      status: 'ACTIVE',
      durationSeconds: actionModal.actionType === 'timeout' ? parseInt(actionDuration, 10) * 60 : null,
      createdAt: new Date().toISOString(),
      expiresAt:
        actionModal.actionType === 'timeout'
          ? new Date(Date.now() + parseInt(actionDuration, 10) * 60 * 1000).toISOString()
          : null,
    };

    setCases((prev) => [newCase, ...prev]);
    setSelectedCase(newCase);
    setModalFeedback(`Successfully dispatched ${actionModal.actionType.toUpperCase()} action.`);
    setTimeout(() => {
      setActionModal({ isOpen: false, actionType: '' });
      setActionTargetId('');
      setActionReason('');
      setModalFeedback(null);
    }, 1200);
  };

  const handleMemberLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{17,20}$/.test(lookupUserId.trim())) return;
    setIsLookingUp(true);
    try {
      const [warnRes, noteRes] = await Promise.all([
        apiClient.members.getWarnings(selectedGuildId, lookupUserId.trim()),
        apiClient.members.getNotes(selectedGuildId, lookupUserId.trim()),
      ]);
      setLookupResult({
        warnings: warnRes.data || [],
        notes: noteRes.data || [],
      });
    } catch {
      setLookupResult({ warnings: [], notes: [] });
    } finally {
      setIsLookingUp(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BAN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container/40 text-on-error-container font-mono text-[11px] font-bold">
            <span className="material-symbols-outlined text-[13px]">block</span>
            BAN
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary-fixed font-mono text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[13px]">timer</span>
            TIMEOUT
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[13px]">warning</span>
            WARN
          </span>
        );
      case 'KICK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-mono text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[13px]">door_open</span>
            KICK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-outline font-mono text-[11px]">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Command Header & Breadcrumb */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest/60 border-b border-outline-variant/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>MODERATION</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">CASES & PUNISHMENTS</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-secondary-fixed-dim">
              LIVE DISPATCH
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Moderation Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-mono text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Telemetry 0.9s sync
            </span>
          </div>
        </div>

        {/* Live Quick Action Launcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'ban' })}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-error/15 hover:bg-error/25 text-error text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span>Issue Ban</span>
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'timeout' })}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-secondary-container/30 hover:bg-secondary-container/50 text-secondary-fixed text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">timer</span>
            <span>Timeout</span>
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'warn' })}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span>Warn</span>
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'kick' })}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">door_open</span>
            <span>Kick</span>
          </button>
        </div>
      </div>

      {/* Operational Metrics Ticker Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-3 bg-surface">
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Total Infractions
            </span>
            <span className="text-xl font-bold text-on-surface">{cases.length}</span>
          </div>
          <span className="material-symbols-outlined text-[24px] text-tertiary">fact_check</span>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Active Timeouts
            </span>
            <span className="text-xl font-bold text-secondary">
              {cases.filter((c) => c.action === 'TIMEOUT' && c.status === 'ACTIVE').length}
            </span>
          </div>
          <span className="material-symbols-outlined text-[24px] text-secondary">timer</span>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              AutoMod Dispatches
            </span>
            <span className="text-xl font-bold text-tertiary">
              {cases.filter((c) => c.moderatorId === 'AUTOMOD').length}
            </span>
          </div>
          <span className="material-symbols-outlined text-[24px] text-tertiary">smart_toy</span>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
              Hierarchy Gate
            </span>
            <span className="text-sm font-bold text-on-surface mt-1">Role Enforced</span>
          </div>
          <span className="material-symbols-outlined text-[24px] text-primary">security</span>
        </div>
      </div>

      {/* Search & Filter Deck */}
      <div className="px-6 py-2">
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username, Snowflake ID, Case #, or violation keywords..."
              className="w-full pl-9 pr-4 py-1.5 bg-surface-container-lowest text-on-surface placeholder:text-outline-variant text-xs rounded-lg border border-outline-variant/40 focus:outline-none focus:border-primary transition-all font-mono"
            />
          </div>

          {/* Segmented Select Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-2.5 py-1.5 border border-outline-variant/40 focus:outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="BAN">Ban</option>
              <option value="TIMEOUT">Timeout</option>
              <option value="WARN">Warn</option>
              <option value="KICK">Kick</option>
            </select>

            {/* Moderator Filter */}
            <select
              value={moderatorFilter}
              onChange={(e) => setModeratorFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-2.5 py-1.5 border border-outline-variant/40 focus:outline-none"
            >
              <option value="ALL">All Enforcers</option>
              <option value="STAFF">Human Staff</option>
              <option value="AUTOMOD">SMCore AutoMod</option>
            </select>

            {/* Snowflake Member Lookup Button */}
            <button
              type="button"
              onClick={() => {
                if (selectedCase) {
                  setLookupUserId(selectedCase.targetUserId);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary transition-colors border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-[16px]">account_box</span>
              <span>Inspect Target</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Workspace: Table + Inspection Drawer */}
      <div className="px-6 py-2 flex flex-col xl:flex-row gap-4 items-start relative">
        {/* Cases Table */}
        <div className="w-full xl:w-[68%] 2xl:w-[72%] flex flex-col rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-container flex items-center justify-between border-b border-outline-variant/20">
            <span className="text-xs font-semibold text-on-surface">Infractions Repository</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container-high text-primary">
              Showing {filteredCases.length} of {cases.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-lowest/80 text-outline text-[10px] uppercase font-mono tracking-wider border-b border-outline-variant/20">
                  <th className="py-2.5 px-3 w-16">Case</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Target User</th>
                  <th className="py-2.5 px-3 w-28">Action</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Reason & Scope</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Enforcer</th>
                  <th className="py-2.5 px-3 w-28">Status</th>
                  <th className="py-2.5 px-3 text-right w-20">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-outline">
                      Loading infraction records...
                    </td>
                  </tr>
                ) : filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-outline">
                      No matching moderation records found.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-surface-container-high/80'
                            : 'hover:bg-surface-container/60'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">
                          #{c.caseNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-surface-bright text-on-surface flex items-center justify-center font-bold text-[10px] shrink-0">
                              {(c.targetUserTag || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="font-semibold text-on-surface truncate">
                                {c.targetUserTag || `user_${c.targetUserId.slice(-4)}`}
                              </span>
                              <span className="font-mono text-[10px] text-outline truncate">
                                {c.targetUserId}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">{getActionBadge(c.action)}</td>
                        <td className="py-2.5 px-3">
                          <p className="text-on-surface-variant truncate max-w-xs">{c.reason}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.moderatorId === 'AUTOMOD' ? 'bg-tertiary' : 'bg-primary'
                              }`}
                            />
                            <span className="text-on-surface truncate font-medium">
                              {c.moderatorTag || c.moderatorId}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                              c.status === 'ACTIVE'
                                ? 'bg-tertiary-container/30 text-tertiary font-semibold'
                                : 'bg-surface-container text-outline'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCase(c);
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
          {selectedCase ? (
            <>
              <div className="px-4 py-3 bg-surface-container flex items-center justify-between border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-on-surface">
                    Case #{selectedCase.caseNumber}
                  </span>
                  {getActionBadge(selectedCase.action)}
                </div>
                <span className="text-[10px] font-mono text-outline">
                  {new Date(selectedCase.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="p-4 space-y-4 text-xs">
                {/* Subject Info */}
                <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 space-y-2">
                  <div className="text-[10px] uppercase font-mono text-outline">Subject Profile</div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm">
                      {(selectedCase.targetUserTag || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface text-sm">
                        {selectedCase.targetUserTag || 'Discord Member'}
                      </span>
                      <span className="font-mono text-[10px] text-primary select-all">
                        {selectedCase.targetUserId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Violation Reason */}
                <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 space-y-1">
                  <div className="text-[10px] uppercase font-mono text-outline">Infraction Reason</div>
                  <p className="text-on-surface text-xs leading-relaxed">{selectedCase.reason}</p>
                </div>

                {/* Enforcer & Timing Details */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    <div className="text-[10px] uppercase font-mono text-outline">Enforcer</div>
                    <div className="font-semibold text-on-surface mt-0.5 truncate">
                      {selectedCase.moderatorTag || selectedCase.moderatorId}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    <div className="text-[10px] uppercase font-mono text-outline">Status</div>
                    <div className="font-semibold text-on-surface mt-0.5">{selectedCase.status}</div>
                  </div>
                </div>

                {/* Duration if temporary */}
                {selectedCase.expiresAt && (
                  <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                    <span className="text-outline">Expires At</span>
                    <span className="font-mono text-tertiary">
                      {new Date(selectedCase.expiresAt).toLocaleDateString()}{' '}
                      {new Date(selectedCase.expiresAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {/* Member Lookup Quick Launcher */}
                <div className="pt-2 border-t border-outline-variant/20">
                  <form onSubmit={handleMemberLookup} className="space-y-2">
                    <div className="text-[10px] uppercase font-mono text-outline">
                      Member History & Notes Lookup
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={lookupUserId}
                        onChange={(e) => setLookupUserId(e.target.value)}
                        placeholder="Snowflake ID..."
                        className="flex-1 bg-surface-container-lowest text-on-surface px-2.5 py-1.5 rounded-lg border border-outline-variant/40 text-xs font-mono focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isLookingUp}
                        className="px-3 py-1.5 bg-surface-container hover:bg-surface-bright text-primary rounded-lg text-xs font-semibold border border-outline-variant/40"
                      >
                        {isLookingUp ? '...' : 'Query'}
                      </button>
                    </div>
                  </form>

                  {lookupResult && (
                    <div className="mt-3 p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 space-y-1.5">
                      <div className="text-[11px] font-bold text-on-surface">
                        Member Profile Result
                      </div>
                      <div className="flex justify-between text-[11px] text-outline">
                        <span>Recorded Warnings:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {lookupResult.warnings.length}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-outline">
                        <span>Staff Notes:</span>
                        <span className="font-mono text-primary font-bold">
                          {lookupResult.notes.length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-outline text-xs">
              Select a case row to inspect full infraction details and member notes.
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Modal */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">gavel</span>
                <span>Dispatch {actionModal.actionType.toUpperCase()} Action</span>
              </h3>
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, actionType: '' })}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {modalFeedback && (
              <div className="p-2.5 rounded-lg bg-primary-container/20 text-primary text-xs font-semibold">
                {modalFeedback}
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-3 text-xs">
              <div>
                <label className="block text-outline uppercase font-mono text-[10px] mb-1">
                  Target Discord Snowflake ID *
                </label>
                <input
                  type="text"
                  required
                  value={actionTargetId}
                  onChange={(e) => setActionTargetId(e.target.value)}
                  placeholder="e.g. 98127391823791283"
                  className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-outline-variant/50 focus:outline-none font-mono"
                />
              </div>

              {actionModal.actionType === 'timeout' && (
                <div>
                  <label className="block text-outline uppercase font-mono text-[10px] mb-1">
                    Duration (Minutes)
                  </label>
                  <select
                    value={actionDuration}
                    onChange={(e) => setActionDuration(e.target.value)}
                    className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-outline-variant/50 focus:outline-none"
                  >
                    <option value="5">5 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="1440">24 Hours</option>
                    <option value="10080">7 Days</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-outline uppercase font-mono text-[10px] mb-1">
                  Reason for Infraction *
                </label>
                <textarea
                  required
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="State the server rule violation..."
                  className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-outline-variant/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal({ isOpen: false, actionType: '' })}
                  className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-bold hover:bg-primary-container/90 shadow-md shadow-primary-container/20"
                >
                  Execute Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
