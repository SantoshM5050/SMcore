'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/emptyState';
import { LoadingState } from '@/components/ui/loadingState';

interface MemberRecord {
  id: string;
  username: string;
  globalName: string;
  discriminator: string;
  avatar: string | null;
  roles: Array<{ id: string; name: string; color: string }>;
  joinedAt: string;
  accountCreatedAt: string;
  accountAgeDays: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ACTIVE' | 'TIMED_OUT' | 'QUARANTINED' | 'WARNED';
  warningsCount: number;
  casesCount: number;
}

export default function MembersDirectoryPage() {
  const { selectedGuildId } = useGuild();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Quick Action Modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    member: MemberRecord | null;
    actionType: 'BAN' | 'KICK' | 'TIMEOUT' | 'WARN' | 'QUARANTINE' | '';
  }>({ isOpen: false, member: null, actionType: '' });

  const [actionReason, setActionReason] = useState('');
  const [timeoutMinutes, setTimeoutMinutes] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!selectedGuildId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/guilds/${selectedGuildId}/members`);
      const json = await res.json();
      if (json.success && json.data?.members) {
        setMembers(json.data.members);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuildId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUser =
          m.username.toLowerCase().includes(q) ||
          m.globalName.toLowerCase().includes(q) ||
          m.id.includes(q);
        if (!matchesUser) return false;
      }
      if (riskFilter !== 'ALL' && m.riskLevel !== riskFilter) return false;
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (roleFilter !== 'ALL') {
        const hasRole = m.roles.some((r) => r.name.toLowerCase() === roleFilter.toLowerCase());
        if (!hasRole) return false;
      }
      return true;
    });
  }, [members, searchQuery, riskFilter, statusFilter, roleFilter]);

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId || !actionModal.member || !actionModal.actionType) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/guilds/${selectedGuildId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.actionType,
          targetUserId: actionModal.member.id,
          reason: actionReason.trim() || `Disciplinary action via Member Directory`,
          durationSeconds: actionModal.actionType === 'TIMEOUT' ? parseInt(timeoutMinutes, 10) * 60 : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`Action ${actionModal.actionType} successfully enforced on ${actionModal.member.username}.`);
        setTimeout(() => {
          setActionModal({ isOpen: false, member: null, actionType: '' });
          setFeedback(null);
          loadMembers();
        }, 1200);
      } else {
        setFeedback(json?.error?.message || 'Action execution failed');
      }
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Error executing action');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>OPERATIONS</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">ROSTER</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-primary">
              MEMBER DIRECTORY
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Server Members Directory
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-outline font-mono text-[11px] font-medium border border-border-subtle">
              {filteredMembers.length} Members Displayed
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadMembers}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono border border-border-subtle transition-colors"
        >
          <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>Refresh Roster</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="px-6 py-3">
        <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by username, global name, or Snowflake ID..."
              className="w-full pl-9 pr-4 py-1.5 bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs rounded-lg border border-border-subtle focus:outline-none focus:border-primary font-sans"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-1.5 border border-border-subtle font-mono"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk (New &lt; 3d)</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-1.5 border border-border-subtle font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="WARNED">Warned</option>
              <option value="TIMED_OUT">Timed Out</option>
              <option value="QUARANTINED">Quarantined</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-1.5 border border-border-subtle font-mono"
            >
              <option value="ALL">All Roles</option>
              <option value="Administrator">Administrator</option>
              <option value="Moderator">Moderator</option>
              <option value="Verified Member">Verified Member</option>
              <option value="Quarantined">Quarantined</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Members Table */}
      <div className="px-6 py-2">
        {isLoading ? (
          <LoadingState message="Loading server members roster..." />
        ) : filteredMembers.length === 0 ? (
          <EmptyState
            icon="group"
            title="No Members Found"
            description="No server members matched your search criteria."
          />
        ) : (
          <div className="rounded-xl bg-surface-container-low border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-container text-outline font-mono text-[10px] uppercase">
                    <th className="py-3 px-4 font-bold">User Identity</th>
                    <th className="py-3 px-3 font-bold">Assigned Roles</th>
                    <th className="py-3 px-3 font-bold">Account Risk</th>
                    <th className="py-3 px-3 font-bold">Status</th>
                    <th className="py-3 px-3 font-bold text-center">Warns</th>
                    <th className="py-3 px-3 font-bold">Joined</th>
                    <th className="py-3 px-4 font-bold text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs ring-1 ring-primary/30">
                            {m.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface flex items-center gap-1.5">
                              <span>{m.globalName || m.username}</span>
                              <span className="text-[10px] text-outline font-mono">@{m.username}</span>
                            </div>
                            <div className="text-[10px] text-outline font-mono">{m.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {m.roles.map((r) => (
                            <span
                              key={r.id}
                              className="px-2 py-0.5 rounded text-[10px] font-medium border"
                              style={{
                                backgroundColor: `${r.color}15`,
                                color: r.color,
                                borderColor: `${r.color}30`,
                              }}
                            >
                              {r.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.riskLevel === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : m.riskLevel === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {m.riskLevel} ({m.accountAgeDays}d old)
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : m.status === 'TIMED_OUT'
                              ? 'bg-amber-500/20 text-amber-300'
                              : m.status === 'QUARANTINED'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-indigo-500/20 text-indigo-300'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={m.warningsCount > 0 ? 'text-amber-400' : 'text-outline'}>
                          {m.warningsCount}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-outline">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({ isOpen: true, member: m, actionType: 'WARN' })
                            }
                            className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-amber-300 border border-border-subtle font-mono text-[11px]"
                            title="Issue Warning"
                          >
                            Warn
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({ isOpen: true, member: m, actionType: 'TIMEOUT' })
                            }
                            className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-amber-400 border border-border-subtle font-mono text-[11px]"
                            title="Timeout / Mute"
                          >
                            Timeout
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({ isOpen: true, member: m, actionType: 'KICK' })
                            }
                            className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle font-mono text-[11px]"
                            title="Kick Member"
                          >
                            Kick
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({ isOpen: true, member: m, actionType: 'BAN' })
                            }
                            className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-mono text-[11px]"
                            title="Ban Member"
                          >
                            Ban
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Modal */}
      {actionModal.isOpen && actionModal.member && (
        <Modal
          isOpen={actionModal.isOpen}
          onClose={() => setActionModal({ isOpen: false, member: null, actionType: '' })}
          title={`Enforce ${actionModal.actionType} on ${actionModal.member.username}`}
        >
          <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
            {feedback && (
              <div className="p-3 rounded-lg bg-surface-container border border-border-subtle text-primary font-mono">
                {feedback}
              </div>
            )}

            <div>
              <span className="block text-[10px] uppercase font-mono text-outline font-bold mb-1">
                Target User
              </span>
              <div className="p-2.5 rounded-lg bg-surface-container font-mono text-on-surface">
                {actionModal.member.globalName} (@{actionModal.member.username}) &mdash; ID: {actionModal.member.id}
              </div>
            </div>

            {actionModal.actionType === 'TIMEOUT' && (
              <div>
                <label className="block text-[10px] uppercase font-mono text-outline font-bold mb-1">
                  Timeout Duration
                </label>
                <select
                  value={timeoutMinutes}
                  onChange={(e) => setTimeoutMinutes(e.target.value)}
                  className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono"
                >
                  <option value="1">1 Minute</option>
                  <option value="5">5 Minutes</option>
                  <option value="10">10 Minutes</option>
                  <option value="60">1 Hour</option>
                  <option value="1440">1 Day</option>
                  <option value="10080">1 Week</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase font-mono text-outline font-bold mb-1">
                Reason for Disciplinary Enforcement
              </label>
              <textarea
                rows={2}
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Reason logged into permanent audit file..."
                className="w-full p-2.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, member: null, actionType: '' })}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold transition-colors"
              >
                {isSubmitting ? 'Enforcing...' : `Confirm ${actionModal.actionType}`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
