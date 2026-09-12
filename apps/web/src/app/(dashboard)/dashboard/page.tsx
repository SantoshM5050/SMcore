'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Radio,
  ScrollText,
  Hash,
  Users,
  Settings,
  Layers,
  Bot,
  Zap,
  ArrowRight,
  Shield,
  Sparkles,
  ExternalLink,
  Lock,
  BarChart3,
  UserX,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [analytics, setAnalytics] = useState<{
    totalCases: number;
    totalWarnings: number;
    autoModBlocks: number;
    actionsToday: number;
    recentCases: any[];
    raidModeActive: boolean;
  }>({
    totalCases: 0,
    totalWarnings: 0,
    autoModBlocks: 0,
    actionsToday: 0,
    recentCases: [],
    raidModeActive: false,
  });

  const [autoModSummary, setAutoModSummary] = useState<{
    spamEnabled: boolean;
    linkEnabled: boolean;
    inviteEnabled: boolean;
    mentionEnabled: boolean;
    raidEnabled: boolean;
  }>({
    spamEnabled: true,
    linkEnabled: true,
    inviteEnabled: true,
    mentionEnabled: true,
    raidEnabled: true,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/guilds/${guildId}/analytics`)
        .then((res) => res.json())
        .catch(() => ({})),
      fetch(`/api/guilds/${guildId}/automod`)
        .then((res) => res.json())
        .catch(() => ({})),
    ])
      .then(([analyticsData, automodData]) => {
        setAnalytics({
          totalCases: Number(analyticsData?.totalCases) || 0,
          totalWarnings: Number(analyticsData?.totalWarnings) || 0,
          autoModBlocks: Number(analyticsData?.autoModBlocks) || 0,
          actionsToday: Number(analyticsData?.actionsToday) || 0,
          recentCases: Array.isArray(analyticsData?.recentCases) ? analyticsData.recentCases : [],
          raidModeActive: Boolean(analyticsData?.raidModeActive),
        });

        if (automodData) {
          setAutoModSummary({
            spamEnabled: automodData.antiSpam?.enabled ?? true,
            linkEnabled: automodData.antiLink?.enabled ?? true,
            inviteEnabled: automodData.antiInvite?.enabled ?? true,
            mentionEnabled: automodData.antiMention?.enabled ?? true,
            raidEnabled: automodData.antiRaid?.enabled ?? true,
          });
        }
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (!guildId) {
    return (
      <div className="p-12 text-center text-gray-400 bg-card border border-border/80 rounded-2xl max-w-xl mx-auto my-12 shadow-xl">
        <Bot className="w-12 h-12 text-primary mx-auto mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-white mb-2">No Discord Server Selected</h2>
        <p className="text-sm text-gray-400">
          Please select your Discord server from the top bar dropdown to view server analytics and moderation controls.
        </p>
      </div>
    );
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'BAN':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'KICK':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'TIMEOUT':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'WARN':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'PURGE':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'LOCK':
      case 'UNLOCK':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Quick Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-card border border-border/80 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase">
            <Shield className="w-4 h-4" />
            <span>SMCore Enterprise Moderation SaaS</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Guild Security & Moderation Hub</h1>
          <p className="text-xs text-gray-400">
            Real-time enforcement telemetry, disciplinary ledger, automated defense shields, and staff controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <Badge variant="success" className="px-3 py-1.5 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Bot Active & Listening
          </Badge>

          <Link href={`/moderation?guildId=${guildId}`}>
            <Button variant="primary" size="sm" className="gap-2 font-bold shadow-lg shadow-primary/20">
              <ShieldAlert className="w-4 h-4" />
              Open Moderation Hub
            </Button>
          </Link>

          <Link href={`/automod?guildId=${guildId}`}>
            <Button variant="secondary" size="sm" className="gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              AutoMod Shields
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={analytics.totalCases}
          subtitle="Bans, Kicks, Warns & Mutes"
          icon={ShieldAlert}
          color="danger"
        />
        <StatCard
          title="Active Warnings"
          value={analytics.totalWarnings}
          subtitle="Active Member Infractions"
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="AutoMod Defenses"
          value={analytics.autoModBlocks}
          subtitle="Spam, Invites & Link Blocks"
          icon={ShieldCheck}
          color="success"
        />
        <StatCard
          title="Actions Today"
          value={analytics.actionsToday}
          subtitle="24-Hour Enforcement Volume"
          icon={Clock}
          color="primary"
        />
      </div>

      {/* CORE PRODUCTION MODULES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Active Server Modules</span>
          </h2>
          <span className="text-xs text-gray-400">6 Core Security & Moderation Modules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* MODULE 1: MODERATION COMMAND HUB */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-rose-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold shadow-lg shadow-rose-500/20">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Moderation Hub</h3>
                    <p className="text-xs text-gray-400">Fast action panel & bulk purge</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5">CORE • ACTIVE</Badge>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Execute instant bans, kicks, timeouts, and multi-message purges with hierarchy protection and Discord audit synchronization.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Enforcements:</span>
                  <p className="text-rose-400 font-bold font-mono text-sm">{analytics.totalCases} Total</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Fast Tools:</span>
                  <p className="text-white font-bold text-sm">Purge, Ban, Timeout</p>
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

          {/* MODULE 2: AUTOMOD & ANTI-RAID */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">AutoMod & Anti-Raid</h3>
                    <p className="text-xs text-gray-400">Automated real-time defenses</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5">SHIELD • ACTIVE</Badge>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Autonomous protection against invite links, untrusted domain URLs, rapid message spam bursts, and mass-mention raids.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Shields:</span>
                  <p className="text-emerald-400 font-bold text-sm">Spam, Links, Invites</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Raid Mode:</span>
                  <p className="text-white font-bold text-sm">{analytics.raidModeActive ? '🔴 Active' : '🟢 Ready'}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link href={`/automod?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <ShieldCheck className="w-4 h-4" /> Configure AutoMod →
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 3: WARNINGS & ESCALATION LADDER */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-amber-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Warnings & Escalation</h3>
                    <p className="text-xs text-gray-400">Automated infraction ladder</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5">POLICY • ACTIVE</Badge>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Assign strikes and configure graduated punishment ladders that automatically apply timeouts, kicks, or bans.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Active Warnings:</span>
                  <p className="text-amber-400 font-bold font-mono text-sm">{analytics.totalWarnings} Active</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Ladder Engine:</span>
                  <p className="text-white font-bold text-sm">Graduated Escalation</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link href={`/moderation/warnings?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-amber-600 hover:bg-amber-700">
                  <AlertTriangle className="w-4 h-4" /> Manage Escalation →
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 4: LOG ROUTING & FORUM INTEGRATION */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-purple-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shadow-lg shadow-purple-500/20">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Log Routing & Forum</h3>
                    <p className="text-xs text-gray-400">Multi-stream audit dispatch</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5">LOGS • ACTIVE</Badge>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Route 7 separate audit streams (Members, Voice, Channels, Roles, Mod, Messages, Server) to dedicated text channels or Forum threads.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Streams:</span>
                  <p className="text-purple-300 font-bold text-sm">7 Log Categories</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Destinations:</span>
                  <p className="text-white font-bold text-sm">Text & Forum Threads</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link href={`/logs?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-purple-600 hover:bg-purple-700">
                  <Radio className="w-4 h-4" /> Configure Log Routing →
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 5: CASES LEDGER */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-cyan-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20">
                    <ScrollText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Cases Ledger</h3>
                    <p className="text-xs text-gray-400">Searchable disciplinary history</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5">LEDGER • ACTIVE</Badge>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Immutable case registry with evidence attachment, case status tracking, appeal logs, and detailed staff audit trails.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Indexed Cases:</span>
                  <p className="text-cyan-400 font-bold font-mono text-sm">{analytics.totalCases} Cases</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Search Filters:</span>
                  <p className="text-white font-bold text-sm">User, Mod, Action</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link href={`/moderation/cases?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-cyan-600 hover:bg-cyan-700">
                  <ScrollText className="w-4 h-4" /> View Cases Ledger →
                </Button>
              </Link>
            </div>
          </div>

          {/* MODULE 6: CHANNEL CONTROLS */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-xl hover:border-indigo-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
                    <Hash className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Channel Controls</h3>
                    <p className="text-xs text-gray-400">Lockdowns & slowmode controls</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5">UTILITY • ACTIVE</Badge>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Live Discord text channel management: instantly lock/unlock channels for @everyone, calibrate slowmode rates, and manage permissions.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/40 border border-border/50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Lockdown:</span>
                  <p className="text-indigo-400 font-bold text-sm">1-Click Emergency</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Slowmode:</span>
                  <p className="text-white font-bold text-sm">Dynamic Slider</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link href={`/channels?guildId=${guildId}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Hash className="w-4 h-4" /> Manage Channels →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT MODERATION CASES TELEMETRY */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Recent Moderation Cases & Enforcements
          </CardTitle>
          <Link href={`/moderation/cases?guildId=${guildId}`}>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:text-white">
              View all in Cases Ledger <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          {analytics.recentCases && analytics.recentCases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Case #</th>
                    <th className="pb-3 font-semibold">Action</th>
                    <th className="pb-3 font-semibold">Target User</th>
                    <th className="pb-3 font-semibold">Moderator</th>
                    <th className="pb-3 font-semibold">Reason</th>
                    <th className="pb-3 font-semibold text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {analytics.recentCases.slice(0, 5).map((c: any) => (
                    <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 font-mono font-bold text-gray-300">#{c.caseNumber || c.id.slice(0, 6)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getActionBadgeColor(c.action)}`}>
                          {c.action}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-white">{c.targetTag || c.targetId}</span>
                        <span className="block text-[10px] text-gray-500 font-mono">{c.targetId}</span>
                      </td>
                      <td className="py-3 text-gray-300">{c.moderatorTag || c.moderatorId}</td>
                      <td className="py-3 text-gray-400 max-w-xs truncate">{c.reason || 'No reason specified'}</td>
                      <td className="py-3 text-right text-gray-500 font-mono">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-400/60 mx-auto" />
              <p className="text-sm font-semibold text-white">No Moderation Infractions Logged Yet</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Your server is clean! When staff take moderation actions or AutoMod triggers, disciplinary cases will be indexed here automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QUICK LINKS & CONFIGURATION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-5 h-5 text-primary" />
            Server Administration & Fast Access
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href={`/staff?guildId=${guildId}`}
            className="flex items-center justify-between p-4 bg-secondary/40 border border-border/50 rounded-xl hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-bold text-white text-sm">Staff & RBAC Permissions</p>
                <span className="text-xs text-gray-400">Configure role authorities & permissions</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
          </Link>

          <Link
            href={`/analytics?guildId=${guildId}`}
            className="flex items-center justify-between p-4 bg-secondary/40 border border-border/50 rounded-xl hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-bold text-white text-sm">Security Analytics</p>
                <span className="text-xs text-gray-400">14-day trend charts & CSV reports</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
          </Link>

          <Link
            href={`/settings?guildId=${guildId}`}
            className="flex items-center justify-between p-4 bg-secondary/40 border border-border/50 rounded-xl hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-bold text-white text-sm">Guild Settings & Sync</p>
                <span className="text-xs text-gray-400">Bot prefixes, backup export & settings</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
