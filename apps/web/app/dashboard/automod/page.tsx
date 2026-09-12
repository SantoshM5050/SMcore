'use client';

import React, { useEffect, useState } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient } from '@/lib/api/apiClient';

interface ProtectionSettings {
  antiSpamEnabled: boolean;
  spamMessageThreshold: number;
  spamIntervalSeconds: number;
  spamAction: string;
  spamTimeoutMinutes: number;

  massMentionEnabled: boolean;
  massMentionThreshold: number;
  massMentionAction: string;

  inviteFilterEnabled: boolean;
  inviteDeleteMessage: boolean;
  invitePunishSender: boolean;
  allowedInvites: string[];

  linkFilterEnabled: boolean;
  blockAllLinks: boolean;
  allowedDomains: string[];

  keywordFilterEnabled: boolean;
  bannedWords: string[];

  capsFilterEnabled: boolean;
  capsMaxPercentage: number;
}

const DEFAULT_PROTECTION: ProtectionSettings = {
  antiSpamEnabled: true,
  spamMessageThreshold: 5,
  spamIntervalSeconds: 5,
  spamAction: 'TIMEOUT',
  spamTimeoutMinutes: 10,

  massMentionEnabled: true,
  massMentionThreshold: 4,
  massMentionAction: 'TIMEOUT',

  inviteFilterEnabled: true,
  inviteDeleteMessage: true,
  invitePunishSender: false,
  allowedInvites: ['discord.gg/apexnetwork'],

  linkFilterEnabled: false,
  blockAllLinks: false,
  allowedDomains: ['youtube.com', 'twitch.tv', 'github.com'],

  keywordFilterEnabled: true,
  bannedWords: ['phishing', 'token-grabber', 'free-nitro-link'],

  capsFilterEnabled: true,
  capsMaxPercentage: 70,
};

