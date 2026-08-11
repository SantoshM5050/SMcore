'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Trophy,
  Plus,
  Zap,
  Calendar,
  Users,
  Lock,
  Unlock,
  Trash2,
  Send,
  RotateCcw,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Search,
  Copy,
  Check,
  Filter,
  Eye,
  Hash,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Participant {
  id: string;
  userId: string;
  userTag: string;
  roleType: 'MAIN_TEAM' | 'SUBSTITUTE';
  joinedAt: string;
}

interface EventSignup {
  id: string;
  guildId: string;
  title: string;
  description: string | null;
  eventTime: string | null;
  maxMainTeam: number;
  maxSubstitutes: number;
  channelId: string;
  messageId: string | null;
  scheduledAt: string | null;
  closeAt: string | null;
  autoCloseMinutes: number | null;
  isRecurring: boolean;
  recurringIntervalHours: number | null;
  dailyTimeSlots: string | null;
  embedColor: string;
  status: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  participants: Participant[];
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

const COLOR_PRESETS = [
  { name: 'Flame Red', hex: '#E74C3C' },
  { name: 'Electric Blue', hex: '#3498DB' },
  { name: 'Emerald Green', hex: '#2ECC71' },
  { name: 'Royal Purple', hex: '#9B59B6' },
  { name: 'Gold / Yellow', hex: '#F1C40F' },
  { name: 'Vibrant Orange', hex: '#E67E22' },
  { name: 'Neon Pink', hex: '#E91E63' },
];

export default function EventSignupsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [events, setEvents] = useState<EventSignup[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<{ roleId: string; roleName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'SCHEDULED' | 'CLOSED'>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  // Copy state
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // Single Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    title: 'Informal Signup',
    description: 'Register for Informal {time}',
    eventTime: '',
    maxMainTeam: 10,
    maxSubstitutes: 5,
    channelId: '',
    pingRoleId: '',
    embedColor: '#E74C3C',
    scheduledAt: '',
    autoCloseMinutes: 35,
    isRecurring: true,
    scheduleType: 'now' as 'now' | 'scheduled' | 'recurring',
    recurringType: 'interval' as 'interval' | 'daily_slots',
    recurringIntervalHours: 1,
    dailyTime1: '19:40',
    dailyTime2: '20:10',
    dailyTime3: '20:40',
    customDailyTimeSlots: '19:40, 20:10, 20:40',
    postNow: true,
  });

  const [eventTimePicker, setEventTimePicker] = useState<string>('19:40');

