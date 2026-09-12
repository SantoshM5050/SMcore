'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Hash, Check, Save, Volume2, MessageSquare, AlertTriangle, ShieldAlert, Terminal, Layers } from 'lucide-react';

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export default function ChannelsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [logsChannelId, setLogsChannelId] = useState<string>('');
  const [modLogChannelId, setModLogChannelId] = useState<string>('');
  const [voiceLogsChannelId, setVoiceLogsChannelId] = useState<string>('');
  const [messageLogsChannelId, setMessageLogsChannelId] = useState<string>('');
  const [generalLogsChannelId, setGeneralLogsChannelId] = useState<string>('');
  const [alertLogsChannelId, setAlertLogsChannelId] = useState<string>('');
  const [commandLogsChannelId, setCommandLogsChannelId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchChannels = () => {
    if (!guildId) return;
    setLoading(true);
    fetch(`/api/guilds/${guildId}/channels`)
      .then((res) => res.json())
      .then((data) => {
        const chs = Array.isArray(data)
          ? data
          : data && Array.isArray(data.discordChannels)
          ? data.discordChannels
          : data && Array.isArray(data.channels)
          ? data.channels
          : [];
        setChannels(chs);

        const cfg = data.config || (!Array.isArray(data) ? data : null);
        if (cfg) {
          setLogsChannelId(cfg.logsChannelId || '');
          setModLogChannelId(cfg.modLogChannelId || '');
          setVoiceLogsChannelId(cfg.voiceLogsChannelId || '');
          setMessageLogsChannelId(cfg.messageLogsChannelId || '');
          setGeneralLogsChannelId(cfg.generalLogsChannelId || '');
          setAlertLogsChannelId(cfg.alertLogsChannelId || '');
          setCommandLogsChannelId(cfg.commandLogsChannelId || '');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setLoading(false);
        setSyncing(false);
      });
  };

  useEffect(() => {
    fetchChannels();
  }, [guildId]);

  const handleSync = () => {
    setSyncing(true);
    fetchChannels();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    await fetch(`/api/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logsChannelId: logsChannelId || null,
        modLogChannelId: modLogChannelId || null,
        voiceLogsChannelId: voiceLogsChannelId || null,
        messageLogsChannelId: messageLogsChannelId || null,
        generalLogsChannelId: generalLogsChannelId || null,
        alertLogsChannelId: alertLogsChannelId || null,
        commandLogsChannelId: commandLogsChannelId || null,
      }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Channel & Logging Integration</h1>
          <p className="text-sm text-gray-400 mt-1">
            Bind Discord text channels for server audit trails and dedicated multi-stream logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-secondary/80 border border-border text-emerald-400">
            {channels.length} Channels Synced
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loading}
            className="text-xs font-bold gap-1.5"
          >
            {syncing ? 'Syncing...' : '🔄 Sync from Discord'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core System Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" /> Multi-Stream Log Channels
            </CardTitle>
          </CardHeader>

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Fetching Discord text channels...</div>
          ) : (
            <div className="space-y-6 p-6 pt-0">
              {/* Default Audit Logs Channel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Fallback Audit Logs Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Catch-all log channel used when specific category channels are not mapped.
                </p>
                <select
                  value={logsChannelId}
                  onChange={(e) => setLogsChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a channel...</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Moderation Logs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> Moderation Log Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">Bans, kicks, timeouts, warnings, and purges.</p>
                <select
                  value={modLogChannelId}
                  onChange={(e) => setModLogChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Use Fallback Audit Channel</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Logs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-purple-400" /> Voice State Activity Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">Voice joins, leaves, and channel moves.</p>
                <select
                  value={voiceLogsChannelId}
                  onChange={(e) => setVoiceLogsChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Use Fallback Audit Channel</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Logs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-400" /> Message Updates & Deletions Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">Message edits and message deletion logs.</p>
                <select
                  value={messageLogsChannelId}
                  onChange={(e) => setMessageLogsChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Use Fallback Audit Channel</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Security & AutoMod */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> AutoMod & Security Alerts Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">AutoMod blocked messages, spam, and keyword violations.</p>
                <select
                  value={alertLogsChannelId}
                  onChange={(e) => setAlertLogsChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Use Fallback Audit Channel</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Command Execution */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" /> Command Execution Audit Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">Audit trail of slash commands executed by staff and members.</p>
                <select
                  value={commandLogsChannelId}
                  onChange={(e) => setCommandLogsChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Use Fallback Audit Channel</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* General Server Logs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-cyan-400" /> Server Structure Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">Role updates, channel creations, and server edits.</p>
                <select
                  value={generalLogsChannelId}
                  onChange={(e) => setGeneralLogsChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Use Fallback Audit Channel</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-border flex items-center justify-between p-6">
            {saved && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Multi-channel log integration saved!
              </span>
            )}
            {!saved && <div />}
            <Button type="submit" variant="primary" className="gap-2">
              <Save className="w-4 h-4" /> Save All Channels
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
