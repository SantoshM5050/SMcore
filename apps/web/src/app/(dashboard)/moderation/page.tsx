'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldAlert, UserX, Clock, AlertTriangle, Trash2, CheckCircle2, History } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ModerationPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [logs, setLogs] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAction, setSelectedAction] = useState<'BAN' | 'KICK' | 'TIMEOUT' | 'WARN' | 'PURGE'>('BAN');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUserTag, setTargetUserTag] = useState('');
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [channelId, setChannelId] = useState('');
  const [messageCount, setMessageCount] = useState('10');

  const [executing, setExecuting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchModLogs = () => {
    if (!guildId) return;
    setLoading(true);
    fetch(`/api/guilds/${guildId}/moderation`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setLogs(data); })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch(`/api/guilds/${guildId}/channels/list`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setChannels(data); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchModLogs();
  }, [guildId]);

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecuting(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          targetUserId,
          targetUserTag: targetUserTag || targetUserId,
          reason,
          durationMinutes: selectedAction === 'TIMEOUT' ? Number(durationMinutes) : null,
          channelId: selectedAction === 'PURGE' ? channelId : null,
          messageCount: selectedAction === 'PURGE' ? Number(messageCount) : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Moderation action (${selectedAction}) executed successfully!` });
        setTargetUserId('');
        setTargetUserTag('');
        setReason('');
        fetchModLogs();
      } else {
        setStatusMsg({ type: 'error', text: `Failed: ${data.error || data.errorDetail || 'Execution error'}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Execution error' });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase mb-1">
            <span>Module 4 • Discord Server Moderation Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Server Moderation Tools</h1>
          <p className="text-sm text-gray-400 mt-1">Execute moderation actions (Ban, Kick, Timeout, Warn, Purge) and inspect action logs.</p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 border rounded-xl text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Action Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'BAN', label: '🚫 Ban User', color: 'hover:border-red-500' },
          { id: 'KICK', label: '🥾 Kick User', color: 'hover:border-amber-500' },
          { id: 'TIMEOUT', label: '⏱️ Timeout / Mute', color: 'hover:border-blue-500' },
          { id: 'WARN', label: '⚠️ Warn User', color: 'hover:border-yellow-500' },
          { id: 'PURGE', label: '🧹 Purge Messages', color: 'hover:border-purple-500' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedAction(tab.id as any)}
            className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
              selectedAction === tab.id
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                : `bg-secondary/50 border-border/80 text-gray-300 ${tab.color}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quick Action Form */}
      <Card className="p-6 space-y-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-border/40 pb-3">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <span>Execute {selectedAction} Action</span>
        </h3>

        <form onSubmit={handleExecuteAction} className="space-y-4">
          {selectedAction !== 'PURGE' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  TARGET DISCORD USER ID *
                </label>
                <Input
                  required
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="e.g. 1280178101326708856"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  TARGET USERNAME / TAG (OPTIONAL)
                </label>
                <Input
                  value={targetUserTag}
                  onChange={(e) => setTargetUserTag(e.target.value)}
                  placeholder="e.g. santoshm5050"
                  className="text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  TARGET DISCORD CHANNEL *
                </label>
                {channels.length > 0 ? (
                  <select
                    required
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Select Channel --</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    required
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="Enter Channel ID"
                    className="text-xs"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  NUMBER OF MESSAGES TO PURGE (1-100) *
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={messageCount}
                  onChange={(e) => setMessageCount(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {selectedAction === 'TIMEOUT' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                TIMEOUT DURATION
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="10">10 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="1440">24 Hours (1 Day)</option>
                <option value="10080">7 Days (1 Week)</option>
              </select>
            </div>
          )}

          {selectedAction !== 'PURGE' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                MODERATION REASON
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Violation of server rules, spamming, disrespectful behavior"
                className="text-xs"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={executing}
              variant={selectedAction === 'BAN' ? 'danger' : 'primary'}
              size="md"
              className="font-bold"
            >
              {executing ? 'Executing...' : `Confirm & Execute ${selectedAction}`}
            </Button>
          </div>
        </form>
      </Card>

      {/* Moderation History Table */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <span>Recent Moderation Action Logs</span>
        </h3>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-xs">Loading moderation history...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">No moderation actions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-[10px] text-gray-400 uppercase tracking-wider font-extrabold">
                  <th className="py-3 px-3">ACTION</th>
                  <th className="py-3 px-3">TARGET USER</th>
                  <th className="py-3 px-3">MODERATOR</th>
                  <th className="py-3 px-3">REASON</th>
                  <th className="py-3 px-3">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3 px-3 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                          log.action === 'BAN'
                            ? 'bg-red-500/20 text-red-400'
                            : log.action === 'KICK'
                            ? 'bg-amber-500/20 text-amber-400'
                            : log.action === 'TIMEOUT'
                            ? 'bg-blue-500/20 text-blue-400'
                            : log.action === 'WARN'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {log.targetUserTag} <span className="text-[10px] text-gray-500">({log.targetUserId})</span>
                    </td>
                    <td className="py-3 px-3 text-gray-300">
                      @{log.moderatorTag}
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {log.reason || 'No reason specified'}
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-[11px]">
                      {formatDate(log.createdAt)}
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
