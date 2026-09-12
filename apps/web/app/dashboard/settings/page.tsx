'use client';

import React, { useState } from 'react';
import { useGuild } from '@/lib/context/guildContext';

interface GuildConfig {
  prefix: string;
  modLogChannelId: string;
  automodLogChannelId: string;
  securityLogChannelId: string;
  dmOnPunish: boolean;
  dmAppealLink: string;
  enforceHierarchy: boolean;
}

export default function GuildSettingsPage() {
  const { selectedGuildId, availableGuilds } = useGuild();
  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId) || {
    name: 'Apex Network',
    id: selectedGuildId,
  };

  const [config, setConfig] = useState<GuildConfig>({
    prefix: '!',
    modLogChannelId: '123456789012345681',
    automodLogChannelId: '123456789012345682',
    securityLogChannelId: '123456789012345683',
    dmOnPunish: true,
    dmAppealLink: 'https://appeal.smcore.network',
    enforceHierarchy: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    setTimeout(() => {
      setIsSaving(false);
      setSaveStatus('Guild configuration updated successfully.');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 600);
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest/60 border-b border-outline-variant/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>CONFIGURATION</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">GUILD SETTINGS</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-tertiary">
              SERVER POLICY
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Guild Operations & Routing
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-mono text-[11px] font-medium">
              {currentGuild.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs font-mono text-tertiary bg-tertiary-container/20 px-3 py-1 rounded-lg border border-tertiary/30 animate-fade-in">
              {saveStatus}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary-container text-on-primary-container hover:bg-primary-container/90 transition-all shadow-md shadow-primary-container/20"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="px-6 py-4 max-w-4xl space-y-6 text-xs">
        {/* Log Channel Routing */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
            <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Granular Log Channel Routing</h3>
              <p className="text-[11px] text-outline">
                Route events into dedicated Discord audit channels
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Moderation Logs Channel
              </label>
              <input
                type="text"
                value={config.modLogChannelId}
                onChange={(e) => setConfig((prev) => ({ ...prev, modLogChannelId: e.target.value }))}
                placeholder="Snowflake Channel ID..."
                className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                AutoMod Alerts Channel
              </label>
              <input
                type="text"
                value={config.automodLogChannelId}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, automodLogChannelId: e.target.value }))
                }
                placeholder="Snowflake Channel ID..."
                className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Anti-Raid Incident Channel
              </label>
              <input
                type="text"
                value={config.securityLogChannelId}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, securityLogChannelId: e.target.value }))
                }
                placeholder="Snowflake Channel ID..."
                className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Member DM & Notification Policies */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
            <span className="material-symbols-outlined text-secondary text-[22px]">send</span>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Member DM Notification Policy</h3>
              <p className="text-[11px] text-outline">
                Configure direct message delivery on warnings, timeouts, and bans
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.dmOnPunish}
                onChange={(e) => setConfig((prev) => ({ ...prev, dmOnPunish: e.target.checked }))}
                className="rounded bg-surface-container border-outline-variant"
              />
              <div>
                <span className="text-on-surface font-semibold block">DM Offender on Infraction</span>
                <span className="text-outline text-[11px] block">
                  Sends formatted embed with case ID, infraction reason, and appeal URL
                </span>
              </div>
            </label>

            <div className="pt-2">
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Official Server Appeal URL
              </label>
              <input
                type="url"
                value={config.dmAppealLink}
                onChange={(e) => setConfig((prev) => ({ ...prev, dmAppealLink: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Security Hierarchy Enforcement */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
            <span className="material-symbols-outlined text-tertiary text-[22px]">verified_user</span>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Role Hierarchy Safeguards</h3>
              <p className="text-[11px] text-outline">
                Enterprise role position validation
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-on-surface font-semibold block">Strict Hierarchy Gating</span>
              <span className="text-outline text-[11px] block">
                Prevents staff members from moderating members with equal or higher roles
              </span>
            </div>
            <span className="px-2.5 py-1 rounded bg-tertiary-container/30 text-tertiary font-mono text-[11px] font-bold">
              LOCKED ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
