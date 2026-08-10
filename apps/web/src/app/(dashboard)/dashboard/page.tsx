'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Trophy,
  Palette,
  Hash,
  Users,
  Settings,
  Plus,
  Save,
  CheckCircle2,
  Sparkles,
  Layers,
  Bot,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ApplicationItem } from '@/types';

interface Channel {
  id: string;
  name: string;
}

interface RoleConfig {
  roleId: string;
  roleName: string;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [stats, setStats] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    applicationsToday: 0,
  });

  const [eventsCount, setEventsCount] = useState(0);
  const [recentApps, setRecentApps] = useState<ApplicationItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // In-Module Settings States
  const [savingModule, setSavingModule] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Module 1: Role Application Settings
  const [appSettings, setAppSettings] = useState({
    cooldownMinutes: 15,
    onePendingOnly: true,
    screenshotRequired: false,
    screenshotAllowed: true,
    reviewPingRoleId: '',
    autoDmEnabled: true,
    loggingEnabled: true,
    defaultEmbedColor: '#3B82F6',
    timezone: 'UTC',
    language: 'en',
  });

  // Module 2: Channel Routes Configuration
  const [channelRoutes, setChannelRoutes] = useState({
    reviewChannelId: '',
    logsChannelId: '',
    requestChannelId: '',
  });

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/guilds/${guildId}/analytics`).then((res) => res.json()).catch(() => null),
      fetch(`/api/guilds/${guildId}/applications?limit=5`).then((res) => res.json()).catch(() => null),
      fetch(`/api/guilds/${guildId}/settings`).then((res) => res.json()).catch(() => null),
      fetch(`/api/guilds/${guildId}/channels`).then((res) => res.json()).catch(() => null),
      fetch(`/api/guilds/${guildId}/roles`).then((res) => res.json()).catch(() => null),
      fetch(`/api/guilds/${guildId}/events`).then((res) => res.json()).catch(() => null),
    ])
      .then(([analyticsData, appData, settingsData, channelsData, rolesData, eventsData]) => {
        if (analyticsData) setStats(analyticsData);
        if (appData && appData.items) setRecentApps(appData.items);
        if (settingsData) setAppSettings((prev) => ({ ...prev, ...settingsData }));

        if (channelsData) {
          if (channelsData.config) {
            setChannelRoutes({
              reviewChannelId: channelsData.config.reviewChannelId || '',
              logsChannelId: channelsData.config.logsChannelId || '',
              requestChannelId: channelsData.config.requestChannelId || '',
            });
          }
          const rawChannels = channelsData.discordChannels || [];
          setChannels(rawChannels.filter((c: any) => c.type === 0 || c.type === undefined));
        }

        if (Array.isArray(rolesData)) setRoles(rolesData);
        if (Array.isArray(eventsData)) setEventsCount(eventsData.length);
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, [guildId]);

  const handleSaveAppSettings = async () => {
    setSavingModule('app');
    setSaveSuccess(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appSettings),
      });
      if (res.ok) {
        setSaveSuccess('app');
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Save app settings error:', err);
    } finally {
      setSavingModule(null);
    }
  };

  const handleSaveChannelRoutes = async () => {
    setSavingModule('channels');
    setSaveSuccess(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelRoutes),
      });
      if (res.ok) {
        setSaveSuccess('channels');
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Save channels error:', err);
    } finally {
      setSavingModule(null);
    }
  };

  if (!guildId) {
    return (
      <div className="p-8 text-center text-gray-400">
        Please select a Discord server from the top bar to access the Modular Dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Quick Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase mb-1">
            <Bot className="w-4 h-4" />
            <span>SMCore Modular Dashboard System</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Server Command & Module Hub</h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage each system module individually with dedicated in-card controls & settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="success" className="px-3 py-1.5 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Bot Active & Listening
          </Badge>

          <Link href={`/events?guildId=${guildId}`}>
            <Button variant="primary" size="sm" className="gap-2 font-bold shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Create Event Signup
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Applications"
          value={stats.totalPending || 0}
          subtitle="Awaiting Staff Action"
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Approved Roles"
          value={stats.totalApproved || 0}
          subtitle="Granted Applications"
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="Rejected Requests"
          value={stats.totalRejected || 0}
          subtitle="Declined Applications"
          icon={XCircle}
          color="danger"
        />
        <StatCard
          title="Active Event Signups"
          value={eventsCount}
          subtitle="Scheduled & Open Events"
          icon={Trophy}
          color="primary"
        />
      </div>

      {/* MODULES GRID - IN-MODULE SETTINGS & CONTROLS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Core Functional Modules & In-Card Settings</span>
          </h2>
          <span className="text-xs text-gray-400">2 Core Feature Modules + Embed Tool</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {/* MODULE 1: EVENT SIGNUP SYSTEM */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-purple-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shadow-lg shadow-purple-500/20">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Event & Scrim Signup Module</span>
                    </h3>
                    <p className="text-xs text-gray-400">Fixed time + Hourly auto-repeating signups</p>
                  </div>
                </div>
                <Badge variant="success" className="text-xs font-bold px-3 py-1">MODULE 1 • ACTIVE</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-4 rounded-xl">
                <div className="space-y-1">
                  <span className="text-gray-400">Total Event Signups:</span>
                  <p className="text-white font-bold font-mono text-sm">{eventsCount} Signups</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Default Auto-Close:</span>
                  <p className="text-purple-300 font-bold text-sm">30 Minutes</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Auto-Repeat Mode:</span>
                  <p className="text-emerald-400 font-bold text-sm">Hourly / Fixed Slots</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Discord Embed Sync:</span>
                  <p className="text-blue-400 font-bold text-sm">Auto Clean & Post</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3">
              <Link href={`/events?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-purple-600 hover:bg-purple-700">
                  <Trophy className="w-4 h-4" /> Open Module & Create Event Signups →
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 2: ROLE REQUEST & ASSIGNMENT SYSTEM */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-blue-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shadow-lg shadow-blue-500/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Role Request & Credentials Module</span>
                    </h3>
                    <p className="text-xs text-gray-400">In-game credentials form & staff approval</p>
                  </div>
                </div>
                <Badge variant="success" className="text-xs font-bold px-3 py-1">MODULE 2 • ACTIVE</Badge>
              </div>

              {/* In-Module Settings Controls */}
              <div className="bg-secondary/40 border border-border/50 p-4 rounded-xl space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1 font-medium">
                      Cooldown (Minutes):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={appSettings.cooldownMinutes}
                      onChange={(e) => setAppSettings({ ...appSettings, cooldownMinutes: Number(e.target.value) })}
                      className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1 font-medium">
                      Staff Review Channel:
                    </label>
                    <select
                      value={channelRoutes.reviewChannelId}
                      onChange={(e) => setChannelRoutes({ ...channelRoutes, reviewChannelId: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">-- Select Channel --</option>
                      {channels.map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1 font-medium">
                      Staff Review Ping Role:
                    </label>
                    <select
                      value={appSettings.reviewPingRoleId || ''}
                      onChange={(e) => setAppSettings({ ...appSettings, reviewPingRoleId: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">-- No Ping --</option>
                      <option value="everyone">@everyone</option>
                      <option value="here">@here</option>
                      {roles.map((r) => (
                        <option key={r.roleId} value={r.roleId}>
                          @{r.roleName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-4 px-2">
                    <span className="text-gray-300 font-medium">One Pending Only:</span>
                    <input
                      type="checkbox"
                      checked={appSettings.onePendingOnly}
                      onChange={(e) => setAppSettings({ ...appSettings, onePendingOnly: e.target.checked })}
                      className="accent-blue-500 cursor-pointer w-4 h-4"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAppSettings}
                disabled={savingModule === 'app'}
                className="text-xs gap-1.5 flex-1 font-bold"
              >
                {savingModule === 'app' ? 'Saving...' : saveSuccess === 'app' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                {saveSuccess === 'app' ? 'Settings Saved!' : 'Save Module Settings'}
              </Button>
              <Link href={`/applications?guildId=${guildId}`}>
                <Button variant="outline" size="sm" className="text-xs font-bold">
                  View Queue →
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 3: EMBED BUILDER TOOL */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-lg hover:border-pink-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Embed Theme & Branding</h3>
                    <p className="text-[11px] text-gray-400">Embed colors & custom embeds</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">TOOL</Badge>
              </div>

              <div className="bg-secondary/40 border border-border/50 p-3 rounded-xl space-y-2.5 text-xs">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Default Accent Color:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={appSettings.defaultEmbedColor}
                      onChange={(e) => setAppSettings({ ...appSettings, defaultEmbedColor: e.target.value })}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-white text-xs">{appSettings.defaultEmbedColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <Link href={`/embed-builder?guildId=${guildId}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-pink-500/30 text-pink-300 hover:bg-pink-500/10">
                  <Palette className="w-3.5 h-3.5" /> Open Embed Customizer
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 4: EXTENSIBLE FUTURE MODULES CARD */}
          <div className="bg-card/50 border border-dashed border-border/80 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between hover:border-primary/50 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Custom / Future Modules</h3>
                    <p className="text-[11px] text-gray-400">Extensible module framework</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] text-gray-400">READY TO ADD</Badge>
              </div>

              <div className="p-3 bg-secondary/20 border border-border/30 rounded-xl space-y-1 text-xs text-gray-400">
                <p>⚡ Tournament Brackets & Matchmaking</p>
                <p>🎟️ Support Ticket & Member Verification</p>
                <p>🤖 Custom Bot Webhooks & Integrations</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/30">
              <Button variant="ghost" size="sm" className="w-full text-xs text-primary hover:bg-primary/10 gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add New Custom Module
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ROLE REQUESTS STREAM */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Recent Role Requests
          </CardTitle>
          <Link href={`/applications?guildId=${guildId}`} className="text-xs text-primary font-semibold hover:underline">
            View All Applications →
          </Link>
        </CardHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading recent activity...</div>
        ) : recentApps.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No role applications submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-border bg-secondary/30">
                <tr>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Requested Role</th>
                  <th className="py-3 px-4">In-Game IGN</th>
                  <th className="py-3 px-4">Rank / Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentApps.map((app) => (
                  <tr key={app.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                          {app.userTag.charAt(0)}
                        </div>
                        <span>{app.userTag}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-200">{app.roleName}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-300">{app.inGameName}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-300">{app.currentRank}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={app.status.toLowerCase() as any}>{app.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">{formatDate(app.createdAt)}</td>
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

