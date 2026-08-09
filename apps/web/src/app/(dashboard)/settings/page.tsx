'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Settings as SettingsIcon, Save, Check } from 'lucide-react';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [cooldownMinutes, setCooldownMinutes] = useState(5);
  const [autoDmEnabled, setAutoDmEnabled] = useState(true);
  const [loggingEnabled, setLoggingEnabled] = useState(true);
  const [screenshotRequired, setScreenshotRequired] = useState(false);
  const [screenshotAllowed, setScreenshotAllowed] = useState(true);
  const [onePendingOnly, setOnePendingOnly] = useState(true);
  const [defaultEmbedColor, setDefaultEmbedColor] = useState('#5865F2');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [commonRoleId, setCommonRoleId] = useState<string>('');
  const [reviewPingRoleId, setReviewPingRoleId] = useState('');
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
          setCooldownMinutes(settingsData.cooldownMinutes ?? 5);
          setAutoDmEnabled(settingsData.autoDmEnabled ?? true);
          setLoggingEnabled(settingsData.loggingEnabled ?? true);
          setScreenshotRequired(settingsData.screenshotRequired ?? false);
          setScreenshotAllowed(settingsData.screenshotAllowed ?? true);
          setOnePendingOnly(settingsData.onePendingOnly ?? true);
          setDefaultEmbedColor(settingsData.defaultEmbedColor || '#5865F2');
          setTimezone(settingsData.timezone || 'UTC');
          setLanguage(settingsData.language || 'en');
          setCommonRoleId(settingsData.commonRoleId || '');
          setReviewPingRoleId(settingsData.reviewPingRoleId || '');
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
        cooldownMinutes: Number(cooldownMinutes),
        autoDmEnabled,
        loggingEnabled,
        screenshotRequired,
        screenshotAllowed,
        onePendingOnly,
        defaultEmbedColor,
        timezone,
        language,
        commonRoleId: commonRoleId || null,
        reviewPingRoleId: reviewPingRoleId || null,
      }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Guild Platform Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Configure global application behaviors, screenshots, and automated notifications.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" /> Application Restrictions & Rules
            </CardTitle>
          </CardHeader>

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Loading settings...</div>
          ) : (
            <div className="space-y-6 divide-y divide-border/60 p-6 pt-0">
              <div className="pt-2">
                <Switch
                  label="Enforce Single Pending Application"
                  description="Prevent users from submitting duplicate applications if they already have one pending review."
                  checked={onePendingOnly}
                  onChange={setOnePendingOnly}
                />
              </div>

              <div className="pt-4">
                <Switch
                  label="Allow Screenshot Proof Attachment"
                  description="Enable screenshot proof URL input field on application modal."
                  checked={screenshotAllowed}
                  onChange={setScreenshotAllowed}
                />
              </div>

              <div className="pt-4">
                <Switch
                  label="Mandatory Screenshot Proof"
                  description="Require applicants to provide a valid screenshot URL before submitting."
                  checked={screenshotRequired}
                  onChange={setScreenshotRequired}
                />
              </div>

              <div className="pt-4">
                <Switch
                  label="Enable Automatic Direct Messages (DM)"
                  description="Send applicant an automated DM notification upon approval or rejection with reason."
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
                  Common Approved Role (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select a common/default role (e.g. Member or Verified) to automatically assign to the user alongside their requested role upon approval.
                </p>
                <select
                  value={commonRoleId}
                  onChange={(e) => setCommonRoleId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- None (Only assign requested role) --</option>
                  {roles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName} ({r.roleId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Role Application Review Ping (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select a role (or @everyone / @here) to automatically ping in the review channel whenever a user submits a role application.
                </p>
                <select
                  value={reviewPingRoleId}
                  onChange={(e) => setReviewPingRoleId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Auto-ping all configured Staff Roles --</option>
                  <option value="everyone">@everyone</option>
                  <option value="here">@here</option>
                  {roles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      @{r.roleName} ({r.roleId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Application Cooldown (Minutes)"
                  type="number"
                  value={cooldownMinutes}
                  onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                />
                <Input
                  label="Default Embed Color"
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
