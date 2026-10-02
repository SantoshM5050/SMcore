'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient } from '@/lib/api/apiClient';
import { StatusBadge } from '@/components/ui/statusBadge';
import { Drawer } from '@/components/ui/drawer';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/emptyState';
import { LoadingState } from '@/components/ui/loadingState';
import { InteractiveTerminal } from '@/components/terminal/interactiveTerminal';

interface CaseRecord {
  id: string;
  caseNumber: number;
  guildId: string;
  targetUserId: string;
  targetUserTag?: string;
  moderatorId: string;
  moderatorTag?: string;
  action: 'BAN' | 'KICK' | 'TIMEOUT' | 'WARN' | 'UNBAN' | 'UNTIMEOUT' | 'PURGE' | 'LOCK' | 'UNLOCK' | 'SLOWMODE' | 'NICKNAME' | 'QUARANTINE';
  reason: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'COMPLETED';
  durationSeconds?: number | null;
  createdAt: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

interface WarningRecord {
  id: string;
  reason: string;
  status: string;
  moderatorUserId?: string;
  createdAt: string;
}

interface NoteRecord {
  id: string;
  authorUserId: string;
  content: string;
  createdAt: string;
}

interface EscalationRule {
  id: string;
  warningCount: number;
  action: 'TIMEOUT' | 'KICK' | 'BAN';
  durationSeconds?: number;
  enabled: boolean;
}

type ModActionModalType =
  | 'BAN'
  | 'SOFTBAN'
  | 'KICK'
  | 'TIMEOUT'
  | 'UNTIMEOUT'
  | 'WARN'
  | 'PURGE'
  | 'LOCK'
  | 'UNLOCK'
  | 'SLOWMODE'
  | 'NICKNAME'
  | 'QUARANTINE'
  | '';

export default function ModerationCommandCenterPage() {
  const { selectedGuildId } = useGuild();
  const [activeTab, setActiveTab] = useState<'cases' | 'dossier' | 'escalation' | 'terminal'>('cases');

  // Cases State
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [moderatorFilter, setModeratorFilter] = useState('ALL');

  // Quick Action Modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    actionType: ModActionModalType;
  }>({ isOpen: false, actionType: '' });