  // Batch Modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchData, setBatchData] = useState({
    baseTitle: 'Informal Signup',
    startHour: 18,
    intervalMinutes: 30,
    count: 8,
    maxMainTeam: 10,
    maxSubstitutes: 5,
    channelId: '',
    embedColor: '#E74C3C',
    autoCloseMinutes: 35,
  });

  useEffect(() => {
    if (guildId) {
      setFormData((prev) => ({ ...prev, channelId: '' }));
      setBatchData((prev) => ({ ...prev, channelId: '' }));
      fetchEvents();
      fetchChannels();
      fetchRoles();
    }
  }, [guildId]);

  useEffect(() => {
    if (channels.length > 0) {
      setFormData((prev) => (prev.channelId ? prev : { ...prev, channelId: channels[0].id }));
      setBatchData((prev) => (prev.channelId ? prev : { ...prev, channelId: channels[0].id }));
    }
  }, [channels]);

  const fetchEvents = async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/events`);
      if (!res.ok) throw new Error('Failed to fetch event signups');
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Error loading event signups');
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels`);
      if (res.ok) {
        const data = await res.json();
        const rawChannels = Array.isArray(data) ? data : data.discordChannels || [];
        setChannels(rawChannels.filter((c: any) => c.type === 0 || c.type === undefined));
      }
    } catch (err) {
      console.warn('Could not load channels:', err);
    }
  };

  const fetchRoles = async () => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setRoles(data);
      }
    } catch (err) {
      console.warn('Could not load roles:', err);
    }
  };

  // Metrics overview calculations
  const totalEvents = events.length;
  const openEvents = useMemo(() => events.filter((e) => e.status === 'OPEN').length, [events]);
  const scheduledEvents = useMemo(() => events.filter((e) => e.status === 'SCHEDULED').length, [events]);
  const totalRegisteredPlayers = useMemo(
    () => events.reduce((acc, e) => acc + (e.participants?.length || 0), 0),
    [events]
  );

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Status filter
      if (statusFilter !== 'ALL' && event.status !== statusFilter) return false;

      // Channel filter
      if (channelFilter !== 'ALL' && event.channelId !== channelFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesDesc = (event.description || '').toLowerCase().includes(q);
        const matchesChannel = (channels.find((c) => c.id === event.channelId)?.name || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesChannel) return false;
      }

      return true;
    });
  }, [events, statusFilter, channelFilter, searchQuery, channels]);

  const applyQuickTimePreset = (minutesToAdd: number | 'next_top_hour' | 'informal_40') => {
    const now = new Date();
    if (minutesToAdd === 'next_top_hour') {
      now.setHours(now.getHours() + 1, 0, 0, 0);
    } else if (minutesToAdd === 'informal_40') {
      if (now.getMinutes() >= 40) {
        now.setHours(now.getHours() + 1);
      }
      now.setMinutes(40, 0, 0);
    } else {
      now.setMinutes(now.getMinutes() + minutesToAdd);
    }
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    setEventTimePicker(timeStr);
    const base = (formData.description || 'Register for Informal')
      .replace(/\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/g, '')
      .replace(/\{time\}/g, '')
      .trim();

    setFormData((prev) => ({
      ...prev,
      eventTime: timeStr,
      description: `${base} ${timeStr}`.trim(),
    }));
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      title: 'Informal Signup',
      description: 'Register for Informal {time}',
      eventTime: '',
      maxMainTeam: 10,
      maxSubstitutes: 5,
      channelId: channels.length > 0 ? channels[0].id : '',
      embedColor: '#E74C3C',
      pingRoleId: '',
      scheduleType: 'now',
      scheduledAt: '',
      autoCloseMinutes: 35,
      isRecurring: true,
      recurringType: 'interval',
      recurringIntervalHours: 1,
      dailyTime1: '19:40',
      dailyTime2: '20:10',
      dailyTime3: '20:40',
      customDailyTimeSlots: '',
      postNow: true,
    });
    setEventTimePicker('');
    setShowCreateModal(true);
  };

  const openEditModal = (event: any) => {
    setEditingEvent(event);
    const isRec = Boolean(event.isRecurring);
    setFormData({
      title: event.title || 'Informal Signup',
      description: event.description || '',
      eventTime: event.eventTime || '',
      maxMainTeam: event.maxMainTeam || 10,
      maxSubstitutes: event.maxSubstitutes || 5,
      channelId: event.channelId || (channels.length > 0 ? channels[0].id : ''),
      embedColor: event.embedColor || '#E74C3C',
      pingRoleId: event.pingRoleId || '',
      scheduleType: isRec ? 'recurring' : 'now',
      scheduledAt: event.scheduledAt ? new Date(event.scheduledAt).toISOString().slice(0, 16) : '',
      autoCloseMinutes: event.autoCloseMinutes || 35,
      isRecurring: isRec,
      recurringType: (event.recurringIntervalHours ? 'interval' : 'daily_slots') as 'interval' | 'daily_slots',
      recurringIntervalHours: event.recurringIntervalHours || 1,
      dailyTime1: '19:40',
      dailyTime2: '20:10',
      dailyTime3: '20:40',
      customDailyTimeSlots: event.dailyTimeSlots || '',
      postNow: true,
    });
    setEventTimePicker(event.eventTime || '');
    setShowCreateModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId || !formData.channelId) {
      alert('Please select a target Discord channel.');
      return;
    }
    setIsSubmitting(true);
    try {
      const isRecurring = formData.scheduleType === 'recurring';
      let recurringIntervalHours: number | null = null;
      let dailyTimeSlots: string | null = null;

      if (isRecurring) {
        if (formData.recurringType === 'interval') {
          recurringIntervalHours = Number(formData.recurringIntervalHours) || 1;
        } else {
          dailyTimeSlots =
            formData.customDailyTimeSlots.trim() ||
            [formData.dailyTime1, formData.dailyTime2, formData.dailyTime3].filter(Boolean).join(',');
        }
      }

      const scheduledISO =
        formData.scheduledAt && !isNaN(new Date(formData.scheduledAt).getTime())
          ? new Date(formData.scheduledAt).toISOString()
          : null;

      const hasFutureSchedule = Boolean(scheduledISO && new Date(scheduledISO) > new Date());
      const postNow = formData.scheduleType === 'now' || (formData.scheduleType === 'recurring' && !hasFutureSchedule);

      const isEdit = Boolean(editingEvent);
      const url = isEdit ? `/api/guilds/${guildId}/events/${editingEvent.id}` : `/api/guilds/${guildId}/events`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduledAt: scheduledISO,
          maxMainTeam: Number(formData.maxMainTeam),
          maxSubstitutes: Number(formData.maxSubstitutes),
          autoCloseMinutes: Number(formData.autoCloseMinutes),
          isRecurring,
          recurringIntervalHours,
          dailyTimeSlots,
          postNow,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let errMsg = isEdit ? 'Failed to update event' : 'Failed to create event';
        try {
          const errJson = JSON.parse(text);
          errMsg = errJson.error || errMsg;
        } catch {
          errMsg = text || errMsg;
        }
        throw new Error(errMsg);
      }
      setShowCreateModal(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to process event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId || !batchData.channelId) {
      alert('Please select a target Discord channel.');
      return;
    }
    setIsSubmitting(true);

    try {
      const generatedEvents = [];
      let currentHour = batchData.startHour;
      let currentMin = 0;

      for (let i = 0; i < batchData.count; i++) {
        const hourStr = String(currentHour).padStart(2, '0');
        const minStr = String(currentMin).padStart(2, '0');
        const timeLabel = `${hourStr}:${minStr}`;

        generatedEvents.push({
          title: `${batchData.baseTitle} ${timeLabel}`,
          description: `Register for ${batchData.baseTitle} ${timeLabel}`,
          maxMainTeam: Number(batchData.maxMainTeam),
          maxSubstitutes: Number(batchData.maxSubstitutes),
          channelId: batchData.channelId,
          embedColor: batchData.embedColor,
          autoCloseMinutes: Number(batchData.autoCloseMinutes),
          isRecurring: true,
          dailyTimeSlots: timeLabel,
          postNow: true,
        });

        currentMin += batchData.intervalMinutes;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }

      const res = await fetch(`/api/guilds/${guildId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: generatedEvents }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = 'Failed to create batch events';
        try {
          const errJson = JSON.parse(text);
          errMsg = errJson.error || errMsg;
        } catch {
          errMsg = text || errMsg;
        }
        throw new Error(errMsg);
      }

      setShowBatchModal(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to create batch events');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (eventId: string) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/events/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status' }),
      });
      if (res.ok) fetchEvents();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleClearParticipants = async (eventId: string) => {
    if (!confirm('Are you sure you want to clear all registered Main Team and Substitutes?')) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/events/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      if (res.ok) fetchEvents();
    } catch (err) {
      console.error('Clear error:', err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event signup?')) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/events/${eventId}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchEvents();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const copyRosterToClipboard = (event: EventSignup) => {
    const mainTeam = event.participants.filter((p) => p.roleType === 'MAIN_TEAM');
    const subs = event.participants.filter((p) => p.roleType === 'SUBSTITUTE');

    let text = `🏆 **${event.title}** - Roster\n\n`;
    text += `🔥 **Main Team (${mainTeam.length}/${event.maxMainTeam})**:\n`;
    if (mainTeam.length === 0) {
      text += `None\n`;
    } else {
      mainTeam.forEach((p, idx) => {
        text += `${idx + 1}. @${p.userTag}\n`;
      });
    }

    text += `\n🪑 **Substitutes (${subs.length}/${event.maxSubstitutes})**:\n`;
    if (subs.length === 0) {
      text += `None\n`;
    } else {
      subs.forEach((p, idx) => {
        text += `${idx + 1}. @${p.userTag}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedEventId(event.id);
    setTimeout(() => setCopiedEventId(null), 2500);
  };

  if (!guildId) {
    return (
      <div className="p-8 text-center text-gray-400">
        Please select a Discord server from the top bar to manage event signups.
      </div>
    );
  }

  // Calculated Preview text for Live Discord Embed Modal
  const previewTime = formData.eventTime || eventTimePicker || '19:40';
  const previewDescription = (formData.description || 'Register for Informal {time}')
    .replace(/\{time\}/gi, previewTime)
    .replace(/\{time_slot\}/gi, previewTime);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-card via-card/90 to-primary/10 border border-border/80 p-6 md:p-8 rounded-3xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold tracking-wider uppercase mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>Event Signup Engine</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Discord Scrims & Event Signups</h1>
            <p className="text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
              Create dynamic Discord event embeds, set main team & substitute roster limits, auto-close timers, and manage rosters live.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowBatchModal(true)}
              className="border-purple-500/40 text-purple-300 hover:bg-purple-500/15 flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Batch Generator</span>
            </Button>

            <Button
              onClick={openCreateModal}
              className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event Signup</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card/80 border border-border/70 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:border-primary/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalEvents}</div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Signups</div>
          </div>
        </div>

        <div className="bg-card/80 border border-border/70 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{openEvents}</div>
            <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Active Open</div>
          </div>
        </div>

        <div className="bg-card/80 border border-border/70 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:border-amber-500/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{scheduledEvents}</div>
            <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Scheduled</div>
          </div>
        </div>

        <div className="bg-card/80 border border-border/70 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:border-purple-500/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalRegisteredPlayers}</div>
            <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Registered Players</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border/80 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-secondary/50 border border-border/60 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-secondary/70'
            }`}
          >
            All ({events.length})
          </button>
          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'OPEN'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-400 hover:text-emerald-400 hover:bg-secondary/70'
            }`}
          >
            🟢 Active Open ({openEvents})
          </button>
          <button
            onClick={() => setStatusFilter('SCHEDULED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'SCHEDULED'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-gray-400 hover:text-amber-400 hover:bg-secondary/70'
            }`}
          >
            ⏰ Scheduled ({scheduledEvents})
          </button>
          <button
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'CLOSED'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-gray-400 hover:text-rose-400 hover:bg-secondary/70'
            }`}
          >
            🔒 Closed ({events.filter((e) => e.status === 'CLOSED').length})
          </button>
        </div>

        {/* Search & Channel Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Channel Selector Filter */}
          {channels.length > 0 && (
            <div className="relative min-w-[150px]">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="w-full bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary font-medium"
              >
                <option value="ALL">All Channels</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search signups..."
              className="w-full bg-secondary/60 border border-border/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvents}
            title="Refresh Signups"
            className="p-2 border-border text-gray-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="bg-card border border-border/80 p-16 text-center rounded-3xl text-gray-400 space-y-3 shadow-xl">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-300">Loading Discord event signups...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl text-red-400 text-sm font-semibold flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-6 h-6 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Events Grid Empty State */}
      {!loading && !error && filteredEvents.length === 0 && (
        <div className="bg-card border border-dashed border-border/80 p-16 text-center rounded-3xl space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Event Signups Found</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            {events.length === 0
              ? 'Create your first event signup or generate batch signups to start accepting registrations from Discord!'
              : 'No signups match your active search filters. Try resetting the status or channel filters.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            {events.length > 0 && (
              <Button
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearchQuery('');
                  setChannelFilter('ALL');
                }}
                variant="outline"
                className="rounded-xl font-semibold"
              >
                Clear Filters
              </Button>
            )}
            <Button onClick={() => setShowBatchModal(true)} variant="outline" className="rounded-xl font-semibold border-purple-500/40 text-purple-300">
              Batch Generator
            </Button>
            <Button onClick={openCreateModal} className="rounded-xl font-semibold">
              Create Single Event
            </Button>
          </div>
        </div>
      )}

      {/* Redesigned Events Grid */}
      {!loading && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const mainParticipants = event.participants.filter((p) => p.roleType === 'MAIN_TEAM');
            const subParticipants = event.participants.filter((p) => p.roleType === 'SUBSTITUTE');

            const mainRatio = Math.min(100, Math.round((mainParticipants.length / event.maxMainTeam) * 100));

            const isOpen = event.status === 'OPEN';
            const isClosed = event.status === 'CLOSED';
            const isScheduled = event.status === 'SCHEDULED';
            const channelObj = channels.find((c) => c.id === event.channelId);

            return (
              <div
                key={event.id}
                className="bg-card/95 border border-border/80 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-primary/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-primary/5"
              >
                {/* Embed Color Accent Top Bar */}
                <div
                  className="h-2.5 w-full transition-all"
                  style={{ backgroundColor: event.embedColor || '#E74C3C' }}
                />

                <div className="p-6 space-y-5 flex-1">
                  {/* Title & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <h3 className="text-lg font-bold text-white leading-snug group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>
                      </div>
                      {event.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {event.description.replace(/\{time\}/gi, event.eventTime || '')}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isOpen ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          OPEN
                        </span>
                      ) : isScheduled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[11px] font-bold tracking-wider">
                          <Clock className="w-3 h-3" />
                          SCHEDULED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[11px] font-bold tracking-wider">
                          <Lock className="w-3 h-3" />
                          CLOSED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Team Roster & Fill Progress Bar */}
                  <div className="bg-secondary/40 border border-border/50 p-4 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-400 flex items-center gap-1.5">
                        🔥 Main Team
                      </span>
                      <span className="text-gray-300 font-mono bg-background/80 px-2 py-0.5 rounded-md text-[11px]">
                        {mainParticipants.length} / {event.maxMainTeam} ({mainRatio}%)
                      </span>
                    </div>

                    {/* Progress Fill Bar */}
                    <div className="w-full bg-secondary/80 h-2 rounded-full overflow-hidden p-0.5 border border-border/40">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${mainRatio}%` }}
                      />
                    </div>

                    {/* Main Team Member Pills */}
                    {mainParticipants.length === 0 ? (
                      <div className="text-xs text-gray-500 italic pt-1">No players registered yet</div>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 pt-1 scrollbar-thin">
                        {mainParticipants.map((p, idx) => (
                          <div
                            key={p.id}
                            className="text-xs text-gray-200 bg-background/70 px-3 py-1.5 rounded-xl border border-border/40 flex items-center justify-between"
                          >
                            <span className="font-mono text-purple-300 font-semibold truncate max-w-[180px]">
                              <span className="text-gray-500 font-bold mr-1.5">#{idx + 1}</span>
                              @{p.userTag}
                            </span>
                            <span className="text-[10px] text-gray-500">Main</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Substitutes Roster Section */}
                  <div className="bg-secondary/20 border border-border/40 p-3.5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                      <span className="flex items-center gap-1.5">🪑 Substitutes</span>
                      <span className="font-mono text-[11px] text-gray-400">
                        {subParticipants.length} / {event.maxSubstitutes}
                      </span>
                    </div>

                    {subParticipants.length === 0 ? (
                      <div className="text-xs text-gray-500 italic">None</div>
                    ) : (
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {subParticipants.map((p, idx) => (
                          <div
                            key={p.id}
                            className="text-xs text-gray-400 bg-background/40 px-2.5 py-1 rounded-lg flex items-center justify-between"
                          >
                            <span className="font-mono truncate">Sub #{idx + 1} @{p.userTag}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Schedule & Auto-Close Badges */}
                  {(event.scheduledAt || event.closeAt || event.isRecurring) && (
                    <div className="bg-purple-500/10 border border-purple-500/25 p-3 rounded-2xl text-xs space-y-1.5 text-purple-300 font-medium">
                      {event.scheduledAt && isScheduled && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Posting time: <strong>{new Date(event.scheduledAt).toLocaleString()}</strong></span>
                        </div>
                      )}

                      {event.isRecurring && event.recurringIntervalHours && (
                        <div className="flex items-center gap-2 text-purple-300">
                          <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>Auto-Repeat: <strong>Every {event.recurringIntervalHours} hr(s)</strong></span>
                        </div>
                      )}

                      {event.isRecurring && event.dailyTimeSlots && (
                        <div className="flex items-center gap-2 text-purple-300">
                          <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>Daily Slots: <strong>{event.dailyTimeSlots.split(',').join(' | ')}</strong></span>
                        </div>
                      )}

                      {event.closeAt ? (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Lock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>Auto-close time: <strong>{new Date(event.closeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                        </div>
                      ) : (
                        event.autoCloseMinutes && event.autoCloseMinutes > 0 && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Auto-close timer: <strong>{event.autoCloseMinutes} mins</strong></span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Target Channel Footer Info */}
                  <div className="text-[11px] text-gray-400 flex items-center justify-between border-t border-border/40 pt-2.5 font-medium">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-primary" />
                      {channelObj ? channelObj.name : `channel-${event.channelId.slice(0, 6)}`}
                    </span>
                    <span>Format: Discord Embed</span>
                  </div>
                </div>

                {/* Card Actions Footer Bar */}
                <div className="p-3.5 bg-secondary/40 border-t border-border/50 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant={isOpen ? 'danger' : 'outline'}
                    onClick={() => handleToggleStatus(event.id)}
                    className="flex-1 text-xs font-bold rounded-xl py-2"
                  >
                    {isOpen ? (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1" /> Close
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 mr-1" /> Open
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(event)}
                    title="Edit Signup settings"
                    className="text-xs font-bold rounded-xl border-blue-500/40 text-blue-300 hover:bg-blue-500/15 flex items-center gap-1 px-3"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyRosterToClipboard(event)}
                    title="Copy full roster to clipboard"
                    className="text-xs font-bold rounded-xl border-purple-500/40 text-purple-300 hover:bg-purple-500/15 flex items-center gap-1 px-3"
                  >
                    {copiedEventId === event.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Roster
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleClearParticipants(event.id)}
                    title="Reset/Clear roster"
                    className="text-xs text-gray-400 hover:text-amber-400 rounded-xl px-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteEvent(event.id)}
                    title="Delete event signup"
                    className="text-xs text-gray-400 hover:text-red-400 rounded-xl px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT EVENT MODAL (WITH LIVE DISCORD EMBED PREVIEW) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/80 rounded-3xl max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto my-auto border-t-4 border-t-primary">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
                  {editingEvent ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {editingEvent ? 'Edit Event Signup' : 'Create Event Signup'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Configure embed settings & see live Discord embed preview
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-secondary/80 text-gray-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            {/* Split Screen Form & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Controls Column */}
              <form onSubmit={handleCreateEvent} className="lg:col-span-7 space-y-4">
                {/* Event Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Event Name / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Informal Signup, T1 Scrims"
                    className="w-full bg-secondary/60 border border-border/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                {/* Subheader / Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-300">
                      Description / Sub-header
                    </label>
                    <span className="text-[11px] text-primary font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Use {'{time}'} for target slot
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Register for Informal {time}"
                    className="w-full bg-secondary/60 border border-border/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary font-medium"
                  />

                  {/* Clean 24-Hour Format Target Slot Selector */}
                  <div className="mt-3 p-3 bg-secondary/40 border border-border/60 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>24-Hour Target Time Slot:</span>
                      </label>
                      <input
                        type="time"
                        step="300"
                        value={eventTimePicker}
                        onChange={(e) => {
                          const newTime = e.target.value;
                          setEventTimePicker(newTime);
                          if (newTime) {
                            const base = (formData.description || 'Register for Informal')
                              .replace(/\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/g, '')
                              .replace(/\{time\}/g, '')
                              .trim();
                            setFormData((prev) => ({
                              ...prev,
                              eventTime: newTime,
                              description: `${base} ${newTime}`.trim(),
                            }));
                          }
                        }}
                        className="bg-secondary border border-primary/50 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary font-bold font-mono shadow-inner"
                      />
                    </div>

                    {/* Quick 24h Time Slot Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/30">
                      <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">24h Slots:</span>
                      {['18:00', '19:00', '19:40', '20:00', '20:40', '21:00', '21:40', '22:00'].map((slotTime) => (
                        <button
                          key={slotTime}
                          type="button"
                          onClick={() => {
                            setEventTimePicker(slotTime);
                            const base = (formData.description || 'Register for Informal')
                              .replace(/\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/g, '')
                              .replace(/\{time\}/g, '')
                              .trim();
                            setFormData((prev) => ({
                              ...prev,
                              eventTime: slotTime,
                              description: `${base} ${slotTime}`.trim(),
                            }));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer border ${
                            eventTimePicker === slotTime
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105'
                              : 'bg-secondary/70 hover:bg-secondary text-gray-300 border-border/60'
                          }`}
                        >
                          {slotTime}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Team & Substitute Roster Limits */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Main Team Limit
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.maxMainTeam}
                      onChange={(e) => setFormData({ ...formData, maxMainTeam: Number(e.target.value) })}
                      className="w-full bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Substitutes Limit
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={formData.maxSubstitutes}
                      onChange={(e) => setFormData({ ...formData, maxSubstitutes: Number(e.target.value) })}
                      className="w-full bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-semibold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-300">
                        Auto-Close
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            autoCloseMinutes: prev.autoCloseMinutes > 0 ? 0 : 35,
                          }))
                        }
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          formData.autoCloseMinutes > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {formData.autoCloseMinutes > 0 ? '🟢 ON' : '🔴 OFF'}
                      </button>
                    </div>
                    {formData.autoCloseMinutes > 0 ? (
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={formData.autoCloseMinutes}
                          onChange={(e) => setFormData({ ...formData, autoCloseMinutes: Number(e.target.value) })}
                          placeholder="35"
                          className="w-full bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary pr-12 font-semibold"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">mins</span>
                      </div>
                    ) : (
                      <div className="bg-secondary/30 border border-border/40 rounded-xl px-3 py-2 text-xs text-gray-400 italic">
                        Indefinite
                      </div>
                    )}
                  </div>
                </div>

                {/* Target Channel & Ping Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Target Channel
                    </label>
                    {channels.length > 0 ? (
                      <select
                        required
                        value={formData.channelId}
                        onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                        className="w-full bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-medium"
                      >
                        <option value="">-- Select Channel --</option>
                        {channels.map((c) => (
                          <option key={c.id} value={c.id}>
                            #{c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        value={formData.channelId}
                        onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                        placeholder="Discord Channel ID"
                        className="w-full bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Auto Tag Role (Optional)
                    </label>
                    <select
                      value={formData.pingRoleId}
                      onChange={(e) => setFormData({ ...formData, pingRoleId: e.target.value })}
                      className="w-full bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-medium"
                    >
                      <option value="">-- No Tag --</option>
                      <option value="everyone">@everyone</option>
                      <option value="here">@here</option>
                      {roles.map((r) => (
                        <option key={r.roleId} value={r.roleId}>
                          @{r.roleName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Embed Color Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Discord Embed Side Border Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.embedColor}
                      onChange={(e) => setFormData({ ...formData, embedColor: e.target.value })}
                      className="w-10 h-10 rounded-xl border-0 bg-transparent cursor-pointer shrink-0"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setFormData({ ...formData, embedColor: preset.hex })}
                          className={`w-6 h-6 rounded-full border border-white/20 transition-all cursor-pointer ${
                            formData.embedColor.toLowerCase() === preset.hex.toLowerCase()
                              ? 'scale-125 ring-2 ring-white shadow-md'
                              : 'hover:scale-110 opacity-80'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Schedule Controls */}
                <div className="bg-secondary/40 border border-border/60 p-4 rounded-2xl space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                    ⏰ Schedule & Auto-Posting Mode
                  </label>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduleType: 'now', postNow: true })}
                      className={`px-3 py-2 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                        formData.scheduleType === 'now'
                          ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                          : 'bg-secondary/60 text-gray-300 border-border/80 hover:bg-secondary'
                      }`}
                    >
                      🚀 Post Now
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduleType: 'scheduled', postNow: false })}
                      className={`px-3 py-2 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                        formData.scheduleType === 'scheduled'
                          ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                          : 'bg-secondary/60 text-gray-300 border-border/80 hover:bg-secondary'
                      }`}
                    >
                      ⏰ One-Time
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduleType: 'recurring', postNow: true })}
                      className={`px-3 py-2 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                        formData.scheduleType === 'recurring'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                          : 'bg-secondary/60 text-gray-300 border-border/80 hover:bg-secondary'
                      }`}
                    >
                      🔄 Daily Auto-Post
                    </button>
                  </div>

                  {/* One-Time Schedule Date & Time Input */}
                  {formData.scheduleType === 'scheduled' && (
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                      <label className="block text-xs font-bold text-blue-300">
                        ⏰ Select Post Date & Start Time:
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.scheduledAt}
                        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                        className="w-full bg-secondary/80 border border-blue-500/40 rounded-lg px-3.5 py-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-400"
                      />
                      <p className="text-[10px] text-gray-400">
                        Event signup exact is date aur time par Discord channel me auto-publish ho jayega.
                      </p>
                    </div>
                  )}

                  {/* Expanded Daily Auto-Post Settings */}
                  {formData.scheduleType === 'recurring' && (
                    <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-3">
                      <div className="flex items-center gap-4 text-xs font-bold text-purple-300">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="recurringType"
                            checked={formData.recurringType === 'daily_slots'}
                            onChange={() => setFormData({ ...formData, recurringType: 'daily_slots' })}
                            className="accent-purple-500"
                          />
                          <span>Daily 24h Time Slots</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="recurringType"
                            checked={formData.recurringType === 'interval'}
                            onChange={() => setFormData({ ...formData, recurringType: 'interval' })}
                            className="accent-purple-500"
                          />
                          <span>Hourly Interval</span>
                        </label>
                      </div>

                      {formData.recurringType === 'daily_slots' ? (
                        <div className="space-y-2">
                          <label className="block text-[11px] font-bold text-gray-300">
                            Select Daily Auto-Post Times (Comma-separated or click slots):
                          </label>
                          <input
                            type="text"
                            value={formData.customDailyTimeSlots}
                            onChange={(e) => setFormData({ ...formData, customDailyTimeSlots: e.target.value })}
                            placeholder="e.g. 18:00, 19:40, 20:40"
                            className="w-full bg-secondary/80 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-gray-400 font-bold">Quick Toggle:</span>
                            {['18:00', '19:00', '19:40', '20:00', '20:40', '21:00', '21:40', '22:00'].map((slotTime) => {
                              const activeSlots = formData.customDailyTimeSlots
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const isSelected = activeSlots.includes(slotTime);

                              return (
                                <button
                                  key={slotTime}
                                  type="button"
                                  onClick={() => {
                                    let newSlots: string[];
                                    if (isSelected) {
                                      newSlots = activeSlots.filter((s) => s !== slotTime);
                                    } else {
                                      newSlots = [...activeSlots, slotTime];
                                    }
                                    setFormData({ ...formData, customDailyTimeSlots: newSlots.join(', ') });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all border cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                                      : 'bg-secondary/60 text-gray-400 border-border/40 hover:text-white'
                                  }`}
                                >
                                  {isSelected ? '✓ ' : ''}{slotTime}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-300">
                              Repeat Every:
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={formData.recurringIntervalHours}
                              onChange={(e) => setFormData({ ...formData, recurringIntervalHours: Number(e.target.value) })}
                              className="w-20 bg-secondary/80 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                            />
                            <span className="text-xs text-gray-300 font-medium">Hour(s)</span>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-purple-500/20">
                            <label className="block text-[11px] font-bold text-gray-300">
                              Start Schedule Date & Time (Start from when):
                            </label>
                            <input
                              type="datetime-local"
                              value={formData.scheduledAt}
                              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                              className="w-full bg-secondary/80 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none"
                            />
                            <p className="text-[10px] text-gray-400">
                              Pehli post is start time par hogi, phir har {formData.recurringIntervalHours || 1} hour(s) me automatic repeat hoti rahegi.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-6 shadow-lg shadow-primary/20"
                  >
                    {isSubmitting
                      ? 'Saving...'
                      : editingEvent
                      ? 'Update Event'
                      : 'Publish to Discord'}
                  </Button>
                </div>
              </form>

              {/* Live Discord Embed Preview Column */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-primary" />
                  <span>Live Discord Embed Preview</span>
                </div>

                {/* Simulated Discord Dark Theme Panel */}
                <div className="bg-[#313338] border border-[#232428] rounded-2xl p-4 space-y-3 font-sans shadow-2xl text-gray-200 text-xs">
                  {/* Bot User Info Header */}
                  <div className="flex items-center gap-2.5 pb-2 border-b border-[#3f4147]">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs">
                      SM
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm">SMCore</span>
                      <span className="bg-[#5865f2] text-[10px] font-bold text-white px-1.5 py-0.2 rounded uppercase">
                        BOT
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">Today at 8:00 PM</span>
                    </div>
                  </div>

                  {/* Ping Text line if selected */}
                  {formData.pingRoleId && (
                    <div className="text-[#c9cdfb] font-semibold">
                      {formData.pingRoleId === 'everyone'
                        ? '@everyone'
                        : formData.pingRoleId === 'here'
                        ? '@here'
                        : `@${roles.find((r) => r.roleId === formData.pingRoleId)?.roleName || 'Role'}`}
                    </div>
                  )}

                  {/* Embed Container */}
                  <div
                    className="bg-[#2b2d31] rounded-lg p-3.5 space-y-3 border-l-4 shadow-md"
                    style={{ borderLeftColor: formData.embedColor || '#E74C3C' }}
                  >
                    {/* Title */}
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>🏆</span>
                      <span>{formData.title || 'Informal Signup'}</span>
                    </div>

                    {/* Description */}
                    <div className="text-gray-300 text-xs leading-relaxed">
                      {previewDescription}
                    </div>

                    {/* Main Team Field */}
                    <div className="space-y-1">
                      <div className="font-bold text-white text-xs">
                        🔥 Main Team (0/{formData.maxMainTeam || 10})
                      </div>
                      <div className="text-gray-400 italic text-[11px] font-mono">
                        1️⃣ *No players registered yet*
                      </div>
                    </div>

                    {/* Substitutes Field */}
                    <div className="space-y-1">
                      <div className="font-bold text-white text-xs">
                        🪑 Substitutes (0/{formData.maxSubstitutes || 5})
                      </div>
                      <div className="text-gray-400 italic text-[11px] font-mono">
                        *None*
                      </div>
                    </div>

                    {/* Registration Field */}
                    <div className="space-y-1">
                      <div className="font-bold text-white text-xs">
                        📌 Registration Status
                      </div>
                      <div className="text-emerald-400 font-semibold text-[11px]">
                        🟢 Open (Registration Active)
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-[10px] text-gray-400 border-t border-[#383a40] pt-2">
                      SMCore • Event Signup
                    </div>
                  </div>

                  {/* Interactive Button Preview */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled
                      className="bg-[#248046] text-white font-semibold text-xs px-4 py-1.5 rounded flex items-center gap-1.5 shadow"
                    >
                      <span>✅</span> Join Signup
                    </button>
                    <button
                      type="button"
                      disabled
                      className="bg-[#4e5058] text-white font-semibold text-xs px-4 py-1.5 rounded flex items-center gap-1.5"
                    >
                      <span>❌</span> Leave
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BATCH SIGNUPS GENERATOR MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/80 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Batch Signups Generator</span>
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Base Title
                </label>
                <input
                  type="text"
                  required
                  value={batchData.baseTitle}
                  onChange={(e) => setBatchData({ ...batchData, baseTitle: e.target.value })}
                  placeholder="Informal Signup"
                  className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Start Hour
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={batchData.startHour}
                    onChange={(e) => setBatchData({ ...batchData, startHour: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Interval (Mins)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={batchData.intervalMinutes}
                    onChange={(e) => setBatchData({ ...batchData, intervalMinutes: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={batchData.count}
                    onChange={(e) => setBatchData({ ...batchData, count: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Target Discord Channel
                </label>
                {channels.length > 0 ? (
                  <select
                    required
                    value={batchData.channelId}
                    onChange={(e) => setBatchData({ ...batchData, channelId: e.target.value })}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-medium"
                  >
                    <option value="">-- Select Channel --</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={batchData.channelId}
                    onChange={(e) => setBatchData({ ...batchData, channelId: e.target.value })}
                    placeholder="Enter Channel ID"
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm text-white"
                  />
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBatchModal(false)}
                  className="rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-5 shadow-lg shadow-purple-600/30"
                >
                  {isSubmitting ? 'Generating...' : `Generate ${batchData.count} Signups`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
