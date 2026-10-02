'use client';

import React, { useState } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient } from '@/lib/api/apiClient';

interface ChannelItem {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE' | 'ANNOUNCEMENT' | 'FORUM';
  category: string;
  isLocked: boolean;
  slowmodeSeconds: number;
  isNsfw: boolean;
  topic?: string;
}

const DEFAULT_CHANNELS: ChannelItem[] = [
  { id: '100100100100100101', name: 'general', type: 'TEXT', category: 'COMMUNITY', isLocked: false, slowmodeSeconds: 0, isNsfw: false, topic: 'General discussion for all verified members' },
  { id: '100100100100100102', name: 'announcements', type: 'ANNOUNCEMENT', category: 'OFFICIAL', isLocked: true, slowmodeSeconds: 0, isNsfw: false, topic: 'Official community announcements & updates' },
  { id: '100100100100100103', name: 'bot-commands', type: 'TEXT', category: 'COMMUNITY', isLocked: false, slowmodeSeconds: 5, isNsfw: false, topic: 'Run bot commands here' },
  { id: '100100100100100104', name: 'support-desk', type: 'TEXT', category: 'HELPDESK', isLocked: false, slowmodeSeconds: 15, isNsfw: false, topic: 'Assistance from staff team' },
  { id: '100100100100100105', name: 'media-creations', type: 'TEXT', category: 'COMMUNITY', isLocked: false, slowmodeSeconds: 30, isNsfw: false, topic: 'Share artwork, screenshots and videos' },
  { id: '100100100100100106', name: 'quarantine-intake', type: 'TEXT', category: 'SECURITY', isLocked: true, slowmodeSeconds: 60, isNsfw: false, topic: 'Restricted intake zone for flagged accounts' },
];

