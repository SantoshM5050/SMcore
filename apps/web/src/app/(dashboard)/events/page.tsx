'use client';

import React, { useState, useEffect } from 'react';
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

export default function EventSignupsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [events, setEvents] = useState<EventSignup[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<{ roleId: string; roleName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    autoCloseMinutes: 30,
    isRecurring: true,
    scheduleType: 'now' as 'now' | 'scheduled' | 'recurring',
    recurringType: 'interval' as 'interval' | 'daily_slots',
    recurringIntervalHours: 1,
    dailyTime1: '18:00',
    dailyTime2: '20:00',
    dailyTime3: '22:00',
    customDailyTimeSlots: '18:00, 20:00, 22:00',
    postNow: true,
  });

  const [eventTimePicker, setEventTimePicker] = useState<string>('19:40');

  const generateQuickTimeSlots = () => {
    const slots: string[] = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getTime() + i * 30 * 60 * 1000);
      slots.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
    slots.push('{time}');
    return slots;
  };

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
    autoCloseMinutes: 30,
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

  const [editingEvent, setEditingEvent] = useState<any | null>(null);

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
          dailyTimeSlots = formData.customDailyTimeSlots.trim()
            || [formData.dailyTime1, formData.dailyTime2, formData.dailyTime3].filter(Boolean).join(',');
        }
      }

      const scheduledISO = formData.scheduledAt && !isNaN(new Date(formData.scheduledAt).getTime())
        ? new Date(formData.scheduledAt).toISOString()
        : null;

      const hasFutureSchedule = Boolean(scheduledISO && new Date(scheduledISO) > new Date());
      const postNow = formData.scheduleType === 'now' || (formData.scheduleType === 'recurring' && !hasFutureSchedule);

      const isEdit = Boolean(editingEvent);
      const url = isEdit
        ? `/api/guilds/${guildId}/events/${editingEvent.id}`
        : `/api/guilds/${guildId}/events`;
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

  if (!guildId) {
    return (
      <div className="p-8 text-center text-gray-400">
        Please select a Discord server from the top bar to manage event signups.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide uppercase mb-1">
            <Trophy className="w-4 h-4" />
            <span>Event Registration System</span>
          </div>
          <h1 className="text-2xl font-black text-white">Discord Event & Scrim Signups</h1>
          <p className="text-sm text-gray-400 mt-1">
            Create custom event signups, set main roster & substitute limits, and post embeds matching your server theme.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowBatchModal(true)}
            className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 flex items-center gap-2 font-semibold"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Batch 8-10 Signups</span>
          </Button>

          <Button
            onClick={openCreateModal}
            className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 font-semibold shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event Signup</span>
          </Button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="bg-card border border-border/80 p-12 text-center rounded-2xl text-gray-400">
          Loading event signups...
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-400 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Events Grid */}
      {!loading && !error && events.length === 0 && (
        <div className="bg-card border border-dashed border-border/70 p-12 text-center rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No Event Signups Found</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Create your first event signup or generate 8-10 signups at once to let players register from Discord!
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button onClick={() => setShowBatchModal(true)} variant="outline">
              Generate 8-10 Signups
            </Button>
            <Button onClick={openCreateModal}>Create Single Event</Button>
          </div>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const mainParticipants = event.participants.filter((p) => p.roleType === 'MAIN_TEAM');
            const subParticipants = event.participants.filter((p) => p.roleType === 'SUBSTITUTE');

            const isOpen = event.status === 'OPEN';
            const isClosed = event.status === 'CLOSED';
            const isScheduled = event.status === 'SCHEDULED';

            return (
              <div
                key={event.id}
                className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-border transition-all"
              >
                {/* Red Border Bar matching Discord Embed design */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: event.embedColor || '#E74C3C' }}
                />

                <div className="p-5 space-y-4 flex-1">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>📢</span>
                        <span>{event.title}</span>
                      </h3>
                      {event.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>
                      )}
                    </div>

                    <Badge
                      variant={isOpen ? 'success' : isScheduled ? 'warning' : 'secondary'}
                      className="font-bold tracking-wide"
                    >
                      {isOpen ? '🟢 OPEN' : isScheduled ? '⏰ SCHEDULED' : '🔒 CLOSED'}
                    </Badge>
                  </div>

                  {/* Main Team Section */}
                  <div className="bg-secondary/40 border border-border/40 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-400 flex items-center gap-1">
                        🔥 Main Team ({mainParticipants.length}/{event.maxMainTeam})
                      </span>
                      <span className="text-gray-500 font-normal">
                        {Math.round((mainParticipants.length / event.maxMainTeam) * 100)}%
                      </span>
                    </div>

                    {mainParticipants.length === 0 ? (
                      <div className="text-xs text-gray-500 italic">None</div>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {mainParticipants.map((p, idx) => (
                          <div
                            key={p.id}
                            className="text-xs text-gray-300 bg-background/60 px-2.5 py-1 rounded flex items-center justify-between"
                          >
                            <span className="font-mono text-purple-300">
                              #{idx + 1} @{p.userTag}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Substitutes Section */}
                  <div className="bg-secondary/20 border border-border/30 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                      <span>🪑 Substitutes ({subParticipants.length}/{event.maxSubstitutes})</span>
                    </div>

                    {subParticipants.length === 0 ? (
                      <div className="text-xs text-gray-500 italic">None</div>
                    ) : (
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {subParticipants.map((p, idx) => (
                          <div
                            key={p.id}
                            className="text-xs text-gray-400 bg-background/40 px-2 py-0.5 rounded flex items-center justify-between"
                          >
                            <span className="font-mono">Sub #{idx + 1} @{p.userTag}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Schedule & Timing Badges */}
                  {(event.scheduledAt || event.closeAt || event.isRecurring) && (
                    <div className="bg-purple-500/10 border border-purple-500/30 p-2 rounded-lg text-xs space-y-1 text-purple-300 font-medium">
                      {event.scheduledAt && isScheduled && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Agli baar send hoga: <strong>{new Date(event.scheduledAt).toLocaleString()}</strong></span>
                        </div>
                      )}

                      {event.isRecurring && event.recurringIntervalHours && (
                        <div className="flex items-center gap-1.5 text-purple-300">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Auto-Repeat: <strong>Har {event.recurringIntervalHours} ghnte me send hoga</strong></span>
                        </div>
                      )}

                      {event.isRecurring && event.dailyTimeSlots && (
                        <div className="flex items-center gap-1.5 text-purple-300">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Daily Times: <strong>{event.dailyTimeSlots.split(',').join(' | ')} (Har roz)</strong></span>
                        </div>
                      )}

                      {event.closeAt ? (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <Lock className="w-3.5 h-3.5 text-red-400" />
                          <span>Auto-close time: <strong>{new Date(event.closeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                        </div>
                      ) : (
                        event.autoCloseMinutes && event.autoCloseMinutes > 0 && (
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Auto-close duration: <strong>{event.autoCloseMinutes} Mins (after open)</strong></span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Footer Stats */}
                  <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-border/40 pt-2">
                    <span>Target Channel: #{channels.find((c) => c.id === event.channelId)?.name || event.channelId.slice(0, 8)}...</span>
                    <span>Footer: Hood Rich • Signup</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 bg-secondary/30 border-t border-border/40 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant={isOpen ? 'danger' : 'outline'}
                    onClick={() => handleToggleStatus(event.id)}
                    className="flex-1 text-xs font-semibold"
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
                    title="Edit Event Signup settings"
                    className="text-xs font-semibold border-blue-500/40 text-blue-300 hover:bg-blue-500/10 flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleClearParticipants(event.id)}
                    title="Clear registered participants"
                    className="text-xs text-gray-400 hover:text-amber-400"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteEvent(event.id)}
                    title="Delete event signup"
                    className="text-xs text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingEvent ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-primary" />}
                <span>{editingEvent ? 'Edit Event Signup' : 'Create Event Signup'}</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Event Name / Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Informal Signup, T1 Scrims"
                  className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-300">
                    Sub-header / Description
                  </label>
                  <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Select Time Slot below
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Register for Informal 19:40"
                  className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />

                {/* Time Picker & Quick Selection Chips */}
                <div className="mt-2.5 p-2.5 bg-secondary/40 border border-border/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Event Target Time (Slot Picker):</span>
                    </label>
                    <input
                      type="time"
                      value={eventTimePicker}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        setEventTimePicker(newTime);
                        if (newTime) {
                          const base = (formData.description || 'Register for Informal').replace(/\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/g, '').replace(/\{time\}/g, '').trim();
                          setFormData((prev) => ({
                            ...prev,
                            eventTime: newTime,
                            description: `${base} ${newTime}`.trim(),
                          }));
                        }
                      }}
                      className="bg-secondary border border-primary/40 rounded-md px-2 py-1 text-xs text-white focus:outline-none font-bold"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-b border-border/30 pb-1.5">
                    <span className="text-[10px] text-gray-400 font-semibold mr-1">Easy Preset:</span>
                    <button type="button" onClick={() => applyQuickTimePreset(15)} className="px-2 py-0.5 bg-secondary hover:bg-secondary/80 text-gray-300 border border-border rounded text-[10px] font-bold cursor-pointer">+15m</button>
                    <button type="button" onClick={() => applyQuickTimePreset(30)} className="px-2 py-0.5 bg-secondary hover:bg-secondary/80 text-gray-300 border border-border rounded text-[10px] font-bold cursor-pointer">+30m</button>
                    <button type="button" onClick={() => applyQuickTimePreset(45)} className="px-2 py-0.5 bg-secondary hover:bg-secondary/80 text-gray-300 border border-border rounded text-[10px] font-bold cursor-pointer">+45m</button>
                    <button type="button" onClick={() => applyQuickTimePreset(60)} className="px-2 py-0.5 bg-secondary hover:bg-secondary/80 text-gray-300 border border-border rounded text-[10px] font-bold cursor-pointer">+1h</button>
                    <button type="button" onClick={() => applyQuickTimePreset('next_top_hour')} className="px-2 py-0.5 bg-secondary hover:bg-secondary/80 text-gray-300 border border-border rounded text-[10px] font-bold cursor-pointer">Top of Hour</button>
                    <button type="button" onClick={() => applyQuickTimePreset('informal_40')} className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold cursor-pointer">🔥 Informal (XX:40)</button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-gray-400 font-semibold mr-1">Quick Time Slots:</span>
                    {generateQuickTimeSlots().map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          const base = (formData.description || 'Register for Informal').replace(/\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/g, '').replace(/\{time\}/g, '').trim();
                          setFormData((prev) => ({
                            ...prev,
                            eventTime: slot === '{time}' ? '' : slot,
                            description: slot === '{time}' ? `${base} {time}`.trim() : `${base} ${slot}`.trim(),
                          }));
                          if (slot !== '{time}') setEventTimePicker(slot);
                        }}
                        className="px-2 py-0.5 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 rounded text-[11px] font-bold transition-all cursor-pointer"
                      >
                        {slot === '{time}' ? '🔄 Dynamic {time}' : slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Main Team Slots
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.maxMainTeam}
                    onChange={(e) => setFormData({ ...formData, maxMainTeam: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Substitutes Limit
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={formData.maxSubstitutes}
                    onChange={(e) => setFormData({ ...formData, maxSubstitutes: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-300">
                      Auto-Close Registration
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          autoCloseMinutes: prev.autoCloseMinutes > 0 ? 0 : 35,
                        }))
                      }
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
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
                        className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary pr-12"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">mins</span>
                    </div>
                  ) : (
                    <div className="bg-secondary/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-gray-400 italic">
                      Indefinite (No Auto-Close)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Target Discord Channel
                </label>
                {channels.length > 0 ? (
                  <select
                    required
                    value={formData.channelId}
                    onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
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
                    placeholder="Enter Discord Channel ID"
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Auto Tag / Mention Role (Optional)
                </label>
                <select
                  value={formData.pingRoleId}
                  onChange={(e) => setFormData({ ...formData, pingRoleId: e.target.value })}
                  className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- No Tag (Embed only) --</option>
                  <option value="everyone">@everyone</option>
                  <option value="here">@here</option>
                  {roles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      @{r.roleName} ({r.roleId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Embed Color (Hex)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.embedColor}
                    onChange={(e) => setFormData({ ...formData, embedColor: e.target.value })}
                    className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.embedColor}
                    onChange={(e) => setFormData({ ...formData, embedColor: e.target.value })}
                    className="flex-1 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              {/* Posting Schedule Controls */}
              <div className="bg-secondary/40 border border-border/50 p-3.5 rounded-xl space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                  ⏰ Posting Schedule & Auto-Timing
                </label>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scheduleType: 'now', postNow: true })}
                    className={`px-2.5 py-2 rounded-lg font-medium border text-center transition-all ${
                      formData.scheduleType === 'now'
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-secondary/60 text-gray-300 border-border hover:bg-secondary'
                    }`}
                  >
                    🚀 Post Now
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scheduleType: 'scheduled', postNow: false })}
                    className={`px-2.5 py-2 rounded-lg font-medium border text-center transition-all ${
                      formData.scheduleType === 'scheduled'
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-secondary/60 text-gray-300 border-border hover:bg-secondary'
                    }`}
                  >
                    ⏰ One-Time Time
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scheduleType: 'recurring', postNow: true })}
                    className={`px-2.5 py-2 rounded-lg font-medium border text-center transition-all ${
                      formData.scheduleType === 'recurring'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                        : 'bg-secondary/60 text-gray-300 border-border hover:bg-secondary'
                    }`}
                  >
                    🔄 Auto Repeat
                  </button>
                </div>

                {formData.scheduleType === 'scheduled' && (
                  <div className="pt-1 space-y-1">
                    <label className="block text-[11px] text-gray-300 font-medium">
                      Select Date & Time (Agli baar kab send hoga):
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                {formData.scheduleType === 'recurring' && (
                  <div className="pt-1 space-y-3">
                    <div className="bg-purple-500/10 border border-purple-500/30 p-2.5 rounded-lg space-y-1">
                      <label className="block text-[11px] text-purple-200 font-bold">
                        📅 Fixed First Start Time (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.scheduledAt}
                        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-[10px] text-purple-300/80">
                        Leave blank to post immediately and repeat every hour. Or set a fixed start time (e.g. 18:00 today) when the 1st embed should post.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-gray-200">
                        <input
                          type="radio"
                          name="recurringType"
                          checked={formData.recurringType === 'interval'}
                          onChange={() => setFormData({ ...formData, recurringType: 'interval' })}
                          className="accent-purple-500"
                        />
                        <span>Repeat Every N Hours</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-gray-200">
                        <input
                          type="radio"
                          name="recurringType"
                          checked={formData.recurringType === 'daily_slots'}
                          onChange={() => setFormData({ ...formData, recurringType: 'daily_slots' })}
                          className="accent-purple-500"
                        />
                        <span>Daily Fixed Time Slots</span>
                      </label>
                    </div>

                    {formData.recurringType === 'interval' ? (
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Select Interval:
                        </label>
                        <select
                          value={formData.recurringIntervalHours}
                          onChange={(e) => setFormData({ ...formData, recurringIntervalHours: Number(e.target.value) })}
                          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value={1}>Every 1 Hour (Hourly)</option>
                          <option value={2}>Every 2 Hours</option>
                          <option value={4}>Every 4 Hours</option>
                          <option value={6}>Every 6 Hours</option>
                          <option value={12}>Every 12 Hours</option>
                          <option value={24}>Every 24 Hours (Daily)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-[11px] text-gray-300 font-medium">
                          Custom Daily Times (Aap jitne chahe utne time daal sakte hain, comma-separated):
                        </label>
                        <input
                          type="text"
                          value={formData.customDailyTimeSlots}
                          onChange={(e) => setFormData({ ...formData, customDailyTimeSlots: e.target.value })}
                          placeholder="e.g. 18:00, 18:30, 19:00, 19:30, 20:00, 21:00"
                          className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                        <div className="text-[10px] text-gray-400">
                          Format: HH:MM (24-hour time e.g., 18:00, 20:00, 22:30). Bot daily exact in samay par auto-post karega.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? (editingEvent ? 'Saving...' : 'Creating...')
                    : (editingEvent ? 'Save Changes & Update Discord' : 'Create & Send Embed')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH 8-10 EVENTS MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Batch Generate 8-10 Event Signups</span>
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
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Base Event Title
                </label>
                <input
                  type="text"
                  required
                  value={batchData.baseTitle}
                  onChange={(e) => setBatchData({ ...batchData, baseTitle: e.target.value })}
                  placeholder="Informal Signup"
                  className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Start Hour (24h)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={batchData.startHour}
                    onChange={(e) => setBatchData({ ...batchData, startHour: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Gap (Minutes)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={batchData.intervalMinutes}
                    onChange={(e) => setBatchData({ ...batchData, intervalMinutes: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Number of Events
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={batchData.count}
                    onChange={(e) => setBatchData({ ...batchData, count: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Main Slots per Event
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={batchData.maxMainTeam}
                    onChange={(e) => setBatchData({ ...batchData, maxMainTeam: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Subs per Event
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={batchData.maxSubstitutes}
                    onChange={(e) => setBatchData({ ...batchData, maxSubstitutes: Number(e.target.value) })}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Target Discord Channel
                </label>
                {channels.length > 0 ? (
                  <select
                    required
                    value={batchData.channelId}
                    onChange={(e) => setBatchData({ ...batchData, channelId: e.target.value })}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
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
                    placeholder="Enter Discord Channel ID"
                    className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                )}
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-300">
                ⚡ Will generate <strong>{batchData.count}</strong> events starting from{' '}
                <strong>{String(batchData.startHour).padStart(2, '0')}:00</strong> with a{' '}
                <strong>{batchData.intervalMinutes}m</strong> gap (e.g., Informal 18:00, Informal 18:30...).
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setShowBatchModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
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
