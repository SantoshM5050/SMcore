'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Zap, Link as LinkIcon, Mail, AtSign, Flame, Save, CheckCircle2 } from 'lucide-react';

export default function AutoModPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AutoMod configurations state
  const [antiSpam, setAntiSpam] = useState({
    enabled: true,
    maxMessages: 5,
    timeWindowSeconds: 5,
    maxDuplicates: 3,
    action: 'TIMEOUT',
    timeoutMinutes: 10,
    deleteMessages: true,
  });

  const [antiLink, setAntiLink] = useState({
    enabled: true,
    blockAll: false,
    whitelistedDomains: 'youtube.com, twitch.tv, discord.com',
    blacklistedDomains: 'grabify.link, iplogger.org',
    action: 'DELETE',
    timeoutMinutes: 10,
  });

  const [antiInvite, setAntiInvite] = useState({
    enabled: true,
    action: 'DELETE',
    timeoutMinutes: 10,
    deleteMessage: true,
  });

  const [antiMention, setAntiMention] = useState({
    enabled: true,
    maxUserMentions: 5,
    maxRoleMentions: 3,
    blockEveryone: true,
    blockHere: true,
    action: 'TIMEOUT',
    timeoutMinutes: 10,
  });

  const [antiRaid, setAntiRaid] = useState({
    enabled: true,
    joinThreshold: 10,
    windowSeconds: 10,
    action: 'LOCK_CHANNELS',
    autoRaidMode: true,
  });

  const [joinSecurity, setJoinSecurity] = useState({
    enabled: false,
    minAccountAgeDays: 3,
    blockDefaultAvatars: false,
    action: 'ALERT',
  });

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    fetch(`/api/guilds/${guildId}/automod`)
      .then((res) => res.json())
      .then((data) => {
        if (data.antiSpam) setAntiSpam((prev) => ({ ...prev, ...data.antiSpam }));
        if (data.antiLink) {
          setAntiLink({
            ...data.antiLink,
            whitelistedDomains: Array.isArray(data.antiLink.whitelistedDomains)
              ? data.antiLink.whitelistedDomains.join(', ')
              : '',
            blacklistedDomains: Array.isArray(data.antiLink.blacklistedDomains)
              ? data.antiLink.blacklistedDomains.join(', ')
              : '',
          });
        }
        if (data.antiInvite) setAntiInvite((prev) => ({ ...prev, ...data.antiInvite }));
        if (data.antiMention) setAntiMention((prev) => ({ ...prev, ...data.antiMention }));
        if (data.antiRaid) setAntiRaid((prev) => ({ ...prev, ...data.antiRaid }));
        if (data.joinSecurity) setJoinSecurity((prev) => ({ ...prev, ...data.joinSecurity }));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [guildId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        antiSpam,
        antiLink: {
          ...antiLink,
          whitelistedDomains: antiLink.whitelistedDomains
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          blacklistedDomains: antiLink.blacklistedDomains
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        antiInvite,
        antiMention,
        antiRaid,
        joinSecurity,
      };

      const res = await fetch(`/api/guilds/${guildId}/automod`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AutoMod & Anti-Raid Engines</h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure real-time automated filters, rate limiters, invite blocking, and join flood detection.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> Configuration Saved
            </span>
          )}
          <Button type="submit" variant="primary" disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-500 text-sm">Loading security configuration...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Anti-Spam Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-bold text-white">Anti-Spam Engine</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiSpam.enabled}
                  onChange={(e) => setAntiSpam({ ...antiSpam, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-gray-400">Max Messages</label>
                <Input
                  type="number"
                  min="2"
                  max="20"
                  value={antiSpam.maxMessages}
                  onChange={(e) => setAntiSpam({ ...antiSpam, maxMessages: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-gray-400">Interval (Seconds)</label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={antiSpam.timeWindowSeconds}
                  onChange={(e) => setAntiSpam({ ...antiSpam, timeWindowSeconds: parseInt(e.target.value) || 5 })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-gray-400">Max Duplicate Messages</label>
              <Input
                type="number"
                min="2"
                max="10"
                value={antiSpam.maxDuplicates}
                onChange={(e) => setAntiSpam({ ...antiSpam, maxDuplicates: parseInt(e.target.value) || 3 })}
              />
            </div>
          </Card>

          {/* Anti-Link Filter Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Anti-Link & URL Filter</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiLink.enabled}
                  onChange={(e) => setAntiLink({ ...antiLink, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="blockAllLinks"
                checked={antiLink.blockAll}
                onChange={(e) => setAntiLink({ ...antiLink, blockAll: e.target.checked })}
                className="rounded border-border bg-input"
              />
              <label htmlFor="blockAllLinks" className="text-xs font-semibold text-gray-300">
                Block All External Links (Strict Mode)
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-gray-400">Allowed Domains (Comma separated)</label>
              <Input
                type="text"
                value={antiLink.whitelistedDomains}
                onChange={(e) => setAntiLink({ ...antiLink, whitelistedDomains: e.target.value })}
                placeholder="youtube.com, twitch.tv, discord.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-gray-400">Forbidden Domains</label>
              <Input
                type="text"
                value={antiLink.blacklistedDomains}
                onChange={(e) => setAntiLink({ ...antiLink, blacklistedDomains: e.target.value })}
                placeholder="grabify.link, iplogger.org"
              />
            </div>
          </Card>

          {/* Anti-Invite Filter Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Discord Invite Blocker</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiInvite.enabled}
                  onChange={(e) => setAntiInvite({ ...antiInvite, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <p className="text-xs text-gray-400">
              Detects and deletes discord.gg, discord.com/invite, and vanity invite URLs posted by unauthorized members.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="deleteInviteMsg"
                checked={antiInvite.deleteMessage}
                onChange={(e) => setAntiInvite({ ...antiInvite, deleteMessage: e.target.checked })}
                className="rounded border-border bg-input"
              />
              <label htmlFor="deleteInviteMsg" className="text-xs font-semibold text-gray-300">
                Instantly delete invite message
              </label>
            </div>
          </Card>

          {/* Anti-Mention & Mass Ping Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <AtSign className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Mass Mention Protection</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiMention.enabled}
                  onChange={(e) => setAntiMention({ ...antiMention, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-gray-400">Max User Mentions</label>
                <Input
                  type="number"
                  min="2"
                  max="20"
                  value={antiMention.maxUserMentions}
                  onChange={(e) => setAntiMention({ ...antiMention, maxUserMentions: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-gray-400">Max Role Mentions</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={antiMention.maxRoleMentions}
                  onChange={(e) => setAntiMention({ ...antiMention, maxRoleMentions: parseInt(e.target.value) || 3 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={antiMention.blockEveryone}
                  onChange={(e) => setAntiMention({ ...antiMention, blockEveryone: e.target.checked })}
                  className="rounded border-border bg-input"
                />
                <span className="text-xs font-semibold text-gray-300">Prevent unauthorized @everyone pings</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={antiMention.blockHere}
                  onChange={(e) => setAntiMention({ ...antiMention, blockHere: e.target.checked })}
                  className="rounded border-border bg-input"
                />
                <span className="text-xs font-semibold text-gray-300">Prevent unauthorized @here pings</span>
              </label>
            </div>
          </Card>

          {/* Anti-Raid Join Detection */}
          <Card className="p-6 space-y-4 md:col-span-2">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-white">Anti-Raid Join Flood Detection</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiRaid.enabled}
                  onChange={(e) => setAntiRaid({ ...antiRaid, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-gray-400">Join Spike Threshold</label>
                <Input
                  type="number"
                  min="3"
                  max="50"
                  value={antiRaid.joinThreshold}
                  onChange={(e) => setAntiRaid({ ...antiRaid, joinThreshold: parseInt(e.target.value) || 10 })}
                />
                <span className="text-[11px] text-gray-500">Number of joins within window</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-gray-400">Detection Window (Seconds)</label>
                <Input
                  type="number"
                  min="5"
                  max="60"
                  value={antiRaid.windowSeconds}
                  onChange={(e) => setAntiRaid({ ...antiRaid, windowSeconds: parseInt(e.target.value) || 10 })}
                />
                <span className="text-[11px] text-gray-500">Sliding time window</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-gray-400">Auto Raid Action</label>
                <select
                  value={antiRaid.action}
                  onChange={(e) => setAntiRaid({ ...antiRaid, action: e.target.value })}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="LOCK_CHANNELS">Lock Channels</option>
                  <option value="ALERT_STAFF">Staff Alert Only</option>
                  <option value="KICK_RAIDERS">Auto-Kick New Joins</option>
                </select>
                <span className="text-[11px] text-gray-500">Action taken during active raid</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </form>
  );
}
