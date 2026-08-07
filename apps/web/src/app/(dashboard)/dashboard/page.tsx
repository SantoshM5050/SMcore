'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Clock, CheckCircle, XCircle, Calendar, ArrowRight, ShieldCheck, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ApplicationItem } from '@/types';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '100000000000000000';

  const [stats, setStats] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    applicationsToday: 0,
  });

  const [recentApps, setRecentApps] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/guilds/${guildId}/analytics`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/applications?limit=5`).then((res) => res.json()),
    ])
      .then(([analyticsData, appData]) => {
        if (analyticsData) setStats(analyticsData);
        if (appData && appData.items) {
          setRecentApps(appData.items);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [guildId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time role request activity, metrics, and system status.</p>
        </div>
        <Link href={`/applications?guildId=${guildId}`}>
          <Button variant="primary" className="gap-2">
            View All Applications <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Pending Applications"
          value={stats.totalPending || 0}
          subtitle="Awaiting Staff Action"
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Approved Applications"
          value={stats.totalApproved || 0}
          subtitle="Granted Roles"
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="Rejected Applications"
          value={stats.totalRejected || 0}
          subtitle="Declined Requests"
          icon={XCircle}
          color="danger"
        />
        <StatCard
          title="Applications Today"
          value={stats.applicationsToday || 0}
          subtitle="Last 24 Hours"
          icon={Calendar}
          color="primary"
        />
      </div>

      {/* Server & Bot Config Banner */}
      <Card className="bg-gradient-to-r from-card via-[#161927] to-card border-primary/20 p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-xl shadow-primary/20">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Nexus Server Instance</h3>
                <Badge variant="primary">Active</Badge>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Nexus Discord Bot is listening for role application button interactions. All requests are logged in PostgreSQL.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/embed-builder?guildId=${guildId}`}>
              <Button variant="secondary" size="sm">
                Embed Builder
              </Button>
            </Link>
            <Link href={`/settings?guildId=${guildId}`}>
              <Button variant="outline" size="sm">
                Guild Settings
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Recent Applications Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Recent Role Requests
          </CardTitle>
          <Link href={`/applications?guildId=${guildId}`} className="text-xs text-primary font-semibold hover:underline">
            View All ({(stats.totalPending || 0) + (stats.totalApproved || 0) + (stats.totalRejected || 0)})
          </Link>
        </CardHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading recent applications...</div>
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
                  <th className="py-3 px-4">Rank</th>
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
