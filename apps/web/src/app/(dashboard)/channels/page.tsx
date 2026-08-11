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
  const [requestChannelId, setRequestChannelId] = useState<string>('');
  const [reviewChannelId, setReviewChannelId] = useState<string>('');
  const [logsChannelId, setLogsChannelId] = useState<string>('');
  const [modLogChannelId, setModLogChannelId] = useState<string>('');
  const [voiceLogsChannelId, setVoiceLogsChannelId] = useState<string>('');
  const [messageLogsChannelId, setMessageLogsChannelId] = useState<string>('');
  const [generalLogsChannelId, setGeneralLogsChannelId] = useState<string>('');
  const [alertLogsChannelId, setAlertLogsChannelId] = useState<string>('');
  const [commandLogsChannelId, setCommandLogsChannelId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/guilds/${guildId}/channels`)
      .then((res) => res.json())
      .then((data) => {
        if (data.discordChannels) setChannels(data.discordChannels);
        if (data.config) {
          setRequestChannelId(data.config.requestChannelId || '');
          setReviewChannelId(data.config.reviewChannelId || '');
          setLogsChannelId(data.config.logsChannelId || '');
          setModLogChannelId(data.config.modLogChannelId || '');
          setVoiceLogsChannelId(data.config.voiceLogsChannelId || '');
          setMessageLogsChannelId(data.config.messageLogsChannelId || '');
          setGeneralLogsChannelId(data.config.generalLogsChannelId || '');
          setAlertLogsChannelId(data.config.alertLogsChannelId || '');
          setCommandLogsChannelId(data.config.commandLogsChannelId || '');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [guildId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    await fetch(`/api/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestChannelId: requestChannelId || null,
        reviewChannelId: reviewChannelId || null,
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
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Channel & Logging Integration</h1>
        <p className="text-sm text-gray-400 mt-1">
          Bind Discord text channels for applications, staff review, and dedicated multi-stream logs.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core System Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" /> Application & Core Channels
            </CardTitle>
          </CardHeader>

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Fetching Discord text channels...</div>
          ) : (
            <div className="space-y-6 p-6 pt-0">
              {/* Role Request Channel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Role Request Channel (Panel Host)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  The permanent application panel embed with the Apply button will be deployed into this channel.
                </p>
                <select
                  value={requestChannelId}
                  onChange={(e) => setRequestChannelId(e.target.value)}
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

              {/* Review Channel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Review Channel (Staff Inspection)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  All submitted role request applications will be posted into this private staff channel for review.
                </p>
                <select
                  value={reviewChannelId}
                  onChange={(e) => setReviewChannelId(e.target.value)}
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

              {/* Default Audit Logs Channel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Fallback Audit Logs Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  System events and fallbacks for unassigned log streams will post here.
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
            </div>
          )}
        </Card>

        {/* Multi-Stream Dedicated Event Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" /> Multi-Stream Dedicated Event Logs
            </CardTitle>
          </CardHeader>

          {loading ? null : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-0">
              {/* Voice Events */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-emerald-400" /> Voice Events Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">Voice channel joins, disconnects, and moves.</p>
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
                  <MessageSquare className="w-4 h-4 text-sky-400" /> Message Logs Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">Deleted and edited message text & attachments.</p>
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

              {/* AutoMod / Alerts */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Security & Alert Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">AutoMod blocked links, keyword rules, and triggers.</p>
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

              {/* Moderation Logs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" /> Timeouts & Bans Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">Member timeouts, bans, unbans, and kicks.</p>
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

              {/* Command Logs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-400" /> Command Execution Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">Slash command usage across the server.</p>
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
