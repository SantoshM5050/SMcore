'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Settings as SettingsIcon, Save, Check, Database } from 'lucide-react';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [autoDmEnabled, setAutoDmEnabled] = useState(true);
  const [loggingEnabled, setLoggingEnabled] = useState(true);
  const [defaultEmbedColor, setDefaultEmbedColor] = useState('#5865F2');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [commonRoleId, setCommonRoleId] = useState<string>('');
  const [roles, setRoles] = useState<{ roleId: string; roleName: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!guildId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    Promise.all([
      fetch(`/api/guilds/${guildId}/settings`).then((res) => res.json()).catch(() => null),
      fetch(`/api/guilds/${guildId}/roles`).then((res) => res.json()).catch(() => []),
    ])
      .then(([settingsData, rolesData]) => {
        if (settingsData && !settingsData.error) {
          setAutoDmEnabled(settingsData.autoDmEnabled ?? true);
          setLoggingEnabled(settingsData.loggingEnabled ?? true);
          setDefaultEmbedColor(settingsData.defaultEmbedColor || '#5865F2');
          setTimezone(settingsData.timezone || 'UTC');
          setLanguage(settingsData.language || 'en');
          setCommonRoleId(settingsData.commonRoleId || '');
        }
        if (Array.isArray(rolesData)) {
          setRoles(rolesData);
        }
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    await fetch(`/api/guilds/${guildId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoDmEnabled,
        loggingEnabled,
        defaultEmbedColor,
        timezone,
        language,
        commonRoleId: commonRoleId || null,
      }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const [syncingDb, setSyncingDb] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSyncDb = async () => {
    setSyncingDb(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/db-push');
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMessage('✅ Production Database Schema synced successfully!');
      } else {
        setSyncMessage(`❌ ${data.error || 'Failed to sync database.'}`);
      }
    } catch (err: any) {
      setSyncMessage(`❌ Error: ${err.message}`);
    } finally {
      setSyncingDb(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Guild Platform Settings</h1>
          <p className="text-sm text-gray-400 mt-1">Configure global server behaviors, notification preferences, and embed aesthetics.</p>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSyncDb}
            disabled={syncingDb}
            className="text-xs gap-2 border border-purple-500/30 hover:border-purple-500/60"
          >
            <Database className="w-4 h-4 text-purple-400" />
            {syncingDb ? 'Syncing Schema...' : 'Sync Production Database'}
          </Button>
          {syncMessage && (
            <div className={`text-xs font-semibold mt-1.5 ${syncMessage.startsWith('✅') ? 'text-emerald-400' : 'text-rose-400'}`}>
              {syncMessage}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" /> Global Server & Bot Automation Settings
            </CardTitle>
          </CardHeader>

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Loading settings...</div>
          ) : (
            <div className="space-y-6 divide-y divide-border/60 p-6 pt-0">
              <div className="pt-2">
                <Switch
                  label="Enable Automatic Direct Messages (DM)"
                  description="Send members automated DM notifications for important server actions and promotions."
                  checked={autoDmEnabled}
                  onChange={setAutoDmEnabled}
                />
              </div>

              <div className="pt-4">
                <Switch
                  label="Enable System Audit Logging"
                  description="Record actions to PostgreSQL and send audit logs to the Discord Logs channel."
                  checked={loggingEnabled}
                  onChange={setLoggingEnabled}
                />
              </div>

              <div className="pt-4 space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Default Member Server Role (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select a common/default role (e.g. Member or Verified) for server member identification.
                </p>
                <select
                  value={commonRoleId}
                  onChange={(e) => setCommonRoleId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- None --</option>
                  {roles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName} ({r.roleId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Default Embed Color (Hex)"
                  value={defaultEmbedColor}
                  onChange={(e) => setDefaultEmbedColor(e.target.value)}
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-border flex items-center justify-between p-6">
            {saved && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Settings updated!
              </span>
            )}
            {!saved && <div />}
            <Button type="submit" variant="primary" className="gap-2">
              <Save className="w-4 h-4" /> Save Settings
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
