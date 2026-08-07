'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Hash, Check, Save } from 'lucide-react';

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export default function ChannelsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '100000000000000000';

  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [requestChannelId, setRequestChannelId] = useState<string>('');
  const [reviewChannelId, setReviewChannelId] = useState<string>('');
  const [logsChannelId, setLogsChannelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/guilds/${guildId}/channels`)
      .then((res) => res.json())
      .then((data) => {
        if (data.discordChannels) setChannels(data.discordChannels);
        if (data.config) {
          setRequestChannelId(data.config.requestChannelId || '');
          setReviewChannelId(data.config.reviewChannelId || '');
          setLogsChannelId(data.config.logsChannelId || '');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [guildId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    await fetch(`/api/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestChannelId: requestChannelId || null,
        reviewChannelId: reviewChannelId || null,
        logsChannelId: logsChannelId || null,
      }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Channel Configurations</h1>
        <p className="text-sm text-gray-400 mt-1">
          Select target Discord channels for panels, reviews, and audit logs directly from the list.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" /> Discord Channel Selection
            </CardTitle>
          </CardHeader>

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Fetching Discord text channels...</div>
          ) : (
            <div className="space-y-6 p-6 pt-0">
              {/* Role Request Channel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Role Request Channel (Panel Host)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  The permanent application panel embed with the Apply button will be deployed into this channel.
                </p>
                <select
                  value={requestChannelId}
                  onChange={(e) => setRequestChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a channel...</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Review Channel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Review Channel (Staff Inspection)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  All submitted role request applications will be posted into this private staff channel for review.
                </p>
                <select
                  value={reviewChannelId}
                  onChange={(e) => setReviewChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a channel...</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Logs Channel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Audit Logs Channel
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  System events, approvals, rejections, and setting changes will be logged into this channel.
                </p>
                <select
                  value={logsChannelId}
                  onChange={(e) => setLogsChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a channel...</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} (ID: {ch.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-border flex items-center justify-between p-6">
            {saved && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Channel settings saved successfully!
              </span>
            )}
            {!saved && <div />}
            <Button type="submit" variant="primary" className="gap-2">
              <Save className="w-4 h-4" /> Save Channels Configuration
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
