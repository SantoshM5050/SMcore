'use client';

import React, { useEffect, useState } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient } from '@/lib/api/apiClient';

interface SecuritySettings {
  antiRaidEnabled: boolean;
  joinThreshold: number;
  slidingWindowSeconds: number;
  autoLockdown: boolean;
  lockdownDurationMinutes: number;

  quarantineEnabled: boolean;
  quarantineRoleId: string;
  quarantineChannelId: string;

  accountAgeRiskEnabled: boolean;
  minAccountAgeDays: number;
  suspiciousAccountAction: string;

  raidModeEnabled: boolean;
}

const DEFAULT_SECURITY: SecuritySettings = {
  antiRaidEnabled: false,
  joinThreshold: 8,
  slidingWindowSeconds: 10,
  autoLockdown: true,
  lockdownDurationMinutes: 30,

  quarantineEnabled: false,
  quarantineRoleId: '',
  quarantineChannelId: '',

  accountAgeRiskEnabled: false,
  minAccountAgeDays: 7,
  suspiciousAccountAction: 'QUARANTINE',

  raidModeEnabled: false,
};

export default function SecurityAntiRaidPage() {
  const { selectedGuildId } = useGuild();
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [initialSettings, setInitialSettings] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [raidStatus, setRaidStatus] = useState<{
    active: boolean;
    recentJoins: number;
    quarantinedCount: number;
  }>({
    active: false,
    recentJoins: 0,
    quarantinedCount: 0,
  });

  const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  useEffect(() => {
    let isMounted = true;
    async function loadSecurity() {
      if (!selectedGuildId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [secRes, statRes] = await Promise.all([
          apiClient.getSecuritySettings(selectedGuildId),
          apiClient.getRaidStatus(selectedGuildId),
        ]);

        if (isMounted) {
          if (secRes.success && secRes.data) {
            const d = secRes.data;
            const mapped: SecuritySettings = {
              antiRaidEnabled: d.raidDetectionEnabled ?? false,
              joinThreshold: d.raidJoinThreshold ?? 8,
              slidingWindowSeconds: d.raidWindowSeconds ?? 10,
              autoLockdown: d.enabled ?? true,
              lockdownDurationMinutes: Math.floor((d.raidModeDurationSeconds ?? 1800) / 60),
              quarantineEnabled: d.quarantineEnabled ?? false,
              quarantineRoleId: d.quarantineRoleId || '',
              quarantineChannelId: '',
              accountAgeRiskEnabled: d.accountAgeProtectionEnabled ?? false,
              minAccountAgeDays: Math.floor((d.minimumAccountAgeHours ?? 168) / 24),
              suspiciousAccountAction: d.accountAgeAction ?? 'QUARANTINE',
              raidModeEnabled: d.raidModeEnabled ?? false,
            };
            setSettings(mapped);
            setInitialSettings(mapped);
          }
          if (statRes.success && statRes.data) {
            setRaidStatus({
              active: statRes.data.active || false,
              recentJoins: statRes.data.recentJoins || 0,
              quarantinedCount: statRes.data.quarantinedCount || 0,
            });
          }
        }
      } catch {
        if (isMounted) {
          setSettings(DEFAULT_SECURITY);
          setInitialSettings(DEFAULT_SECURITY);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSecurity();
    return () => {
      isMounted = false;
    };
  }, [selectedGuildId]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusBanner(null);
    try {
      const payload = {
        enabled: settings.autoLockdown,
        raidDetectionEnabled: settings.antiRaidEnabled,
        raidJoinThreshold: settings.joinThreshold,
        raidWindowSeconds: settings.slidingWindowSeconds,
        raidModeDurationSeconds: settings.lockdownDurationMinutes * 60,
        quarantineEnabled: settings.quarantineEnabled,
        quarantineRoleId: settings.quarantineRoleId.trim() || null,
        accountAgeProtectionEnabled: settings.accountAgeRiskEnabled,
        minimumAccountAgeHours: settings.minAccountAgeDays * 24,
        accountAgeAction: settings.suspiciousAccountAction,
      };
      const res = await apiClient.updateSecuritySettings(selectedGuildId, payload);
      if (res.success) {
        setInitialSettings(settings);
        setStatusBanner('Security policies deployed successfully.');
      } else {
        setStatusBanner(res.error?.message || 'Failed to save security settings.');
      }
    } catch (err) {
      setStatusBanner(err instanceof Error ? err.message : 'Error updating security settings.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusBanner(null), 4000);
    }
  };

  const handleToggleLockdown = async () => {
    const nextState = !settings.raidModeEnabled;
    try {
      const res = await apiClient.security.toggleRaidMode(selectedGuildId, {
        engage: nextState,
        reason: nextState ? 'Manual raid mode engaged via dashboard' : 'Manual raid mode lifted via dashboard',
      });
      if (res.success) {
        setSettings((prev) => ({ ...prev, raidModeEnabled: nextState }));
        setRaidStatus((prev) => ({ ...prev, active: nextState }));
        setStatusBanner(res.data?.message || (nextState ? 'Raid lockdown engaged' : 'Raid lockdown lifted'));
      } else {
        setStatusBanner(res.error?.message || 'Failed to toggle raid mode on Discord bot');
      }
    } catch (err) {
      setStatusBanner(err instanceof Error ? err.message : 'Error toggling raid mode');
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest/60 border-b border-outline-variant/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>AUTOMOD & SECURITY</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">ANTI-RAID & QUARANTINE</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-error">
              SURGE DEFENSE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Anti-Raid Defense Matrix
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error-container/20 text-error font-mono text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
              Surge Gate Operational
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {statusBanner && (
            <span className="text-xs font-mono text-tertiary bg-tertiary-container/20 px-3 py-1 rounded-lg border border-tertiary/30 animate-fade-in">
              {statusBanner}
            </span>
          )}
          <button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isDirty && !isSaving
                ? 'bg-primary-container text-on-primary-container shadow-primary-container/25 hover:bg-primary-container/90 cursor-pointer'
                : 'bg-surface-container text-outline opacity-60 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">security</span>
            <span>{isSaving ? 'Deploying...' : 'Deploy Security Changes'}</span>
          </button>
        </div>
      </div>

      {/* Live Raid Status Banner Strip */}
      <div className="px-6 py-4">
        <div
          className={`p-5 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${
            settings.raidModeEnabled || raidStatus.active
              ? 'bg-error-container/30 border-error/50 shadow-lg shadow-error/10'
              : 'bg-surface-container-low border-outline-variant/30'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                settings.raidModeEnabled || raidStatus.active
                  ? 'bg-error text-on-error animate-pulse'
                  : 'bg-surface-container text-tertiary'
              }`}
            >
              <span className="material-symbols-outlined text-[28px]">
                {settings.raidModeEnabled || raidStatus.active ? 'lock' : 'verified_user'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-on-surface">
                  {settings.raidModeEnabled || raidStatus.active
                    ? 'EMERGENCY RAID LOCKDOWN ACTIVE'
                    : 'Surge Shield Status: Nominal'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    settings.raidModeEnabled || raidStatus.active
                      ? 'bg-error text-on-error'
                      : 'bg-tertiary-container/30 text-tertiary'
                  }`}
                >
                  {settings.raidModeEnabled || raidStatus.active ? 'ENGAGED' : 'MONITORING'}
                </span>
              </div>
              <p className="text-xs text-outline mt-0.5">
                {settings.raidModeEnabled || raidStatus.active
                  ? 'Incoming member joins are actively gated, quarantined, or deferred.'
                  : 'Sliding window join rate is currently within safe operational thresholds.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-xs font-mono border-r border-outline-variant/30 pr-4">
              <div>
                <span className="text-outline block text-[10px]">JOINS (10S)</span>
                <span className="text-base font-bold text-on-surface">{raidStatus.recentJoins}</span>
              </div>
              <div>
                <span className="text-outline block text-[10px]">QUARANTINED</span>
                <span className="text-base font-bold text-secondary">
                  {raidStatus.quarantinedCount}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleLockdown}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                settings.raidModeEnabled || raidStatus.active
                  ? 'bg-surface-container-high hover:bg-surface-bright text-on-surface'
                  : 'bg-error-container hover:bg-error-container/80 text-on-error-container'
              }`}
            >
              {settings.raidModeEnabled || raidStatus.active
                ? 'Lift Server Lockdown'
                : 'Engage Emergency Lockdown'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Anti-Raid & Quarantine Configuration */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Anti-Raid Surge Thresholds */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">shield</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Surge Detection Sensitivity</h3>
                <p className="text-[11px] text-outline">
                  Sliding-window threshold parameters for mass token raids
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.antiRaidEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, antiRaidEnabled: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Join Threshold (Accounts)
              </label>
              <input
                type="number"
                min={2}
                max={50}
                value={settings.joinThreshold}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    joinThreshold: parseInt(e.target.value, 10) || 8,
                  }))
                }
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Sliding Window (Seconds)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={settings.slidingWindowSeconds}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    slidingWindowSeconds: parseInt(e.target.value, 10) || 10,
                  }))
                }
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoLockdown}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, autoLockdown: e.target.checked }))
                }
                className="rounded bg-surface-container border-outline-variant"
              />
              <span className="text-on-surface">
                Automatically trigger lockdown when threshold is breached
              </span>
            </label>

            <div className="pt-1">
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Auto-Lockdown Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={settings.lockdownDurationMinutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    lockdownDurationMinutes: parseInt(e.target.value, 10) || 30,
                  }))
                }
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quarantine & Gate Settings */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-tertiary text-[22px]">
                medical_services
              </span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Quarantine Zone Routing</h3>
                <p className="text-[11px] text-outline">
                  Isolate suspect joins until cleared by staff
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.quarantineEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, quarantineEnabled: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Quarantine Role Snowflake ID
              </label>
              <input
                type="text"
                value={settings.quarantineRoleId}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, quarantineRoleId: e.target.value }))
                }
                placeholder="Role Snowflake ID..."
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Quarantine Channel ID
              </label>
              <input
                type="text"
                value={settings.quarantineChannelId}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, quarantineChannelId: e.target.value }))
                }
                placeholder="Channel Snowflake ID..."
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-outline-variant/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-on-surface">Account Age Risk Gate</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.accountAgeRiskEnabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        accountAgeRiskEnabled: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                    Min Age (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={settings.minAccountAgeDays}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        minAccountAgeDays: parseInt(e.target.value, 10) || 7,
                      }))
                    }
                    className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                    Action on New Account
                  </label>
                  <select
                    value={settings.suspiciousAccountAction}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        suspiciousAccountAction: e.target.value,
                      }))
                    }
                    className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 text-xs focus:outline-none"
                  >
                    <option value="QUARANTINE">Quarantine</option>
                    <option value="KICK">Kick</option>
                    <option value="NOTIFY">Log Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