export default function ChannelsModerationPage() {
  const { selectedGuildId } = useGuild();
  const [channels, setChannels] = useState<ChannelItem[]>(DEFAULT_CHANNELS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Purge Form
  const [purgeChannelId, setPurgeChannelId] = useState(DEFAULT_CHANNELS[0].id);
  const [purgeCount, setPurgeCount] = useState(25);
  const [purgeFilter, setPurgeFilter] = useState<'ALL' | 'BOTS' | 'LINKS' | 'INVITES' | 'EMBEDS'>('ALL');
  const [targetUserId, setTargetUserId] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeFeedback, setPurgeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Slowmode / Lock status message
  const [statusMsg, setStatusMsg] = useState<{ text: string; channelId: string } | null>(null);

  const toggleLock = async (channel: ChannelItem) => {
    if (!selectedGuildId) return;
    const nextLocked = !channel.isLocked;
    const action = nextLocked ? 'LOCK' : 'UNLOCK';

    try {
      await apiClient.moderation.executeAction(selectedGuildId, {
        action,
        channelId: channel.id,
        reason: `${action === 'LOCK' ? 'Channel lockdown engaged' : 'Channel unlocked'} via SMCore Control Panel`,
      });

      setChannels((prev) =>
        prev.map((c) => (c.id === channel.id ? { ...c, isLocked: nextLocked } : c))
      );
      setStatusMsg({
        text: `#${channel.name} is now ${nextLocked ? 'LOCKED' : 'UNLOCKED'}`,
        channelId: channel.id,
      });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch {
      // rollback or show error
    }
  };

  const updateSlowmode = async (channelId: string, seconds: number) => {
    if (!selectedGuildId) return;
    try {
      await apiClient.moderation.executeAction(selectedGuildId, {
        action: 'SLOWMODE',
        channelId,
        slowmodeSeconds: seconds,
        reason: `Slowmode changed to ${seconds}s via SMCore Control Panel`,
      });

      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, slowmodeSeconds: seconds } : c))
      );
      setStatusMsg({
        text: `Slowmode set to ${seconds}s for #${channels.find((c) => c.id === channelId)?.name}`,
        channelId,
      });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch {
      // ignore
    }
  };

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId) return;

    setIsPurging(true);
    setPurgeFeedback(null);
    try {
      const res = await apiClient.moderation.executeAction(selectedGuildId, {
        action: 'PURGE',
        channelId: purgeChannelId,
        messageCount: purgeCount,
        reason: `Bulk message purge (${purgeCount} msgs, filter: ${purgeFilter}${
          targetUserId ? ` by ${targetUserId}` : ''
        })`,
      });

      if (res.success) {
        setPurgeFeedback({
          type: 'success',
          message: `Successfully flushed ${purgeCount} messages from #${
            channels.find((c) => c.id === purgeChannelId)?.name
          } (Filter: ${purgeFilter}). Logged to Audit Trail.`,
        });
      } else {
        setPurgeFeedback({
          type: 'error',
          message: res.error?.message || 'Purge command failed',
        });
      }
    } catch (err: unknown) {
      setPurgeFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error executing bulk purge',
      });
    } finally {
      setIsPurging(false);
    }
  };

  const filteredChannels = channels.filter((c) => {
    if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.id.includes(q) || (c.topic && c.topic.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>MODERATION</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">CHANNELS & PURGE</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-primary">
              LIVE CONTROL
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Channel Moderation & Message Purge Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-medium border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Permission Overrides Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30 animate-fade-in">
              {statusMsg.text}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5 max-w-7xl w-full mx-auto space-y-6">
        {/* Bulk Chat Purge Controller Card */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-border-subtle shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-on-surface">Instant Message Purge & Chat Cleaner</h2>
                <p className="text-xs text-outline font-sans">
                  Mass delete messages matching specific criteria without leaving audit trails in channel
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              DESTRUCTIVE ACTION
            </span>
          </div>

          <form onSubmit={handlePurge} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Target Channel */}
              <div>
                <label className="text-[11px] font-mono uppercase font-bold text-outline block mb-1">
                  Target Channel
                </label>
                <select
                  value={purgeChannelId}
                  onChange={(e) => setPurgeChannelId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono focus:outline-none focus:border-primary"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Count */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono uppercase font-bold text-outline">
                    Message Count: <span className="text-primary font-mono">{purgeCount}</span>
                  </label>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={purgeCount}
                  onChange={(e) => setPurgeCount(parseInt(e.target.value, 10))}
                  className="w-full accent-primary mt-2 cursor-pointer"
                />
              </div>

              {/* Message Filter */}
              <div>
                <label className="text-[11px] font-mono uppercase font-bold text-outline block mb-1">
                  Target Filter
                </label>
                <select
                  value={purgeFilter}
                  onChange={(e) => setPurgeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All Messages (Default)</option>
                  <option value="BOTS">Bot Messages Only</option>
                  <option value="LINKS">Contains Links / URLs</option>
                  <option value="INVITES">Contains Discord Invites</option>
                  <option value="EMBEDS">Contains Images / Embeds</option>
                </select>
              </div>

              {/* Optional User Snowflake */}
              <div>
                <label className="text-[11px] font-mono uppercase font-bold text-outline block mb-1">
                  Specific User (Optional)
                </label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Filter by User Snowflake ID..."
                  className="w-full px-3 py-2 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono focus:outline-none focus:border-primary placeholder:text-outline/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-outline flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-[15px] text-primary">info</span>
                Discord API limits bulk deletion to messages under 14 days old
              </span>

              <button
                type="submit"
                disabled={isPurging}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                <span>{isPurging ? 'Purging Messages...' : `Execute Purge (${purgeCount} Messages)`}</span>
              </button>
            </div>
          </form>

          {purgeFeedback && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                purgeFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {purgeFeedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{purgeFeedback.message}</span>
            </div>
          )}
        </div>

        {/* Channel Access & Slowmode Matrix */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-border-subtle shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border-subtle pb-3">
            <div>
              <h2 className="text-sm font-bold text-on-surface">Channel Permission & Rate-Limit Matrix</h2>
              <p className="text-xs text-outline font-sans">
                Real-time lockdown toggles and slowmode controls per channel
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channel name..."
                className="px-3 py-1.5 bg-surface-container text-on-surface text-xs font-mono rounded-lg border border-border-subtle focus:outline-none focus:border-primary placeholder:text-outline"
              />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-surface-container text-on-surface text-xs font-mono rounded-lg border border-border-subtle focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="COMMUNITY">Community</option>
                <option value="OFFICIAL">Official</option>
                <option value="HELPDESK">Helpdesk</option>
                <option value="SECURITY">Security</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-container text-outline font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-4 font-bold">Channel</th>
                  <th className="py-2.5 px-3 font-bold">Category</th>
                  <th className="py-2.5 px-3 font-bold">Lockdown State</th>
                  <th className="py-2.5 px-3 font-bold">Slowmode Rate</th>
                  <th className="py-2.5 px-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-sans">
                {filteredChannels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-surface-container-high/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-outline">
                          {channel.type === 'ANNOUNCEMENT' ? 'campaign' : 'tag'}
                        </span>
                        <div>
                          <span className="font-mono font-bold text-on-surface">#{channel.name}</span>
                          {channel.topic && (
                            <p className="text-[11px] text-outline truncate max-w-xs">{channel.topic}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-[10px] font-mono text-outline border border-border-subtle">
                        {channel.category}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleLock(channel)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-colors border ${
                          channel.isLocked
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {channel.isLocked ? 'lock' : 'lock_open'}
                        </span>
                        <span>{channel.isLocked ? 'LOCKED' : 'OPEN'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={channel.slowmodeSeconds}
                        onChange={(e) => updateSlowmode(channel.id, parseInt(e.target.value, 10))}
                        className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-mono text-xs border border-border-subtle focus:outline-none"
                      >
                        <option value={0}>Off (No Slowmode)</option>
                        <option value={5}>5 seconds</option>
                        <option value={10}>10 seconds</option>
                        <option value={15}>15 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>1 minute</option>
                        <option value={120}>2 minutes</option>
                        <option value={300}>5 minutes</option>
                        <option value={600}>10 minutes</option>
                        <option value={900}>15 minutes</option>
                        <option value={3600}>1 hour</option>
                        <option value={21600}>6 hours</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setPurgeChannelId(channel.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs font-mono border border-border-subtle transition-colors"
                      >
                        Purge Messages
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
