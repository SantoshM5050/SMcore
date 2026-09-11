'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Trophy,
  UserPlus,
  ShieldAlert,
  Hash,
  Users,
  Settings,
  Plus,
  Layers,
  Bot,
  Zap,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [stats, setStats] = useState({
    eventsCount: 0,
    moderationCount: 0,
    promotionsCount: 0,
    welcomeEnabled: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/guilds/${guildId}/events`).then((res) => res.json()).catch(() => []),
      fetch(`/api/guilds/${guildId}/moderation`).then((res) => res.json()).catch(() => []),
      fetch(`/api/guilds/${guildId}/promotions`).then((res) => res.json()).catch(() => []),
      fetch(`/api/guilds/${guildId}/welcome`).then((res) => res.json()).catch(() => null),
    ])
      .then(([eventsData, modData, promoData, welcomeData]) => {
        setStats({
          eventsCount: Array.isArray(eventsData) ? eventsData.length : 0,
          moderationCount: Array.isArray(modData) ? modData.length : (modData?.logs?.length || 0),
          promotionsCount: Array.isArray(promoData) ? promoData.length : (promoData?.logs?.length || 0),
          welcomeEnabled: welcomeData?.config?.enabled ?? false,
        });
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, [guildId]);

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
            <span>SMCore Command Dashboard</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Server Command & Module Hub</h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your gaming community events, family promotions, welcome messages, and moderation hub.
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
          title="Active Event Signups"
          value={stats.eventsCount}
          subtitle="Scheduled & Open Signups"
          icon={Trophy}
          color="primary"
        />
        <StatCard
          title="Moderation Actions"
          value={stats.moderationCount}
          subtitle="Bans, Kicks, Warns & Mutes"
          icon={ShieldAlert}
          color="danger"
        />
        <StatCard
          title="Family Promotions"
          value={stats.promotionsCount}
          subtitle="Rank Changes & Demotions"
          icon={Sparkles}
          color="warning"
        />
        <StatCard
          title="Welcome Automation"
          value={stats.welcomeEnabled ? 'Active' : 'Disabled'}
          subtitle="New Member Greetings"
          icon={UserPlus}
          color="success"
        />
      </div>

      {/* CORE FUNCTIONAL MODULES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Active Server Modules</span>
          </h2>
          <span className="text-xs text-gray-400">4 Core Production Modules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <span>Event & Scrim Signups</span>
                    </h3>
                    <p className="text-xs text-gray-400">Interactive roster signups for scrims & events</p>
                  </div>
                </div>
                <Badge variant="success" className="text-xs font-bold px-3 py-1">MODULE 1 • ACTIVE</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-4 rounded-xl">
                <div className="space-y-1">
                  <span className="text-gray-400">Total Signups:</span>
                  <p className="text-white font-bold font-mono text-sm">{stats.eventsCount} Events</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Discord Embeds:</span>
                  <p className="text-purple-300 font-bold text-sm">Interactive Buttons</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link href={`/events?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-purple-600 hover:bg-purple-700">
                  <Trophy className="w-4 h-4" /> Manage Event Signups →
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 2: WELCOME SYSTEM */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Welcome & Goodbye System</span>
                    </h3>
                    <p className="text-xs text-gray-400">Automated embeds and auto-roles for new members</p>
                  </div>
                </div>
                <Badge variant="success" className="text-xs font-bold px-3 py-1">MODULE 2 • ACTIVE</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-4 rounded-xl">
                <div className="space-y-1">
                  <span className="text-gray-400">Greeting Automation:</span>
                  <p className="text-emerald-400 font-bold text-sm">{stats.welcomeEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Auto-Role Grant:</span>
                  <p className="text-white font-bold text-sm">Configured in Hub</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link href={`/welcome?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <UserPlus className="w-4 h-4" /> Configure Welcome System →
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 3: MODERATION HUB */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-rose-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold shadow-lg shadow-rose-500/20">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Moderation Hub</span>
                    </h3>
                    <p className="text-xs text-gray-400">Fast action panels, purge tools & audit tracking</p>
                  </div>
                </div>
                <Badge variant="success" className="text-xs font-bold px-3 py-1">MODULE 3 • ACTIVE</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-4 rounded-xl">
                <div className="space-y-1">
                  <span className="text-gray-400">Moderation Actions:</span>
                  <p className="text-rose-400 font-bold font-mono text-sm">{stats.moderationCount} Logged</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Slash & Panel Tools:</span>
                  <p className="text-white font-bold text-sm">Purge, Ban, Kick, Mute</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link href={`/moderation?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-rose-600 hover:bg-rose-700">
                  <ShieldAlert className="w-4 h-4" /> Open Moderation Hub →
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 4: GRAND RP PROMOTIONS */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-amber-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Promotions & Demotions</span>
                    </h3>
                    <p className="text-xs text-gray-400">Grand RP Family rank hierarchy and logs</p>
                  </div>
                </div>
                <Badge variant="success" className="text-xs font-bold px-3 py-1">MODULE 4 • ACTIVE</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-4 rounded-xl">
                <div className="space-y-1">
                  <span className="text-gray-400">Promotions Executed:</span>
                  <p className="text-amber-400 font-bold font-mono text-sm">{stats.promotionsCount} Logged</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Discord Panel:</span>
                  <p className="text-white font-bold text-sm">Interactive Buttons</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link href={`/promotions?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-amber-600 hover:bg-amber-700">
                  <Sparkles className="w-4 h-4" /> Manage Promotions →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK LINKS & CONFIGURATION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-5 h-5 text-primary" />
            Server Settings & Fast Links
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href={`/channels?guildId=${guildId}`}
            className="flex items-center justify-between p-4 bg-secondary/40 border border-border/50 rounded-xl hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-bold text-white text-sm">Channel Routes</p>
                <span className="text-xs text-gray-400">Configure audit & log channels</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href={`/staff?guildId=${guildId}`}
            className="flex items-center justify-between p-4 bg-secondary/40 border border-border/50 rounded-xl hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-bold text-white text-sm">Staff Permissions</p>
                <span className="text-xs text-gray-400">Authorize server staff roles</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
          </Link>

          <Link
            href={`/settings?guildId=${guildId}`}
            className="flex items-center justify-between p-4 bg-secondary/40 border border-border/50 rounded-xl hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-bold text-white text-sm">Guild Settings</p>
                <span className="text-xs text-gray-400">Global server configurations</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
