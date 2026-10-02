'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { EmptyState } from '@/components/ui/emptyState';
import { LoadingState } from '@/components/ui/loadingState';

interface GuildRole {
  id: string;
  name: string;
  color: string;
  position: number;
  membersCount: number;
  permissions: string;
  isAdministrator: boolean;
  isModerator: boolean;
  autoModBypass: boolean;
  isMuteRole: boolean;
  isQuarantineRole: boolean;
}

export default function RolesHierarchyPage() {
  const { selectedGuildId } = useGuild();
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    if (!selectedGuildId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/guilds/${selectedGuildId}/roles`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRoles(json.data.sort((a: GuildRole, b: GuildRole) => b.position - a.position));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuildId]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleToggleBypass = async (roleId: string, currentVal: boolean) => {
    if (!selectedGuildId) return;
    try {
      const res = await fetch(`/api/guilds/${selectedGuildId}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, autoModBypass: !currentVal }),
      });
      const json = await res.json();
      if (json.success) {
        setRoles((prev) =>
          prev.map((r) => (r.id === roleId ? { ...r, autoModBypass: !currentVal } : r))
        );
        setSaveStatus('AutoMod bypass permissions updated');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>ADMINISTRATION</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">ROLES & PERMISSIONS</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-primary">
              HIERARCHY LADDER
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Role Hierarchy & Permissions Matrix
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-outline font-mono text-[11px] font-medium border border-border-subtle">
              {roles.length} Server Roles
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus && (
            <span className="text-xs font-mono text-tertiary bg-tertiary/10 px-3 py-1 rounded-lg border border-tertiary/30 animate-fade-in">
              {saveStatus}
            </span>
          )}
          <button
            type="button"
            onClick={loadRoles}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono border border-border-subtle transition-colors"
          >
            <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh Roles</span>
          </button>
        </div>
      </div>

      {/* Overview Info Banner */}
      <div className="px-6 py-4">
        <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex items-start gap-3 text-xs text-outline">
          <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
            shield_person
          </span>
          <div className="space-y-1">
            <span className="font-bold text-on-surface block text-sm">
              Role Hierarchy Enforcement Engine
            </span>
            <p className="leading-relaxed">
              In Discord governance, role hierarchy dictates authority: staff cannot execute punishments on members with equal or higher roles. Configure AutoMod bypass rights and quarantine role bindings below.
            </p>
          </div>
        </div>
      </div>

      {/* Main Roles Ladder */}
      <div className="px-6 py-2">
        {isLoading ? (
          <LoadingState message="Loading server roles hierarchy..." />
        ) : (
          <div className="rounded-xl bg-surface-container-low border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-container text-outline font-mono text-[10px] uppercase">
                    <th className="py-3 px-4 font-bold">Position</th>
                    <th className="py-3 px-3 font-bold">Role Identity</th>
                    <th className="py-3 px-3 font-bold">Members</th>
                    <th className="py-3 px-3 font-bold">Staff Authority</th>
                    <th className="py-3 px-3 font-bold">AutoMod Bypass</th>
                    <th className="py-3 px-3 font-bold">System Binding</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {roles.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-outline">
                        #{r.position}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="font-semibold text-on-surface" style={{ color: r.color }}>
                            {r.name}
                          </span>
                          <span className="text-[10px] text-outline font-mono">({r.id})</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {r.membersCount.toLocaleString()} members
                      </td>

                      <td className="py-3 px-3">
                        {r.isAdministrator ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            ADMINISTRATOR
                          </span>
                        ) : r.isModerator ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                            MODERATOR
                          </span>
                        ) : (
                          <span className="text-outline text-[11px]">Member</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleBypass(r.id, r.autoModBypass)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                            r.autoModBypass
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-surface-container text-outline border-border-subtle hover:text-on-surface'
                          }`}
                        >
                          {r.autoModBypass ? 'BYPASS ACTIVE' : 'SHIELDED'}
                        </button>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {r.isMuteRole ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                            MUTE ROLE
                          </span>
                        ) : r.isQuarantineRole ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold">
                            QUARANTINE ROLE
                          </span>
                        ) : (
                          <span className="text-outline text-[11px]">&mdash;</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleBypass(r.id, r.autoModBypass)}
                          className="text-xs font-mono text-primary hover:underline"
                        >
                          Toggle Bypass
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
