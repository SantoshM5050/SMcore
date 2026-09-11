'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BarChart3, Download, ShieldAlert, AlertTriangle, Activity, Clock, UserX } from 'lucide-react';
import { AnalyticsSummary } from '@/types';

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    fetch(`/api/guilds/${guildId}/analytics`)
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [guildId]);

  const handleExportCSV = () => {
    if (!analytics) return;

    let csvContent = 'data:text/csv;charset=utf-8,Date,ModerationActions\n';
    analytics.actionsPerDay.forEach((row: { date: string; count: number }) => {
      csvContent += `${row.date},${row.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `moderation_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Security & Moderation Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time enforcement statistics, punishment trends, and raid metrics.</p>
        </div>
        <Button onClick={handleExportCSV} variant="secondary" className="gap-2 self-start sm:self-auto">
          <Download className="w-4 h-4" /> Export CSV Data
        </Button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-500 text-sm">Calculating server enforcement metrics...</div>
      ) : !analytics ? (
        <div className="py-24 text-center text-gray-500 text-sm">Failed to load analytics data.</div>
      ) : (
        <div className="space-y-8">
          {/* Key Rates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <Card className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Total Cases</p>
                <h3 className="text-3xl font-extrabold text-white">{analytics.totalCases}</h3>
                <span className="text-xs text-gray-400">Enforcement logs</span>
              </div>
            </Card>

            <Card className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Active Warnings</p>
                <h3 className="text-3xl font-extrabold text-white">{analytics.totalWarnings}</h3>
                <span className="text-xs text-gray-400">Escalations tracked</span>
              </div>
            </Card>

            <Card className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Bans & Kicks</p>
                <h3 className="text-3xl font-extrabold text-white">{analytics.totalBans + analytics.totalKicks}</h3>
                <span className="text-xs text-gray-400">{analytics.totalBans} bans, {analytics.totalKicks} kicks</span>
              </div>
            </Card>

            <Card className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Actions Today</p>
                <h3 className="text-3xl font-extrabold text-white">{analytics.actionsToday}</h3>
                <span className="text-xs text-gray-400">Last 24 Hours</span>
              </div>
            </Card>
          </div>

          {/* Daily Trend Chart Visual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Daily Moderation Actions (Last 14 Days)
              </CardTitle>
            </CardHeader>
            <div className="h-48 flex items-end justify-between gap-2 p-6 pt-0">
              {analytics.actionsPerDay.map((day: { date: string; count: number }) => {
                const maxCount = Math.max(...analytics.actionsPerDay.map((d: { count: number }) => d.count), 1);
                const heightPercent = Math.max((day.count / maxCount) * 100, 8);

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      {day.count}
                    </span>
                    <div
                      className="w-full bg-primary/80 group-hover:bg-primary rounded-t-md transition-all duration-300 shadow-md shadow-primary/20"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[9px] text-gray-500 font-mono rotate-45 md:rotate-0 mt-1">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent Moderation Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Recent Enforcements
              </CardTitle>
            </CardHeader>
            {analytics.recentCases.length === 0 ? (
              <p className="text-xs text-gray-500 p-6 pt-0 text-center">No recent moderation cases recorded yet.</p>
            ) : (
              <div className="space-y-3 p-6 pt-0">
                {analytics.recentCases.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 bg-secondary/40 border border-border/50 rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                          item.action === 'BAN' ? 'bg-rose-500/20 text-rose-400' :
                          item.action === 'KICK' ? 'bg-orange-500/20 text-orange-400' :
                          item.action === 'TIMEOUT' ? 'bg-amber-500/20 text-amber-400' :
                          item.action === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-indigo-500/20 text-indigo-400'
                        }`}>
                          {item.action}
                        </span>
                        <span className="font-semibold text-white text-sm">#{item.caseNumber} - {item.targetTag}</span>
                      </div>
                      <p className="text-xs text-gray-400">Moderator: <span className="text-gray-300">{item.moderatorTag}</span> • Reason: {item.reason || 'No reason provided'}</p>
                    </div>
                    <span className="text-xs text-gray-500 font-mono whitespace-nowrap ml-4">
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
