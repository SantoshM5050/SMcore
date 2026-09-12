'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Radio, Save, Send, CheckCircle2, MessageSquare, MessagesSquare, AlertCircle } from 'lucide-react';
import { LogCategory, LogDestinationType, ForumThreadMode } from '@repo/database';
import { LogConfigItem } from '@/types';

interface DiscordChannelItem {
  id: string;
  name: string;
  type: number;
}

const CATEGORY_META: Record<LogCategory, { label: string; desc: string; color: string }> = {
  [LogCategory.MEMBER]: { label: 'Member Events', desc: 'Joins, leaves, nickname edits, avatar updates', color: 'text-emerald-400' },
  [LogCategory.MODERATION]: { label: 'Moderation Enforcement', desc: 'Bans, kicks, timeouts, warns, unbans', color: 'text-rose-400' },
  [LogCategory.VOICE]: { label: 'Voice Activity', desc: 'Channel connects, disconnects, moves, deafen', color: 'text-purple-400' },
  [LogCategory.CHANNEL]: { label: 'Channel Mutations', desc: 'Creations, deletions, permission & slowmode edits', color: 'text-blue-400' },
  [LogCategory.ROLE]: { label: 'Role Changes', desc: 'Role assignments, creations, deletions, perm edits', color: 'text-indigo-400' },
  [LogCategory.MESSAGE]: { label: 'Message Lifecycle', desc: 'Message edits, deletions, purge actions', color: 'text-amber-400' },
  [LogCategory.SERVER]: { label: 'Server & Security', desc: 'Server name/icon updates, invite tracking, raids', color: 'text-cyan-400' },
};

export default function LogsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [configs, setConfigs] = useState<LogConfigItem[]>([]);
  const [channels, setChannels] = useState<DiscordChannelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchLogConfigs = () => {
    if (!guildId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/guilds/${guildId}/logs`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/channels`).then((res) => res.json()).catch(() => []),
    ])
      .then(([logData, channelData]) => {
        if (Array.isArray(logData)) setConfigs(logData);
        if (Array.isArray(channelData)) setChannels(channelData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogConfigs();
  }, [guildId]);

  const updateConfig = (category: LogCategory, patch: Partial<LogConfigItem>) => {
    setConfigs((prev) =>
      prev.map((c) => (c.category === category ? { ...c, ...patch } : c))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/guilds/${guildId}/logs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configs),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (category: LogCategory, channelId?: string | null) => {
    if (!channelId) {
      setTestResult(`Please select a destination channel for ${category} first.`);
      setTimeout(() => setTestResult(null), 4000);
      return;
    }

    try {
      const res = await fetch(`/api/guilds/${guildId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, channelId }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult(`✅ Test log sent successfully for ${category}!`);
      } else {
        setTestResult(`❌ Failed to send test log: ${data.error}`);
      }
      setTimeout(() => setTestResult(null), 4000);
    } catch (err: any) {
      setTestResult(`❌ Error sending test: ${err.message}`);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Log Routing & Forum System</h1>
          <p className="text-sm text-gray-400 mt-1">
            Route 7 granular event categories to dedicated Text Channels or auto-managed Discord Forum Channels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> Routing Saved
            </span>
          )}
          <Button type="submit" variant="primary" disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {testResult && (
        <div className="p-3 bg-secondary/80 border border-border rounded-lg text-xs font-semibold text-white flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-primary" /> {testResult}
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-gray-500 text-sm">Loading log configurations...</div>
      ) : (
        <div className="space-y-4">
          {configs.map((cfg) => {
            const meta = CATEGORY_META[cfg.category] || {
              label: cfg.category,
              desc: 'Custom logs',
              color: 'text-primary',
            };

            const isForum = cfg.destinationType === LogDestinationType.FORUM_CHANNEL;

            return (
              <Card key={cfg.category} className="p-5 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Category Title & Toggle */}
                  <div className="flex items-start gap-3 min-w-[260px]">
                    <label className="relative inline-flex items-center cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) => updateConfig(cfg.category, { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm text-white`}>{meta.label}</span>
                        <Badge variant="default" className="text-[10px]">
                          {cfg.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{meta.desc}</p>
                    </div>
                  </div>

                  {/* Channel & Destination Type Selectors */}
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Destination Type Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => updateConfig(cfg.category, { destinationType: LogDestinationType.TEXT_CHANNEL })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          !isForum ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Text
                      </button>
                      <button
                        type="button"
                        onClick={() => updateConfig(cfg.category, { destinationType: LogDestinationType.FORUM_CHANNEL })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          isForum ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <MessagesSquare className="w-3.5 h-3.5" /> Forum
                      </button>
                    </div>

                    {/* Discord Channel Dropdown */}
                    <select
                      value={cfg.channelId || ''}
                      onChange={(e) => updateConfig(cfg.category, { channelId: e.target.value || null })}
                      className="bg-input border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
                    >
                      <option value="">Select target channel...</option>
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.name} ({ch.type === 15 ? 'Forum' : 'Text'})
                        </option>
                      ))}
                    </select>

                    {/* Forum Thread Mode Dropdown (only when FORUM_CHANNEL is selected) */}
                    {isForum && (
                      <select
                        value={cfg.forumThreadMode}
                        onChange={(e) => updateConfig(cfg.category, { forumThreadMode: e.target.value as ForumThreadMode })}
                        className="bg-input border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="CATEGORY">Category Thread (Reusable)</option>
                        <option value="DAILY">Daily Thread (YYYY-MM-DD)</option>
                        <option value="EVENT_TYPE">Event Type Threads</option>
                        <option value="PER_CASE">Per Case Individual Thread</option>
                      </select>
                    )}
                  </div>

                  {/* Test Dispatch Button */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSendTest(cfg.category, cfg.channelId)}
                    className="gap-1.5 text-xs text-gray-400 hover:text-white hover:bg-secondary/60 self-start lg:self-auto"
                  >
                    <Send className="w-3.5 h-3.5" /> Test Log
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </form>
  );
}
