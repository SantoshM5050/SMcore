'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BarChart3, Download, Award, Users, CheckCircle, XCircle } from 'lucide-react';
import { AnalyticsSummary } from '@/types';

export default function AnalyticsPage() {
  const sampleGuildId = '100000000000000000';

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guilds/${sampleGuildId}/analytics`)
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    if (!analytics) return;

    let csvContent = 'data:text/csv;charset=utf-8,Date,Applications\n';
    analytics.applicationsPerDay.forEach((row) => {
      csvContent += `${row.date},${row.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `role_applications_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Analytics & Insights</h1>
          <p className="text-sm text-gray-400 mt-1">Application volume trends, staff performance metrics, and role demand.</p>
        </div>
        <Button onClick={handleExportCSV} variant="secondary" className="gap-2">
          <Download className="w-4 h-4" /> Export CSV Data
        </Button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-500 text-sm">Calculating analytics metrics...</div>
      ) : !analytics ? (
        <div className="py-24 text-center text-gray-500 text-sm">Failed to load analytics data.</div>
      ) : (
        <div className="space-y-8">
          {/* Key Rates Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Approval Rate</p>
                <h3 className="text-3xl font-extrabold text-white">{analytics.approvalRate}%</h3>
                <span className="text-xs text-gray-400">{analytics.totalApproved} total approved</span>
              </div>
            </Card>

            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Rejection Rate</p>
                <h3 className="text-3xl font-extrabold text-white">{analytics.rejectionRate}%</h3>
                <span className="text-xs text-gray-400">{analytics.totalRejected} total rejected</span>
              </div>
            </Card>

            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Today's Submissions</p>
                <h3 className="text-3xl font-extrabold text-white">{analytics.applicationsToday}</h3>
                <span className="text-xs text-gray-400">Last 24 Hours</span>
              </div>
            </Card>
          </div>

          {/* Daily Trend Chart Visual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Daily Application Submissions (14 Days)
              </CardTitle>
            </CardHeader>
            <div className="h-48 flex items-end justify-between gap-2 pt-6 px-4">
              {analytics.applicationsPerDay.map((day) => {
                const maxCount = Math.max(...analytics.applicationsPerDay.map((d) => d.count), 1);
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

          {/* Breakdowns Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Most Requested Roles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" /> Most Requested Roles
                </CardTitle>
              </CardHeader>
              {analytics.mostRequestedRoles.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No role data available yet.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.mostRequestedRoles.map((role) => (
                    <div key={role.roleName} className="flex items-center justify-between p-3 bg-secondary/40 border border-border/50 rounded-lg">
                      <span className="font-semibold text-white text-sm">{role.roleName}</span>
                      <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold">
                        {role.count} requests
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Most Active Staff Reviewers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" /> Most Active Staff Reviewers
                </CardTitle>
              </CardHeader>
              {analytics.mostActiveStaff.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No staff review activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.mostActiveStaff.map((staff) => (
                    <div key={staff.staffTag} className="flex items-center justify-between p-3 bg-secondary/40 border border-border/50 rounded-lg">
                      <span className="font-bold text-gray-200 text-sm">{staff.staffTag}</span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                        {staff.count} reviews
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