  // Modal Form Inputs
  const [actionTargetId, setActionTargetId] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionDurationPreset, setActionDurationPreset] = useState('600'); // in seconds
  const [purgeChannelId, setPurgeChannelId] = useState('');
  const [purgeCount, setPurgeCount] = useState('20');
  const [purgeFilter, setPurgeFilter] = useState('ALL');
  const [channelTargetId, setChannelTargetId] = useState('');
  const [slowmodeSeconds, setSlowmodeSeconds] = useState('10');
  const [newNickname, setNewNickname] = useState('');
  const [banDeleteDays, setBanDeleteDays] = useState('1');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Member Dossier Lookup
  const [lookupUserId, setLookupUserId] = useState('200100100100100102');
  const [memberWarnings, setMemberWarnings] = useState<WarningRecord[]>([]);
  const [memberNotes, setMemberNotes] = useState<NoteRecord[]>([]);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Escalation Rules
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([
    { id: '1', warningCount: 3, action: 'TIMEOUT', durationSeconds: 3600, enabled: true },
    { id: '2', warningCount: 5, action: 'TIMEOUT', durationSeconds: 86400, enabled: true },
    { id: '3', warningCount: 7, action: 'KICK', enabled: true },
    { id: '4', warningCount: 10, action: 'BAN', enabled: true },
  ]);

  // Load Cases
  const fetchCases = useCallback(async () => {
    if (!selectedGuildId) {
      setCases([]);
      setSelectedCase(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiClient.cases.list(selectedGuildId, { pageSize: 100 });
      if (res.success && res.data?.items) {
        const mapped: CaseRecord[] = res.data.items.map((item) => ({
          id: item.id,
          caseNumber: item.caseNumber,
          guildId: item.guildId,
          targetUserId: item.targetUserId,
          targetUserTag: item.targetUserTag || `User (${item.targetUserId})`,
          moderatorId: item.moderatorUserId,
          moderatorTag: item.moderatorTag || (item.moderatorUserId === 'AUTOMOD' ? 'AutoMod Sentinel' : `Staff (${item.moderatorUserId})`),
          action: item.type as CaseRecord['action'],
          reason: item.reason,
          status: item.status as CaseRecord['status'],
          durationSeconds: item.duration,
          createdAt: item.createdAt,
          expiresAt: item.expiresAt,
          metadata: item.metadata,
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

  // Load Member Dossier (Warnings + Notes)
  const loadMemberDossier = useCallback(
    async (userId: string) => {
      if (!selectedGuildId || !userId.trim()) return;
      setIsLoadingDossier(true);
      try {
        const [warnRes, noteRes] = await Promise.all([
          apiClient.members.getWarnings(selectedGuildId, userId.trim()).catch(() => ({ success: false, data: [] })),
          apiClient.members.getNotes(selectedGuildId, userId.trim()).catch(() => ({ success: false, data: [] })),
        ]);

        if (warnRes.success && Array.isArray(warnRes.data)) {
          setMemberWarnings(warnRes.data as WarningRecord[]);
        } else {
          setMemberWarnings([]);
        }

        if (noteRes.success && Array.isArray(noteRes.data)) {
          setMemberNotes(noteRes.data as NoteRecord[]);
        } else {
          setMemberNotes([]);
        }
      } catch {
        setMemberWarnings([]);
        setMemberNotes([]);
      } finally {
        setIsLoadingDossier(false);
      }
    },
    [selectedGuildId]
  );

  useEffect(() => {
    if (activeTab === 'dossier' && lookupUserId) {
      loadMemberDossier(lookupUserId);
    }
  }, [activeTab, lookupUserId, loadMemberDossier]);

  const openActionModal = useCallback(
    (actionType: ModActionModalType, prefillTarget?: string) => {
      setActionModal({ isOpen: true, actionType });
      if (prefillTarget) setActionTargetId(prefillTarget);
      setActionReason('');
      setModalFeedback(null);
    },
    []
  );

  // Keyboard Shortcuts for Rapid Moderation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        openActionModal('BAN');
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        openActionModal('TIMEOUT');
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        openActionModal('WARN');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        openActionModal('KICK');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        openActionModal('PURGE');
      } else if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setActiveTab('terminal');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openActionModal]);

  // Filtered Cases List
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

  // Execute Action via Backend
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId || !actionModal.actionType) return;

    setIsSubmittingAction(true);
    setModalFeedback(null);

    try {
      let payload: any = {
        action: actionModal.actionType,
        reason: actionReason.trim() || `Disciplinary action executed via SMCore console`,
      };

      if (actionModal.actionType === 'PURGE') {
        payload.action = 'PURGE';
        payload.channelId = purgeChannelId.trim() || '100100100100100101';
        payload.messageCount = parseInt(purgeCount, 10) || 20;
      } else if (actionModal.actionType === 'LOCK' || actionModal.actionType === 'UNLOCK') {
        payload.channelId = channelTargetId.trim() || '100100100100100101';
      } else if (actionModal.actionType === 'SLOWMODE') {
        payload.channelId = channelTargetId.trim() || '100100100100100101';
        payload.slowmodeSeconds = parseInt(slowmodeSeconds, 10) || 0;
      } else if (actionModal.actionType === 'TIMEOUT') {
        payload.targetUserId = actionTargetId.trim() || '200100100100100101';
        payload.durationSeconds = parseInt(actionDurationPreset, 10) || 600;
      } else if (actionModal.actionType === 'BAN' || actionModal.actionType === 'SOFTBAN') {
        payload.targetUserId = actionTargetId.trim() || '200100100100100101';
        payload.deleteMessageSeconds = parseInt(banDeleteDays, 10) * 86400;
      } else {
        payload.targetUserId = actionTargetId.trim() || '200100100100100101';
      }

      const res = await apiClient.moderation.executeAction(selectedGuildId, payload);

      if (res.success) {
        setModalFeedback({
          type: 'success',
          message: res.data?.message || `Disciplinary action ${actionModal.actionType} successfully enforced and logged.`,
        });
        await fetchCases();
        if (activeTab === 'dossier' && actionTargetId === lookupUserId) {
          await loadMemberDossier(lookupUserId);
        }
        setTimeout(() => {
          setActionModal({ isOpen: false, actionType: '' });
          setModalFeedback(null);
        }, 1500);
      } else {
        setModalFeedback({
          type: 'error',
          message: res.error?.message || 'Failed to execute moderation action',
        });
      }
    } catch (err: unknown) {
      setModalFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error executing moderation action',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Add Staff Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId || !lookupUserId.trim() || !newNoteContent.trim()) return;

    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/guilds/${selectedGuildId}/members/${lookupUserId.trim()}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setNewNoteContent('');
        await loadMemberDossier(lookupUserId.trim());
      }
    } catch {
      // ignore
    } finally {
      setIsAddingNote(false);
    }
  };

  // Revoke Warning
  const handleRevokeWarning = async (warnId: string) => {
    if (!selectedGuildId || !lookupUserId.trim()) return;
    try {
      await fetch(`/api/guilds/${selectedGuildId}/members/${lookupUserId.trim()}/warnings?warnId=${warnId}`, {
        method: 'DELETE',
      });
      await loadMemberDossier(lookupUserId.trim());
      await fetchCases();
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>OPERATIONS</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">DISCORD MODERATION</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-primary">
              FULL MODULE SUITE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Moderation Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-mono text-[11px] font-medium border border-tertiary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Gateway Sync Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-mono font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            <span>Open Terminal [~]</span>
          </button>
          <button
            type="button"
            onClick={fetchCases}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono border border-border-subtle transition-colors"
          >
            <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Action Launcher Strip (Always Accessible) */}
      <div className="px-6 py-3 bg-surface-container-lowest/80 border-b border-border-subtle">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-outline text-[11px] font-mono uppercase font-bold shrink-0 mr-1">
            Fast Action:
          </span>
          <button
            type="button"
            onClick={() => openActionModal('BAN')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-semibold transition-all whitespace-nowrap shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px]">block</span>
            <span>Ban Member</span>
            <kbd className="text-[10px] opacity-60 font-mono bg-rose-500/20 px-1 rounded">B</kbd>
          </button>

          <button
            type="button"
            onClick={() => openActionModal('TIMEOUT')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold transition-all whitespace-nowrap shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px]">timer</span>
            <span>Timeout / Mute</span>
            <kbd className="text-[10px] opacity-60 font-mono bg-amber-500/20 px-1 rounded">T</kbd>
          </button>

          <button
            type="button"
            onClick={() => openActionModal('WARN')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary-light border border-primary/30 font-semibold transition-all whitespace-nowrap shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px]">warning</span>
            <span>Issue Warn</span>
            <kbd className="text-[10px] opacity-60 font-mono bg-primary/20 px-1 rounded">W</kbd>
          </button>

          <button
            type="button"
            onClick={() => openActionModal('KICK')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle font-semibold transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[15px]">person_remove</span>
            <span>Kick</span>
            <kbd className="text-[10px] opacity-60 font-mono bg-surface-container-highest px-1 rounded">K</kbd>
          </button>

          <button
            type="button"
            onClick={() => openActionModal('PURGE')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle font-semibold transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[15px]">cleaning_services</span>
            <span>Purge Chat</span>
            <kbd className="text-[10px] opacity-60 font-mono bg-surface-container-highest px-1 rounded">P</kbd>
          </button>

          <button
            type="button"
            onClick={() => openActionModal('LOCK')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle font-semibold transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[15px]">lock</span>
            <span>Lockdown</span>
          </button>

          <button
            type="button"
            onClick={() => openActionModal('SLOWMODE')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle font-semibold transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[15px]">speed</span>
            <span>Slowmode</span>
          </button>

          <button
            type="button"
            onClick={() => openActionModal('NICKNAME')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle font-semibold transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[15px]">badge</span>
            <span>Nickname</span>
          </button>

          <button
            type="button"
            onClick={() => openActionModal('QUARANTINE')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-rose-400 border border-border-subtle font-semibold transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[15px]">security</span>
            <span>Quarantine</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-border-subtle w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('cases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'cases'
                ? 'bg-surface-container-high text-on-surface shadow-sm text-primary'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span>Cases & Enforcement Records</span>
            <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-[10px] font-mono">
              {cases.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dossier')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'dossier'
                ? 'bg-surface-container-high text-on-surface shadow-sm text-primary'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_box</span>
            <span>Member Dossier & Warnings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('escalation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'escalation'
                ? 'bg-surface-container-high text-on-surface shadow-sm text-primary'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">stairs</span>
            <span>Auto-Escalation Ladder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'terminal'
                ? 'bg-surface-container-high text-on-surface shadow-sm text-indigo-400'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            <span>Embedded CLI Console</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CASES TABLE & INSPECTOR */}
      {activeTab === 'cases' && (
        <div className="px-6 py-2 space-y-4">
          {/* Filter Bar */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases by Case #, Target Snowflake ID, Tag, or Reason..."
                className="w-full pl-9 pr-4 py-1.5 bg-surface-container-lowest text-on-surface placeholder:text-outline-variant text-xs rounded-lg border border-border-subtle focus:outline-none focus:border-primary transition-all font-mono"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-1.5 border border-border-subtle focus:outline-none font-mono"
              >
                <option value="ALL">All Actions</option>
                <option value="BAN">Ban</option>
                <option value="TIMEOUT">Timeout / Mute</option>
                <option value="WARN">Warning</option>
                <option value="KICK">Kick</option>
                <option value="PURGE">Purge</option>
                <option value="LOCK">Lockdown</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-1.5 border border-border-subtle focus:outline-none font-mono"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="REVOKED">Revoked</option>
                <option value="EXPIRED">Expired</option>
              </select>

              <select
                value={moderatorFilter}
                onChange={(e) => setModeratorFilter(e.target.value)}
                className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-1.5 border border-border-subtle focus:outline-none font-mono"
              >
                <option value="ALL">All Moderators</option>
                <option value="STAFF">Human Staff</option>
                <option value="AUTOMOD">AutoMod Bot</option>
              </select>
            </div>
          </div>

          {/* Cases Data Grid */}
          {isLoading ? (
            <LoadingState message="Loading moderation case records..." />
          ) : filteredCases.length === 0 ? (
            <EmptyState
              icon="gavel"
              title="No Moderation Cases Found"
              description="No disciplinary actions match your current filter criteria. Use the Quick Action bar above to issue a ban, warning, or timeout."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Cases List */}
              <div className="lg:col-span-2 rounded-xl bg-surface-container-low border border-border-subtle overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle bg-surface-container text-outline font-mono text-[10px] uppercase">
                        <th className="py-2.5 px-4 font-bold">Case #</th>
                        <th className="py-2.5 px-3 font-bold">Action</th>
                        <th className="py-2.5 px-3 font-bold">Target Subject</th>
                        <th className="py-2.5 px-3 font-bold">Reason</th>
                        <th className="py-2.5 px-3 font-bold">Moderator</th>
                        <th className="py-2.5 px-3 font-bold text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {filteredCases.map((c) => {
                        const isSelected = selectedCase?.id === c.id;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => setSelectedCase(c)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 hover:bg-primary/15'
                                : 'hover:bg-surface-container-high/60'
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-on-surface">
                              #{c.caseNumber}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  c.action === 'BAN'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : c.action === 'TIMEOUT'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : c.action === 'WARN'
                                    ? 'bg-indigo-500/20 text-indigo-300'
                                    : c.action === 'KICK'
                                    ? 'bg-orange-500/20 text-orange-300'
                                    : 'bg-surface-container-highest text-outline'
                                }`}
                              >
                                {c.action}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <div className="font-semibold text-on-surface">{c.targetUserTag}</div>
                              <div className="text-[10px] text-outline">{c.targetUserId}</div>
                            </td>
                            <td className="py-3 px-3 max-w-[200px] truncate text-on-surface-variant font-sans">
                              {c.reason}
                            </td>
                            <td className="py-3 px-3 text-outline font-mono text-[11px]">
                              {c.moderatorTag}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-[10px] text-outline tabular-nums">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Case Detail Dossier Inspector */}
              <div className="lg:col-span-1 rounded-xl bg-surface-container-low border border-border-subtle p-5 flex flex-col gap-4">
                {selectedCase ? (
                  <>
                    <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                      <div>
                        <span className="font-mono text-[10px] text-outline uppercase">
                          Case File #{selectedCase.caseNumber}
                        </span>
                        <h3 className="font-bold text-base text-on-surface flex items-center gap-2 mt-0.5">
                          <span>{selectedCase.action} Enforcement</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              selectedCase.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-surface-container-highest text-outline'
                            }`}
                          >
                            {selectedCase.status}
                          </span>
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLookupUserId(selectedCase.targetUserId);
                          setActiveTab('dossier');
                        }}
                        className="text-xs text-primary hover:underline font-mono"
                      >
                        View Dossier ↗
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-outline block">
                          Target Member
                        </span>
                        <div className="font-semibold text-on-surface mt-0.5">
                          {selectedCase.targetUserTag}
                        </div>
                        <div className="font-mono text-[11px] text-outline">
                          {selectedCase.targetUserId}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-mono text-outline block">
                          Reason / Violation
                        </span>
                        <div className="p-2.5 rounded-lg bg-surface-container text-on-surface-variant font-sans mt-1 border border-border-subtle">
                          {selectedCase.reason}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded bg-surface-container border border-border-subtle">
                          <span className="text-[9px] uppercase font-mono text-outline block">
                            Enforced By
                          </span>
                          <span className="font-mono font-medium text-on-surface">
                            {selectedCase.moderatorTag}
                          </span>
                        </div>

                        <div className="p-2 rounded bg-surface-container border border-border-subtle">
                          <span className="text-[9px] uppercase font-mono text-outline block">
                            Duration
                          </span>
                          <span className="font-mono font-medium text-on-surface">
                            {selectedCase.durationSeconds
                              ? `${Math.floor(selectedCase.durationSeconds / 60)} minutes`
                              : 'Permanent / Instant'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-mono text-outline block">
                          Issued Timestamp
                        </span>
                        <span className="font-mono text-outline text-[11px]">
                          {new Date(selectedCase.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border-subtle flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openActionModal('TIMEOUT', selectedCase.targetUserId)}
                        className="flex-1 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors border border-border-subtle text-center"
                      >
                        Timeout
                      </button>
                      <button
                        type="button"
                        onClick={() => openActionModal('BAN', selectedCase.targetUserId)}
                        className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors border border-rose-500/30 text-center"
                      >
                        Ban
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-outline text-xs">
                    Select a case from the table to view its full evidence dossier.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBER DOSSIER & WARNINGS */}
      {activeTab === 'dossier' && (
        <div className="px-6 py-2 space-y-5">
          {/* Member Search Bar */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-outline text-xs font-mono uppercase font-bold shrink-0">
                Subject ID:
              </span>
              <input
                type="text"
                value={lookupUserId}
                onChange={(e) => setLookupUserId(e.target.value)}
                placeholder="Enter Discord Snowflake ID (e.g. 200100100100100102)..."
                className="w-full max-w-md px-3 py-1.5 bg-surface-container-lowest text-on-surface text-xs font-mono rounded-lg border border-border-subtle focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => loadMemberDossier(lookupUserId)}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors"
              >
                Inspect
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openActionModal('WARN', lookupUserId)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                + Issue Warning
              </button>
              <button
                type="button"
                onClick={() => openActionModal('TIMEOUT', lookupUserId)}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle text-xs font-semibold transition-colors"
              >
                Timeout
              </button>
              <button
                type="button"
                onClick={() => openActionModal('BAN', lookupUserId)}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
              >
                Ban
              </button>
            </div>
          </div>

          {isLoadingDossier ? (
            <LoadingState message="Fetching member record and infraction history..." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Warnings History */}
              <div className="p-5 rounded-xl bg-surface-container-low border border-border-subtle space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-[20px]">
                      warning
                    </span>
                    <h3 className="font-bold text-sm text-on-surface">
                      Warnings History & Active Points
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-500/20 text-amber-300">
                    {memberWarnings.filter((w) => w.status === 'ACTIVE').length} Active
                  </span>
                </div>

                {memberWarnings.length === 0 ? (
                  <div className="py-8 text-center text-outline text-xs">
                    No warnings registered for user {lookupUserId}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {memberWarnings.map((w, i) => (
                      <div
                        key={w.id || i}
                        className="p-3 rounded-lg bg-surface-container border border-border-subtle flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-outline text-[10px]">#{i + 1}</span>
                            <span className="font-semibold text-on-surface">{w.reason}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                w.status === 'ACTIVE'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-surface-container-highest text-outline'
                              }`}
                            >
                              {w.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-outline font-mono">
                            Issued: {new Date(w.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {w.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeWarning(w.id)}
                            className="text-[10px] text-rose-400 hover:underline font-mono"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Staff Notes Dossier */}
              <div className="p-5 rounded-xl bg-surface-container-low border border-border-subtle space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      description
                    </span>
                    <h3 className="font-bold text-sm text-on-surface">Staff Confidential Notes</h3>
                  </div>
                  <span className="text-[10px] font-mono text-outline">Internal Only</span>
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Add private staff observation (e.g. user acknowledged warning in DMs, monitored for alt evasion)..."
                    className="w-full p-2.5 bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs rounded-lg border border-border-subtle focus:outline-none focus:border-primary font-sans"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isAddingNote || !newNoteContent.trim()}
                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                    >
                      {isAddingNote ? 'Saving Note...' : 'Add Note'}
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="space-y-2.5 pt-2">
                  {memberNotes.length === 0 ? (
                    <div className="py-6 text-center text-outline text-xs">
                      No staff notes recorded for this member.
                    </div>
                  ) : (
                    memberNotes.map((n, i) => (
                      <div
                        key={n.id || i}
                        className="p-3 rounded-lg bg-surface-container border border-border-subtle text-xs space-y-1"
                      >
                        <p className="text-on-surface-variant font-sans">{n.content}</p>
                        <div className="text-[10px] text-outline font-mono flex items-center justify-between pt-1">
                          <span>Staff ID: {n.authorUserId}</span>
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUTO-ESCALATION LADDER */}
      {activeTab === 'escalation' && (
        <div className="px-6 py-2 space-y-5 max-w-4xl">
          <div className="p-5 rounded-xl bg-surface-container-low border border-border-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="font-bold text-sm text-on-surface">
                  Automated Warning Escalation Matrix
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  When a member accumulates warnings, SMCore automatically applies progressive disciplinary action.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
                ACTIVE PIPELINE
              </span>
            </div>

            <div className="space-y-3">
              {escalationRules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-lg bg-surface-container border border-border-subtle flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold font-mono flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-on-surface">
                        At <span className="text-amber-400 font-mono font-bold">{rule.warningCount} Warnings</span>
                      </div>
                      <div className="text-outline text-[11px]">
                        Trigger automated punishment: <span className="font-mono text-on-surface font-semibold">{rule.action}</span>
                        {rule.durationSeconds ? ` (${rule.durationSeconds / 3600} hours)` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ENFORCING
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMBEDDED CLI TERMINAL */}
      {activeTab === 'terminal' && (
        <div className="px-6 py-2">
          <InteractiveTerminal fullPage={false} />
        </div>
      )}

      {/* MODAL: DISCIPLINARY & OPERATIONAL ACTIONS */}
      {actionModal.isOpen && (
        <Modal
          isOpen={actionModal.isOpen}
          onClose={() => setActionModal({ isOpen: false, actionType: '' })}
          title={`Execute ${actionModal.actionType} Action`}
        >
          <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
            {modalFeedback && (
              <div
                className={`p-3 rounded-lg text-xs font-mono border ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                {modalFeedback.message}
              </div>
            )}

            {/* Target ID for User Actions */}
            {!['PURGE', 'LOCK', 'UNLOCK', 'SLOWMODE'].includes(actionModal.actionType) && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-outline mb-1 font-bold">
                  Target Member Snowflake ID
                </label>
                <input
                  type="text"
                  required
                  value={actionTargetId}
                  onChange={(e) => setActionTargetId(e.target.value)}
                  placeholder="e.g. 200100100100100102"
                  className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Channel ID for Channel Actions */}
            {['PURGE', 'LOCK', 'UNLOCK', 'SLOWMODE'].includes(actionModal.actionType) && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-outline mb-1 font-bold">
                  Channel Snowflake ID
                </label>
                <input
                  type="text"
                  value={channelTargetId || purgeChannelId}
                  onChange={(e) => {
                    setChannelTargetId(e.target.value);
                    setPurgeChannelId(e.target.value);
                  }}
                  placeholder="e.g. 100100100100100101 (Leave blank for general)"
                  className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Timeout Duration Presets */}
            {actionModal.actionType === 'TIMEOUT' && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-outline mb-1 font-bold">
                  Timeout Duration
                </label>
                <select
                  value={actionDurationPreset}
                  onChange={(e) => setActionDurationPreset(e.target.value)}
                  className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono focus:outline-none"
                >
                  <option value="60">1 Minute</option>
                  <option value="300">5 Minutes</option>
                  <option value="600">10 Minutes (Standard)</option>
                  <option value="3600">1 Hour</option>
                  <option value="86400">1 Day (24 Hours)</option>
                  <option value="604800">1 Week (7 Days)</option>
                </select>
              </div>
            )}

            {/* Ban Message Purge Days */}
            {(actionModal.actionType === 'BAN' || actionModal.actionType === 'SOFTBAN') && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-outline mb-1 font-bold">
                  Delete Message History
                </label>
                <select
                  value={banDeleteDays}
                  onChange={(e) => setBanDeleteDays(e.target.value)}
                  className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono focus:outline-none"
                >
                  <option value="0">Do Not Delete</option>
                  <option value="1">Previous 24 Hours</option>
                  <option value="7">Previous 7 Days</option>
                </select>
              </div>
            )}

            {/* Purge Message Count */}
            {actionModal.actionType === 'PURGE' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-outline mb-1 font-bold">
                    Message Count (1 - 100)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={purgeCount}
                    onChange={(e) => setPurgeCount(e.target.value)}
                    className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-outline mb-1 font-bold">
                    Filter Mode
                  </label>
                  <select
                    value={purgeFilter}
                    onChange={(e) => setPurgeFilter(e.target.value)}
                    className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono"
                  >
                    <option value="ALL">All Messages</option>
                    <option value="BOTS">Bots Only</option>
                    <option value="LINKS">Contains Links</option>
                    <option value="INVITES">Discord Invites</option>
                  </select>
                </div>
              </div>
            )}

            {/* Slowmode Rate Limit */}
            {actionModal.actionType === 'SLOWMODE' && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-outline mb-1 font-bold">
                  Slowmode Rate Limit
                </label>
                <select
                  value={slowmodeSeconds}
                  onChange={(e) => setSlowmodeSeconds(e.target.value)}
                  className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono"
                >
                  <option value="0">Disabled (0s)</option>
                  <option value="5">5 Seconds</option>
                  <option value="10">10 Seconds</option>
                  <option value="15">15 Seconds</option>
                  <option value="30">30 Seconds</option>
                  <option value="60">1 Minute</option>
                  <option value="300">5 Minutes</option>
                  <option value="900">15 Minutes</option>
                  <option value="21600">6 Hours</option>
                </select>
              </div>
            )}

            {/* Nickname */}
            {actionModal.actionType === 'NICKNAME' && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-outline mb-1 font-bold">
                  New Nickname (Leave blank to reset to default)
                </label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="Moderated Nickname"
                  className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono"
                />
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-outline mb-1 font-bold">
                Moderation Reason / Violation
              </label>
              <textarea
                rows={2}
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Reason for disciplinary action (logged into audit records)..."
                className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle focus:outline-none focus:border-primary font-sans"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, actionType: '' })}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark disabled:opacity-40 text-white text-xs font-bold transition-colors"
              >
                {isSubmittingAction ? 'Enforcing...' : `Confirm & Execute ${actionModal.actionType}`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
