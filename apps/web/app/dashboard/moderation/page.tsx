'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient } from '@/lib/api/apiClient';
import { StatusBadge } from '@/components/ui/statusBadge';
import { Drawer } from '@/components/ui/drawer';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/emptyState';
import { LoadingState } from '@/components/ui/loadingState';

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

export default function ModerationCommandCenterPage() {
  const { selectedGuildId, isDbOffline } = useGuild();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [moderatorFilter, setModeratorFilter] = useState('ALL');

  // Quick Action Modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    actionType: 'BAN' | 'TIMEOUT' | 'WARN' | 'KICK' | 'PURGE' | 'LOCK' | '';
  }>({ isOpen: false, actionType: '' });
  const [actionTargetId, setActionTargetId] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState('60');
  const [purgeChannelId, setPurgeChannelId] = useState('');
  const [purgeCount, setPurgeCount] = useState('10');
  const [lockChannelId, setLockChannelId] = useState('');
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Target User Prior Record / Member Lookup
  const [memberLookup, setMemberLookup] = useState<{
    warnings: Array<{ id: string; reason: string; status: string; createdAt: string }>;
    notes: Array<{ id: string; note: string; createdAt: string }>;
    loading: boolean;
  } | null>(null);

  const fetchCases = useCallback(async () => {
    if (!selectedGuildId) {
      setCases([]);
      setSelectedCase(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiClient.getCases(selectedGuildId, { pageSize: 100 });
      if (res.success && res.data?.items) {
        const mapped: CaseRecord[] = res.data.items.map((item) => ({
          id: item.id,
          caseNumber: item.caseNumber,
          guildId: item.guildId,
          targetUserId: item.targetUserId,
          targetUserTag: item.targetUserTag,
          moderatorId: item.moderatorUserId,
          moderatorTag: item.moderatorTag,
          action: item.type as CaseRecord['action'],
          reason: item.reason,
          status: item.status,
          durationSeconds: item.duration,
          createdAt: item.createdAt,
          expiresAt: item.expiresAt,
        }));
        setCases(mapped);
        setSelectedCase((prev) => {
          if (!prev) return mapped[0] || null;
          return mapped.find((c) => c.id === prev.id) || mapped[0] || null;
        });
      } else {
        setCases([]);
        setSelectedCase(null);
      }
    } catch {
      setCases([]);
      setSelectedCase(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuildId]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Load prior warnings & notes whenever selectedCase changes
  useEffect(() => {
    if (!selectedCase || !selectedGuildId) {
      setMemberLookup(null);
      return;
    }
    let isMounted = true;
    async function loadSubjectDetails() {
      setMemberLookup({ warnings: [], notes: [], loading: true });
      try {
        const [warnRes, noteRes] = await Promise.all([
          apiClient.members.getWarnings(selectedGuildId, selectedCase!.targetUserId).catch(() => ({ success: false, data: [] })),
          apiClient.members.getNotes(selectedGuildId, selectedCase!.targetUserId).catch(() => ({ success: false, data: [] })),
        ]);
        if (isMounted) {
          setMemberLookup({
            warnings: (warnRes.data as Array<{ id: string; reason: string; status: string; createdAt: string }>) || [],
            notes: (noteRes.data as Array<{ id: string; note: string; createdAt: string }>) || [],
            loading: false,
          });
        }
      } catch {
        if (isMounted) {
          setMemberLookup({ warnings: [], notes: [], loading: false });
        }
      }
    }
    loadSubjectDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedCase, selectedGuildId]);

  // Keyboard Shortcuts for Quick Actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is actively typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setActionModal({ isOpen: true, actionType: 'BAN' });
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setActionModal({ isOpen: true, actionType: 'TIMEOUT' });
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setActionModal({ isOpen: true, actionType: 'WARN' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (actionFilter !== 'ALL' && c.action !== actionFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (moderatorFilter === 'AUTOMOD' && c.moderatorId !== 'AUTOMOD') return false;
      if (moderatorFilter === 'STAFF' && c.moderatorId === 'AUTOMOD') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCase = String(c.caseNumber).includes(q);
        const matchTarget =
          c.targetUserId.toLowerCase().includes(q) ||
          (c.targetUserTag && c.targetUserTag.toLowerCase().includes(q));
        const matchMod =
          c.moderatorId.toLowerCase().includes(q) ||
          (c.moderatorTag && c.moderatorTag.toLowerCase().includes(q));
        const matchReason = c.reason.toLowerCase().includes(q);
        if (!matchCase && !matchTarget && !matchMod && !matchReason) return false;
      }
      return true;
    });
  }, [cases, actionFilter, statusFilter, moderatorFilter, searchQuery]);

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId || !actionModal.actionType) return;

    setIsSubmittingAction(true);
    setModalFeedback(null);

    try {
      let res;
      if (actionModal.actionType === 'PURGE') {
        res = await apiClient.moderation.executeAction(selectedGuildId, {
          action: 'PURGE',
          channelId: purgeChannelId.trim(),
          messageCount: parseInt(purgeCount, 10) || 10,
          reason: actionReason.trim() || 'Chat purge command via dashboard',
        });
      } else if (actionModal.actionType === 'LOCK') {
        res = await apiClient.moderation.executeAction(selectedGuildId, {
          action: 'LOCK',
          channelId: lockChannelId.trim(),
          reason: actionReason.trim() || 'Channel emergency lockdown',
        });
      } else {
        res = await apiClient.moderation.executeAction(selectedGuildId, {
          action: actionModal.actionType,
          targetUserId: actionTargetId.trim(),
          reason: actionReason.trim() || 'Disciplinary action via dashboard',
          durationSeconds:
            actionModal.actionType === 'TIMEOUT' ? parseInt(actionDuration, 10) * 60 : undefined,
        });
      }

      if (res.success) {
        setModalFeedback({
          type: 'success',
          message: res.data?.message || `Successfully dispatched ${actionModal.actionType} action.`,
        });
        setTimeout(() => {
          setActionModal({ isOpen: false, actionType: '' });
          setActionTargetId('');
          setActionReason('');
          setModalFeedback(null);
          fetchCases();
        }, 1200);
      } else {
        setModalFeedback({
          type: 'error',
          message: res.error?.message || 'Operation failed. Please verify bot permissions in Discord.',
        });
      }
    } catch (err) {
      setModalFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network execution failed.',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const getActionBadge = (action: CaseRecord['action']) => {
    switch (action) {
      case 'BAN':
        return <StatusBadge variant="rose" icon="gavel">BAN</StatusBadge>;
      case 'TIMEOUT':
        return <StatusBadge variant="amber" icon="timer">TIMEOUT</StatusBadge>;
      case 'WARN':
        return <StatusBadge variant="indigo" icon="warning">WARN</StatusBadge>;
      case 'KICK':
        return <StatusBadge variant="neutral" icon="door_open">KICK</StatusBadge>;
      case 'UNBAN':
        return <StatusBadge variant="emerald" icon="lock_open">UNBAN</StatusBadge>;
      case 'UNTIMEOUT':
        return <StatusBadge variant="emerald" icon="schedule">UNTIMEOUT</StatusBadge>;
      default:
        return <StatusBadge variant="neutral">{action}</StatusBadge>;
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen pb-16">
      {/* Command Header & Live Quick Action Launcher */}
      <div className="px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>MODERATION</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary-light font-medium">CASES & PUNISHMENTS</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-secondary-fixed">
              LIVE DISPATCH
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              Moderation Command Center
            </h1>
            <StatusBadge variant="emerald" pulse>
              Telemetry Sync Live
            </StatusBadge>
          </div>
        </div>

        {/* Live Quick Action Launcher matching Stitch */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-container-lowest p-1.5 rounded-xl border border-border-subtle">
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'BAN' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/15 hover:bg-error/25 text-error text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span>Issue Ban</span>
            <kbd className="font-mono text-[10px] px-1 rounded bg-error/30 text-on-surface">B</kbd>
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'TIMEOUT' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/15 hover:bg-warning/25 text-warning text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">timer</span>
            <span>Timeout</span>
            <kbd className="font-mono text-[10px] px-1 rounded bg-surface-container text-outline">T</kbd>
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'WARN' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary-light text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span>Warn</span>
            <kbd className="font-mono text-[10px] px-1 rounded bg-surface-container text-outline">W</kbd>
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'KICK' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">door_open</span>
            <span>Kick</span>
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'PURGE' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">mop</span>
            <span>Purge</span>
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ isOpen: true, actionType: 'LOCK' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error-container/40 hover:bg-error-container/70 text-on-error-container text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Lockdown</span>
          </button>
        </div>
      </div>

      {/* Operational Metrics Ticker Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 px-4 sm:px-6 py-3.5 bg-surface">
        <div className="p-3.5 rounded-xl bg-surface-container border border-border-medium flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-wider text-outline">Total Cases</span>
            <span className="font-display text-xl font-bold text-on-surface">{cases.length}</span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary-light font-semibold">
            Repository
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container border border-border-medium flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-wider text-outline">Active Timeouts</span>
            <span className="font-display text-xl font-bold text-secondary">
              {cases.filter((c) => c.action === 'TIMEOUT' && c.status === 'ACTIVE').length}
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-semibold">
            In Cooldown
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container border border-border-medium flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-wider text-outline">Automod Actions</span>
            <span className="font-display text-xl font-bold text-tertiary">
              {cases.filter((c) => c.moderatorId === 'AUTOMOD').length}
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-semibold">
            AI Automated
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container border border-border-medium flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-wider text-outline">Staff Actions</span>
            <span className="font-display text-xl font-bold text-on-surface">
              {cases.filter((c) => c.moderatorId !== 'AUTOMOD').length}
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-outline font-semibold">
            Manual Enforced
          </span>
        </div>
      </div>

      {/* Search and Filter Command Deck */}
      <div className="px-4 sm:px-6 py-2">
        <div className="p-2.5 rounded-xl bg-surface-container border border-border-medium flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username, Snowflake ID (e.g. 8492019...), Case #, or violation reason..."
              className="w-full pl-9 pr-14 py-2 bg-surface-container-lowest text-on-surface placeholder:text-outline-variant font-sans text-xs rounded-lg border border-border-subtle focus:outline-none focus:border-primary transition-colors"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-outline">
                ⌘F
              </kbd>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Action Type Filter */}
            <div className="flex items-center bg-surface-container-lowest border border-border-subtle rounded-lg px-2 py-1">
              <span className="material-symbols-outlined text-[16px] text-outline mr-1.5">category</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-transparent text-on-surface font-sans text-xs py-1 pr-4 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-surface-container">All Actions</option>
                <option value="BAN" className="bg-surface-container">Ban</option>
                <option value="TIMEOUT" className="bg-surface-container">Timeout</option>
                <option value="WARN" className="bg-surface-container">Warning</option>
                <option value="KICK" className="bg-surface-container">Kick</option>
                <option value="UNBAN" className="bg-surface-container">Unban</option>
              </select>
            </div>

            {/* Moderator Filter */}
            <div className="flex items-center bg-surface-container-lowest border border-border-subtle rounded-lg px-2 py-1">
              <span className="material-symbols-outlined text-[16px] text-outline mr-1.5">badge</span>
              <select
                value={moderatorFilter}
                onChange={(e) => setModeratorFilter(e.target.value)}
                className="bg-transparent text-on-surface font-sans text-xs py-1 pr-4 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-surface-container">All Enforcers</option>
                <option value="STAFF" className="bg-surface-container">Manual Staff</option>
                <option value="AUTOMOD" className="bg-surface-container">SMCore AutoMod</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-surface-container-lowest border border-border-subtle rounded-lg px-2 py-1">
              <span className="material-symbols-outlined text-[16px] text-outline mr-1.5">filter_list</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-on-surface font-sans text-xs py-1 pr-4 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-surface-container">All Statuses</option>
                <option value="ACTIVE" className="bg-surface-container">Status: Active</option>
                <option value="EXPIRED" className="bg-surface-container">Status: Expired</option>
                <option value="REVOKED" className="bg-surface-container">Status: Revoked</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {(searchQuery || actionFilter !== 'ALL' || statusFilter !== 'ALL' || moderatorFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActionFilter('ALL');
                  setStatusFilter('ALL');
                  setModeratorFilter('ALL');
                }}
                className="p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container border border-border-subtle text-outline hover:text-on-surface transition-colors"
                title="Reset Filters"
              >
                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Workspace: Cases Table + Interactive Slide-over Drawer */}
      <div className="px-4 sm:px-6 py-2 flex-1 flex gap-6 items-start relative">
        {/* Cases Table Container */}
        <div
          className={`transition-all duration-300 flex flex-col rounded-xl bg-surface-container border border-border-medium shadow-sm overflow-hidden ${
            selectedCase ? 'w-full xl:w-[68%] 2xl:w-[72%]' : 'w-full'
          }`}
        >
          {/* Table Header Status Bar */}
          <div className="px-4 py-3 bg-surface-container-low border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-display text-xs font-bold text-on-surface">
                Active Infractions Repository
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-primary-light">
                Showing {filteredCases.length} of {cases.length} cases
              </span>
            </div>
            <button
              type="button"
              onClick={fetchCases}
              className="text-xs text-outline hover:text-on-surface flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Sync</span>
            </button>
          </div>

          {/* Cases Data Table */}
          {isLoading ? (
            <LoadingState message="Fetching infraction repository from database..." />
          ) : filteredCases.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No Infraction Records Found"
              description={
                cases.length === 0
                  ? 'No moderation cases have been logged for this Discord server yet.'
                  : 'No cases match your active search query and filter criteria.'
              }
              actionLabel={cases.length > 0 ? 'Clear Filters' : undefined}
              onAction={() => {
                setSearchQuery('');
                setActionFilter('ALL');
                setStatusFilter('ALL');
                setModeratorFilter('ALL');
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest/60 border-b border-border-subtle text-outline font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-20">Case</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Target User</th>
                    <th className="py-2.5 px-3 w-32">Action</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Reason</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Enforcer</th>
                    <th className="py-2.5 px-3 w-28 text-right">Logged</th>
                    <th className="py-2.5 px-3 text-right w-20">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-sans text-xs">
                  {filteredCases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className={`cursor-pointer transition-colors group ${
                          isSelected
                            ? 'bg-surface-container-high border-l-2 border-l-primary'
                            : 'hover:bg-surface-container-high/60'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-primary-light">
                            #{c.caseNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">
                              {(c.targetUserTag || c.targetUserId).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-on-surface truncate">
                                {c.targetUserTag || 'Discord Member'}
                              </span>
                              <span className="font-mono text-[10px] text-outline truncate select-all">
                                {c.targetUserId}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {getActionBadge(c.action)}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-on-surface-variant truncate max-w-xs" title={c.reason}>
                            {c.reason}
                          </p>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.moderatorId === 'AUTOMOD' ? 'bg-tertiary' : 'bg-primary'
                              }`}
                            />
                            <span className="text-on-surface font-medium truncate">
                              {c.moderatorTag || (c.moderatorId === 'AUTOMOD' ? 'AutoMod' : `@${c.moderatorId}`)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[10px] text-outline whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCase(c);
                            }}
                            className="w-7 h-7 rounded bg-surface-container-lowest hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center transition-colors ml-auto"
                            title="Inspect Details"
                          >
                            <span className="material-symbols-outlined text-[16px]">dock_to_left</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Slide-over Case Detail Drawer (Inspection Pane) */}
        {selectedCase && (
          <Drawer
            isOpen={Boolean(selectedCase)}
            onClose={() => setSelectedCase(null)}
            title={
              <div className="flex items-center gap-2">
                <span className="font-mono text-primary font-bold">Case #{selectedCase.caseNumber}</span>
                <StatusBadge
                  variant={
                    selectedCase.status === 'ACTIVE'
                      ? 'emerald'
                      : selectedCase.status === 'REVOKED'
                      ? 'rose'
                      : 'neutral'
                  }
                >
                  {selectedCase.status}
                </StatusBadge>
              </div>
            }
          >
            {/* Target Profile Card */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-outline">
                  Target Subject
                </span>
                <span className="font-mono text-[10px] text-tertiary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                  Discord Member
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary-light flex items-center justify-center font-bold text-sm shrink-0 font-mono">
                  {(selectedCase.targetUserTag || selectedCase.targetUserId).charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-display text-sm font-bold text-on-surface truncate">
                    {selectedCase.targetUserTag || 'Discord Member'}
                  </span>
                  <span className="font-mono text-[11px] text-primary select-all">
                    {selectedCase.targetUserId}
                  </span>
                </div>
              </div>

              {/* Subject Prior History Lookup */}
              <div className="pt-2 border-t border-border-subtle text-xs space-y-1.5">
                <div className="flex items-center justify-between text-outline text-[11px]">
                  <span>Prior Warnings:</span>
                  <span className="font-mono text-on-surface font-semibold">
                    {memberLookup?.loading ? 'Loading...' : `${memberLookup?.warnings.length || 0} active`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-outline text-[11px]">
                  <span>Member Notes:</span>
                  <span className="font-mono text-on-surface font-semibold">
                    {memberLookup?.loading ? 'Loading...' : `${memberLookup?.notes.length || 0} recorded`}
                  </span>
                </div>
              </div>
            </div>

            {/* Infraction Specification Grid */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-outline">
                Infraction Scope
              </span>
              <div className="p-3.5 rounded-xl bg-surface-container border border-border-subtle space-y-2.5 text-xs">
                <div className="flex justify-between items-start">
                  <span className="text-outline">Action Dispatched</span>
                  <div>{getActionBadge(selectedCase.action)}</div>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-outline">Enforcing Staff</span>
                  <div className="flex items-center gap-1.5 text-right font-medium text-on-surface">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{selectedCase.moderatorTag || selectedCase.moderatorId}</span>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-outline">Logged At</span>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {new Date(selectedCase.createdAt).toLocaleString()}
                  </span>
                </div>

                {selectedCase.durationSeconds && (
                  <div className="flex justify-between items-start">
                    <span className="text-outline">Duration</span>
                    <span className="font-mono text-[11px] text-warning font-semibold">
                      {Math.round(selectedCase.durationSeconds / 60)} minutes
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Offense Reason */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-outline">
                Violation Reason
              </span>
              <div className="p-3.5 rounded-xl bg-surface-container border border-border-subtle text-xs text-on-surface-variant leading-relaxed">
                {selectedCase.reason}
              </div>
            </div>

            {/* Prior Warnings List */}
            {memberLookup && memberLookup.warnings.length > 0 && (
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-outline">
                  Warning History ({memberLookup.warnings.length})
                </span>
                <div className="space-y-1.5">
                  {memberLookup.warnings.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-lg bg-surface-container-high border border-border-subtle text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-outline">
                        <span className="text-warning font-semibold">WARNING</span>
                        <span>{new Date(w.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-on-surface-variant text-[11px]">{w.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Drawer>
        )}
      </div>

      {/* Quick Action Modal for Real Dispatch */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, actionType: '' })}
        title={`Execute Disciplinary Action: ${actionModal.actionType}`}
        subtitle="Executes immediately via Discord bot bridge & records persistent audit infraction."
        icon="gavel"
      >
        <form onSubmit={handleExecuteAction} className="space-y-4">
          {actionModal.actionType === 'PURGE' ? (
            <>
              <div>
                <label className="block text-xs font-mono uppercase text-outline mb-1">
                  Discord Channel ID *
                </label>
                <input
                  type="text"
                  required
                  value={purgeChannelId}
                  onChange={(e) => setPurgeChannelId(e.target.value)}
                  placeholder="e.g. 1029384756..."
                  className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-border-subtle text-xs font-mono focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-outline mb-1">
                  Message Count (1 - 100) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={purgeCount}
                  onChange={(e) => setPurgeCount(e.target.value)}
                  className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-border-subtle text-xs font-mono focus:outline-none focus:border-primary"
                />
              </div>
            </>
          ) : actionModal.actionType === 'LOCK' ? (
            <div>
              <label className="block text-xs font-mono uppercase text-outline mb-1">
                Discord Channel ID to Lockdown *
              </label>
              <input
                type="text"
                required
                value={lockChannelId}
                onChange={(e) => setLockChannelId(e.target.value)}
                placeholder="e.g. 1029384756..."
                className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-border-subtle text-xs font-mono focus:outline-none focus:border-primary"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-mono uppercase text-outline mb-1">
                  Target Member Discord Snowflake ID *
                </label>
                <input
                  type="text"
                  required
                  value={actionTargetId}
                  onChange={(e) => setActionTargetId(e.target.value)}
                  placeholder="e.g. 849201948273619284"
                  className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-border-subtle text-xs font-mono focus:outline-none focus:border-primary"
                />
              </div>

              {actionModal.actionType === 'TIMEOUT' && (
                <div>
                  <label className="block text-xs font-mono uppercase text-outline mb-1">
                    Timeout Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40320"
                    value={actionDuration}
                    onChange={(e) => setActionDuration(e.target.value)}
                    className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-border-subtle text-xs font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-outline mb-1">
              Official Moderation Reason *
            </label>
            <textarea
              required
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="State the server rule violation or behavioral rationale..."
              className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-lg border border-border-subtle text-xs font-sans focus:outline-none focus:border-primary"
            />
          </div>

          {modalFeedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                modalFeedback.type === 'success'
                  ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                  : 'bg-error/15 text-error border border-error/30'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {modalFeedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{modalFeedback.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setActionModal({ isOpen: false, actionType: '' })}
              disabled={isSubmittingAction}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAction}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
            >
              {isSubmittingAction && (
                <span className="material-symbols-outlined text-[16px] animate-spin">
                  progress_activity
                </span>
              )}
              <span>{isSubmittingAction ? 'Enforcing in Discord...' : `Dispatch ${actionModal.actionType}`}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