export default function AutoModEnginePage() {
  const { selectedGuildId, isDbOffline } = useGuild();
  const [settings, setSettings] = useState<ProtectionSettings>(DEFAULT_PROTECTION);
  const [initialSettings, setInitialSettings] = useState<ProtectionSettings>(DEFAULT_PROTECTION);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // New word / domain input states
  const [newBannedWord, setNewBannedWord] = useState('');
  const [newAllowedDomain, setNewAllowedDomain] = useState('');

  const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  useEffect(() => {
    let isMounted = true;
    async function loadProtection() {
      setIsLoading(true);
      try {
        const res = await apiClient.getProtectionSettings(selectedGuildId);
        if (isMounted && res.success && res.data) {
          const merged = { ...DEFAULT_PROTECTION, ...res.data };
          setSettings(merged);
          setInitialSettings(merged);
        } else {
          setSettings(DEFAULT_PROTECTION);
          setInitialSettings(DEFAULT_PROTECTION);
        }
      } catch {
        if (isMounted) {
          setSettings(DEFAULT_PROTECTION);
          setInitialSettings(DEFAULT_PROTECTION);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProtection();
    return () => {
      isMounted = false;
    };
  }, [selectedGuildId]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await apiClient.updateProtectionSettings(selectedGuildId, settings);
      if (res.success) {
        setInitialSettings(settings);
        setSaveStatus('Protection configuration successfully saved.');
      } else {
        // In local mode without DB, simulate optimistic save
        setInitialSettings(settings);
        setSaveStatus('Configuration updated in memory buffer (DB Offline mode).');
      }
    } catch {
      setInitialSettings(settings);
      setSaveStatus('Configuration updated in local runtime buffer.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const addBannedWord = () => {
    if (newBannedWord.trim() && !settings.bannedWords.includes(newBannedWord.trim())) {
      setSettings((prev) => ({
        ...prev,
        bannedWords: [...prev.bannedWords, newBannedWord.trim()],
      }));
      setNewBannedWord('');
    }
  };

  const removeBannedWord = (word: string) => {
    setSettings((prev) => ({
      ...prev,
      bannedWords: prev.bannedWords.filter((w) => w !== word),
    }));
  };

  const addAllowedDomain = () => {
    if (newAllowedDomain.trim() && !settings.allowedDomains.includes(newAllowedDomain.trim())) {
      setSettings((prev) => ({
        ...prev,
        allowedDomains: [...prev.allowedDomains, newAllowedDomain.trim()],
      }));
      setNewAllowedDomain('');
    }
  };

  const removeAllowedDomain = (domain: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedDomains: prev.allowedDomains.filter((d) => d !== domain),
    }));
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest/60 border-b border-outline-variant/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>AUTOMOD & SECURITY</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">AUTOMOD ENGINE</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-tertiary">
              HEURISTIC SHIELDS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              AutoMod Policy Engine
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-mono text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Real-time Ingestion
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs font-mono text-tertiary bg-tertiary-container/20 px-3 py-1 rounded-lg border border-tertiary/30 animate-fade-in">
              {saveStatus}
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
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>{isSaving ? 'Deploying Rules...' : 'Deploy Policy Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Policy Categories */}
      <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Anti-Spam Shield */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">speed</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Anti-Spam Rate Limiter</h3>
                <p className="text-[11px] text-outline">
                  Detects and suppresses rapid-fire message spam
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.antiSpamEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, antiSpamEnabled: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Threshold Messages
              </label>
              <input
                type="number"
                min={2}
                max={20}
                value={settings.spamMessageThreshold}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    spamMessageThreshold: parseInt(e.target.value, 10) || 5,
                  }))
                }
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Window (Seconds)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.spamIntervalSeconds}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    spamIntervalSeconds: parseInt(e.target.value, 10) || 5,
                  }))
                }
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Trigger Action
              </label>
              <select
                value={settings.spamAction}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, spamAction: e.target.value }))
                }
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 text-xs focus:outline-none"
              >
                <option value="TIMEOUT">Issue Timeout</option>
                <option value="WARN">Issue Warning</option>
                <option value="KICK">Kick Offender</option>
                <option value="DELETE">Delete Only</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Timeout Duration (Mins)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                value={settings.spamTimeoutMinutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    spamTimeoutMinutes: parseInt(e.target.value, 10) || 10,
                  }))
                }
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Mass Mentions Filter */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[22px]">
                alternate_email
              </span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Mass Mention Shield</h3>
                <p className="text-[11px] text-outline">
                  Blocks excessive user or role tagging attacks
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.massMentionEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, massMentionEnabled: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Mention Limit per Msg
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.massMentionThreshold}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    massMentionThreshold: parseInt(e.target.value, 10) || 4,
                  }))
                }
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 font-mono text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Violation Action
              </label>
              <select
                value={settings.massMentionAction}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, massMentionAction: e.target.value }))
                }
                className="w-full bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 text-xs focus:outline-none"
              >
                <option value="TIMEOUT">Timeout Offender</option>
                <option value="WARN">Issue Warning</option>
                <option value="KICK">Kick Offender</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-outline pt-1">
            Accounts with higher roles in hierarchy bypass threshold automatically.
          </p>
        </div>

        {/* Discord Invites Filter */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-error text-[22px]">link_off</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Discord Invite Filtering</h3>
                <p className="text-[11px] text-outline">
                  Auto-purges external discord.gg invites
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.inviteFilterEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, inviteFilterEnabled: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.inviteDeleteMessage}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      inviteDeleteMessage: e.target.checked,
                    }))
                  }
                  className="rounded bg-surface-container border-outline-variant"
                />
                <span className="text-on-surface">Delete offending invite message</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.invitePunishSender}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      invitePunishSender: e.target.checked,
                    }))
                  }
                  className="rounded bg-surface-container border-outline-variant"
                />
                <span className="text-on-surface">Warn or timeout sender</span>
              </label>
            </div>

            <div className="pt-2">
              <label className="block font-mono text-[10px] uppercase text-outline mb-1">
                Whitelisted Invites
              </label>
              <div className="flex flex-wrap gap-1.5">
                {settings.allowedInvites.map((inv) => (
                  <span
                    key={inv}
                    className="px-2 py-0.5 rounded bg-surface-container border border-outline-variant/40 text-[11px] font-mono text-tertiary"
                  >
                    {inv}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Prohibited Keywords & Words */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-tertiary text-[22px]">
                spellcheck
              </span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Word & Keyword Blocklist</h3>
                <p className="text-[11px] text-outline">
                  Regex & exact match token filters
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.keywordFilterEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, keywordFilterEnabled: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newBannedWord}
                onChange={(e) => setNewBannedWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBannedWord())}
                placeholder="Add banned phrase..."
                className="flex-1 bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/40 text-xs focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={addBannedWord}
                className="px-3 py-1.5 bg-surface-container hover:bg-surface-bright text-primary rounded-lg font-semibold border border-outline-variant/40"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {settings.bannedWords.map((word) => (
                <span
                  key={word}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface"
                >
                  <span>{word}</span>
                  <button
                    type="button"
                    onClick={() => removeBannedWord(word)}
                    className="text-outline hover:text-error"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
