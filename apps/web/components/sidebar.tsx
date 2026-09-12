'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGuild } from '../lib/context/guildContext';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Overview', href: '/dashboard', icon: 'dashboard' },
    ],
  },
  {
    title: 'Moderation',
    items: [
      { name: 'Cases & Punishments', href: '/dashboard/moderation', icon: 'gavel' },
    ],
  },
  {
    title: 'AutoMod & Security',
    items: [
      { name: 'AutoMod Engine', href: '/dashboard/automod', icon: 'smart_toy' },
      { name: 'Anti-Raid & Quarantine', href: '/dashboard/security', icon: 'shield' },
    ],
  },
  {
    title: 'Logging & Audit',
    items: [
      { name: 'Audit Trail', href: '/dashboard/audit-logs', icon: 'history_edu' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { name: 'Guild Settings', href: '/dashboard/settings', icon: 'tune' },
    ],
  },
  {
    title: 'Future Modules',
    items: [
      { name: 'Ticket System', href: '#', icon: 'confirmation_number', badge: 'Soon', disabled: true },
      { name: 'Forum Logging Hub', href: '#', icon: 'forum', badge: 'Soon', disabled: true },
      { name: 'Staff & RBAC Matrix', href: '#', icon: 'badge', badge: 'Soon', disabled: true },
      { name: 'Intelligence & Trends', href: '#', icon: 'monitoring', badge: 'Soon', disabled: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { selectedGuildId, setSelectedGuildId, availableGuilds } = useGuild();
  const [showGuildDropdown, setShowGuildDropdown] = useState(false);
  const [customGuildInput, setCustomGuildInput] = useState('');

  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId) || {
    id: selectedGuildId,
    name: 'Apex Network',
    memberCount: 148200,
  };

  const handleCustomGuildSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{17,20}$/.test(customGuildInput.trim())) {
      setSelectedGuildId(customGuildInput.trim());
      setCustomGuildInput('');
      setShowGuildDropdown(false);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest flex flex-col z-50 select-none border-r border-outline-variant/30 shadow-[0_0_24px_rgba(0,0,0,0.6)]">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-surface-container-lowest/90 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shadow-md shadow-primary-container/20">
            SM
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-on-surface">SMCore</span>
            <span className="text-[10px] font-mono text-outline tracking-wider uppercase">SecOps v4.8</span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container text-tertiary border border-tertiary/20">
            ENTERPRISE
          </span>
        </div>
      </div>

      {/* Guild Selector Switcher */}
      <div className="px-3 py-2.5 relative">
        <button
          type="button"
          onClick={() => setShowGuildDropdown(!showGuildDropdown)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors group"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center text-sm font-bold shrink-0">
              {currentGuild.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                {currentGuild.name}
              </span>
              <span className="text-[10px] font-mono text-tertiary flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                {currentGuild.memberCount ? `${(currentGuild.memberCount / 1000).toFixed(1)}k members` : currentGuild.id}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-outline-variant text-[18px]">
            {showGuildDropdown ? 'expand_less' : 'unfold_more'}
          </span>
        </button>

        {/* Guild Dropdown Menu */}
        {showGuildDropdown && (
          <div className="absolute left-3 right-3 top-16 mt-1 rounded-xl bg-surface-container-high border border-outline-variant p-2 shadow-2xl z-50 space-y-2">
            <div className="text-[10px] uppercase font-mono text-outline px-2 pt-1">Registered Guilds</div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {availableGuilds.map((guild) => (
                <button
                  key={guild.id}
                  type="button"
                  onClick={() => {
                    setSelectedGuildId(guild.id);
                    setShowGuildDropdown(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    guild.id === selectedGuildId
                      ? 'bg-primary-container text-on-primary-container font-semibold'
                      : 'text-on-surface hover:bg-surface-bright'
                  }`}
                >
                  <span className="truncate">{guild.name}</span>
                  <span className="font-mono text-[9px] opacity-75">{guild.id.slice(-4)}</span>
                </button>
              ))}
            </div>

            {/* Custom Snowflake ID Form */}
            <form onSubmit={handleCustomGuildSubmit} className="pt-2 border-t border-outline-variant/40">
              <div className="text-[10px] font-mono text-outline px-1 mb-1">Or Connect Guild ID:</div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customGuildInput}
                  onChange={(e) => setCustomGuildInput(e.target.value)}
                  placeholder="Snowflake ID..."
                  className="w-full bg-surface-container-lowest text-on-surface px-2 py-1 rounded text-xs focus:outline-none border border-outline-variant/60 font-mono"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-primary text-on-primary rounded text-xs font-semibold hover:bg-primary-fixed-dim"
                >
                  Set
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-outline">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-outline/60 text-xs cursor-not-allowed select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] opacity-40">{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-container-high text-outline">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-[0_0_12px_rgba(128,131,255,0.25)]'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-on-primary-container' : 'text-outline'}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-container text-tertiary">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Staff Profile Footer */}
      <div className="p-3 bg-surface-container-lowest/95 border-t border-outline-variant/20">
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-tertiary/40 shrink-0">
              AV
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-on-surface truncate">Alex Vance</span>
              <span className="text-[10px] font-mono text-outline truncate">SecOps Lead</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" title="SecOps Active" />
          </div>
        </div>
      </div>
    </aside>
  );
}
