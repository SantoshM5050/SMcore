'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient, GuildSettingsData } from '@/lib/api/apiClient';

export default function GuildSettingsPage() {
  const { selectedGuildId, availableGuilds } = useGuild();
  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId) || {
    name: selectedGuildId ? `Guild ${selectedGuildId}` : 'No Server Selected',
    id: selectedGuildId,
  };

  const [settings, setSettings] = useState<GuildSettingsData>({
    guildId: selectedGuildId,
    prefix: '!',
    language: 'en-US',
    timezone: 'UTC',
    modLogChannelId: null,
    actionLogChannelId: null,
    muteRoleId: null,
    appealUrl: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    if (!selectedGuildId) return;
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.settings.get(selectedGuildId);
      if (res.success && res.data) {
        setSettings(res.data);
      } else if (res.error?.message) {
        setStatusMessage({ type: 'error', text: res.error.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load guild configuration';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuildId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.settings.update(selectedGuildId, {
        prefix: settings.prefix.trim() || '!',
        language: settings.language,
        timezone: settings.timezone,
        modLogChannelId: settings.modLogChannelId?.trim() || null,
        actionLogChannelId: settings.actionLogChannelId?.trim() || null,
        muteRoleId: settings.muteRoleId?.trim() || null,
        appealUrl: settings.appealUrl?.trim() || null,
      });

      if (res.success && res.data) {
        setSettings(res.data);
        setStatusMessage({ type: 'success', text: 'Guild settings saved to database successfully.' });
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to update settings.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error saving settings.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
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
          {statusMessage && (
            <span
              className={`text-xs font-mono px-3 py-1 rounded-lg border animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'text-tertiary bg-tertiary-container/20 border-tertiary/30'
                  : 'text-error bg-error-container/20 border-error/30'
              }`}
            >
              {statusMessage.text}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary-container text-on-primary-container hover:bg-primary-container/90 transition-all shadow-md shadow-primary-container/20 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSaving ? 'animate-spin' : ''}`}>
              {isSaving ? 'progress_activity' : 'save'}
            </span>
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="px-6 py-12 flex items-center justify-center gap-2 text-outline text-xs">
          <span className="material-symbols-outlined animate-spin text-primary text-[20px]">
            progress_activity
          </span>
          <span>Loading guild configuration from database...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="px-6 py-4 max-w-4xl space-y-6 text-xs">
          {/* General Command Prefix & Localization */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
              <span className="material-symbols-outlined text-primary text-[22px]">terminal</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Command Invocation & Locale</h3>
                <p className="text-[11px] text-outline">
                  Configure prefix fallback and guild localization parameters
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                  Command Prefix
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={settings.prefix}
                  onChange={(e) => setSettings((prev) => ({ ...prev, prefix: e.target.value }))}
                  placeholder="!"
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                  Language Locale
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings((prev) => ({ ...prev, language: e.target.value }))}
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
                >
                  <option value="en-US">English (en-US)</option>
                  <option value="en-GB">English (en-GB)</option>
                  <option value="de">German (de)</option>
                  <option value="fr">French (fr)</option>
                  <option value="es-ES">Spanish (es-ES)</option>
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                  Display Timezone
                </label>
                <input
                  type="text"
                  value={settings.timezone}
                  onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                  placeholder="UTC"
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Log Channel Routing */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
              <span className="material-symbols-outlined text-tertiary text-[22px]">tune</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Granular Log Channel Routing</h3>
                <p className="text-[11px] text-outline">
                  Route security events into dedicated Discord audit channels by Snowflake ID
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                  Moderation Log Channel ID
                </label>
                <input
                  type="text"
                  value={settings.modLogChannelId || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, modLogChannelId: e.target.value || null }))
                  }
                  placeholder="e.g. 1288178101817315410"
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-outline font-mono mt-1 block">
                  Logs case creations, warnings, timeouts, and member bans.
                </span>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                  Action & Security Log Channel ID
                </label>
                <input
                  type="text"
                  value={settings.actionLogChannelId || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, actionLogChannelId: e.target.value || null }))
                  }
                  placeholder="e.g. 1288178101817315411"
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-outline font-mono mt-1 block">
                  Logs AutoMod filter violations, raid-mode events, and lock actions.
                </span>
              </div>
            </div>
          </div>

          {/* Mute Role & Appeal Configuration */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
              <span className="material-symbols-outlined text-secondary text-[22px]">policy</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Penalties & Infraction Policy</h3>
                <p className="text-[11px] text-outline">
                  Configure fallback isolation roles and infraction appeal destination
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                  Mute / Isolation Role ID
                </label>
                <input
                  type="text"
                  value={settings.muteRoleId || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, muteRoleId: e.target.value || null }))
                  }
                  placeholder="Snowflake Role ID..."
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-outline font-mono mt-1 block">
                  Optional legacy isolation role for servers preferring role-based mutes over native Discord timeouts.
                </span>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                  Official Moderation Appeal URL
                </label>
                <input
                  type="url"
                  value={settings.appealUrl || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, appealUrl: e.target.value || null }))
                  }
                  placeholder="https://appeals.yourserver.com"
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-outline font-mono mt-1 block">
                  Sent to penalized members in direct messages to submit formal moderation appeals.
                </span>
              </div>
            </div>
          </div>

          {/* Security Hierarchy Enforcement Notice */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
              <span className="material-symbols-outlined text-tertiary text-[22px]">verified_user</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Role Hierarchy Safeguards</h3>
                <p className="text-[11px] text-outline">
                  Built-in Discord permission and role position validation
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-on-surface font-semibold block">Strict Hierarchy Gating</span>
                <span className="text-outline text-[11px] block">
                  Prevents staff members from executing infractions against members with equal or higher roles than themselves or the bot.
                </span>
              </div>
              <span className="px-2.5 py-1 rounded bg-tertiary-container/30 text-tertiary font-mono text-[11px] font-bold">
                ENFORCED BY BOT
              </span>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
