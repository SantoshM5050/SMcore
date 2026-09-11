'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, ShieldAlert, CheckCircle, XCircle, Search, Trash2, Zap } from 'lucide-react';
import { WarningItem } from '@/types';

export default function WarningsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ACTIVE');

  const fetchWarnings = () => {
    if (!guildId) return;
    setLoading(true);

    const query = new URLSearchParams();
    if (search) query.set('userId', search);

    fetch(`/api/guilds/${guildId}/moderation/warnings?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWarnings(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWarnings();
  }, [guildId]);

  const handleRevokeWarning = async (id: string) => {
    await fetch(`/api/guilds/${guildId}/moderation/warnings?id=${id}`, {
      method: 'DELETE',
    });
    fetchWarnings();
  };

  const filtered = warnings.filter((w) => {
    if (filterStatus === 'ACTIVE') return w.isActive;
    if (filterStatus === 'REVOKED') return !w.isActive;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Warnings & Escalation</h1>
        <p className="text-sm text-gray-400 mt-1">
          Monitor active infractions, revoke resolved warnings, and manage automated escalation thresholds.
        </p>
      </div>

      {/* Escalation Rules Overview Card */}
      <Card className="p-6 bg-gradient-to-r from-amber-500/5 via-primary/5 to-transparent border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Active Warning Escalation Ladder</h3>
            <p className="text-xs text-gray-400">Enforced automatically when a user accumulates active strikes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 bg-secondary/50 rounded-xl border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-bold text-sm">
              3x
            </div>
            <div>
              <div className="text-xs font-bold text-white">1 Hour Timeout</div>
              <div className="text-[11px] text-gray-400">Automatic communication disable</div>
            </div>
          </div>

          <div className="p-3.5 bg-secondary/50 rounded-xl border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-sm">
              5x
            </div>
            <div>
              <div className="text-xs font-bold text-white">24 Hour Timeout</div>
              <div className="text-[11px] text-gray-400">Extended disciplinary mute</div>
            </div>
          </div>

          <div className="p-3.5 bg-secondary/50 rounded-xl border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm">
              7x
            </div>
            <div>
              <div className="text-xs font-bold text-white">Permanent Ban</div>
              <div className="text-[11px] text-gray-400">Auto guild ejection & ban entry</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchWarnings()}
              placeholder="Filter by Discord User ID..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-secondary rounded-lg border border-border self-start sm:self-auto">
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                filterStatus === 'ACTIVE' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Active Strikes ({warnings.filter((w) => w.isActive).length})
            </button>
            <button
              onClick={() => setFilterStatus('REVOKED')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                filterStatus === 'REVOKED' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Revoked ({warnings.filter((w) => !w.isActive).length})
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                filterStatus === 'ALL' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </Card>

      {/* Warnings List Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Infraction Warnings ({filtered.length})</span>
          </CardTitle>
        </CardHeader>

        {loading ? (
          <div className="py-16 text-center text-gray-500 text-sm">Loading warning records...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">No warnings recorded matching current view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-border bg-secondary/30">
                <tr>
                  <th className="py-3 px-4">Strike #</th>
                  <th className="py-3 px-4">Target User</th>
                  <th className="py-3 px-4">Enforcing Moderator</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date Issued</th>
                  <th className="py-3 px-4 text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">#{w.warningNumber}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{w.userTag}</div>
                      <div className="text-[11px] font-mono text-gray-500">{w.userId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-300">{w.moderatorTag}</div>
                      <div className="text-[11px] font-mono text-gray-500">{w.moderatorId}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-gray-300">{w.reason}</td>
                    <td className="py-3.5 px-4">
                      {w.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                          <CheckCircle className="w-3 h-3" /> Revoked
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-400 whitespace-nowrap">
                      {new Date(w.createdAt).toLocaleDateString()} {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {w.isActive ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevokeWarning(w.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revoke Strike
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-500 italic">Dismissed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
