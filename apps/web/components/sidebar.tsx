'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useGuild } from '../lib/context/guildContext';
import { useAuth } from '../lib/context/authContext';

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
    title: 'Ticketing',
    items: [
      { name: 'Ticket Command Center', href: '/dashboard/tickets', icon: 'confirmation_number' },
    ],
  },
  {
    title: 'Logging & Audit',
    items: [
      { name: 'Audit Trail', href: '/dashboard/audit-logs', icon: 'history_edu' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Guild Configuration', href: '/dashboard/settings', icon: 'tune' },
    ],
  },
  {
    title: 'Upcoming Modules',
    items: [
      { name: 'Forum Logging Hub', href: '#', icon: 'forum', badge: 'Soon', disabled: true },
      { name: 'Staff & RBAC Matrix', href: '#', icon: 'badge', badge: 'Soon', disabled: true },
      { name: 'Intelligence & Trends', href: '#', icon: 'monitoring', badge: 'Soon', disabled: true },
    ],
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { selectedGuildId, setSelectedGuildId, availableGuilds } = useGuild();
  const { user, managedGuilds, botInstallUrl, isLoading: authLoading } = useAuth();
  const [showGuildDropdown, setShowGuildDropdown] = useState(false);

  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId) || {
    id: selectedGuildId || 'None',
    name: selectedGuildId ? `Guild ${selectedGuildId}` : 'Select a Discord Server',
    memberCount: undefined,
    botPresent: false,
  };

  // Find the current guild's full info from managedGuilds for icon
  const currentManagedGuild = managedGuilds.find((g) => g.id === selectedGuildId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGuildDropdown) setShowGuildDropdown(false);
        else if (isMobileOpen && onCloseMobile) onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile, showGuildDropdown]);

  const displayName = user?.displayName ?? user?.username ?? '...';
  const avatarUrl = user?.avatarUrl ?? null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Rail */}
      <aside
        className={`fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest flex flex-col z-50 select-none border-r border-border-subtle shadow-[0_0_24px_rgba(0,0,0,0.8)] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between bg-surface-container-lowest border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shadow-md shadow-primary-container/20">
              SM
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base tracking-tight text-on-surface">
                SMCore
              </span>
              <span className="text-[10px] font-mono text-outline tracking-wider uppercase">
                SecOps v4.8
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container text-tertiary border border-tertiary/25">
              PRO
            </span>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1 rounded text-outline hover:text-on-surface"
                aria-label="Close sidebar"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Guild Selector */}
        <div className="px-3 py-2.5 relative shrink-0">
          <button
            type="button"
            onClick={() => setShowGuildDropdown(!showGuildDropdown)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-border-subtle transition-colors group"
            aria-label="Switch Discord server"
            aria-expanded={showGuildDropdown}
            aria-haspopup="listbox"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {/* Guild icon or initial */}
              {currentManagedGuild?.iconUrl ? (
                <Image
                  src={currentManagedGuild.iconUrl}
                  alt={currentGuild.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center text-sm font-bold shrink-0">
                  {currentGuild.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex flex-col text-left truncate">
                <span className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                  {currentGuild.name}
                </span>
                <span className="text-[10px] font-mono text-tertiary flex items-center gap-1">
                  {currentGuild.botPresent ? (
                    <>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                      Bot active
                    </>
                  ) : selectedGuildId ? (
                    <>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
                      Bot not installed
                    </>
                  ) : (
                    'Select a server'
                  )}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline-variant text-[18px]">
              {showGuildDropdown ? 'expand_less' : 'unfold_more'}
            </span>
          </button>

          {/* Guild Dropdown */}
          {showGuildDropdown && (
            <div
              className="absolute left-3 right-3 top-16 mt-1 rounded-xl bg-surface-container-high border border-border-medium p-2 shadow-2xl z-50 space-y-1"
              role="listbox"
              aria-label="Available Discord servers"
            >
              <div className="text-[10px] uppercase font-mono text-outline px-2 pt-1 pb-1.5">
                Your Manageable Servers
              </div>

              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {authLoading ? (
                  <div className="px-2 py-3 text-xs text-outline text-center">
                    <div className="w-4 h-4 rounded-full border border-outline border-t-transparent animate-spin mx-auto mb-1" />
                    Loading servers...
                  </div>
                ) : managedGuilds.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-outline text-center">
                    No manageable servers found.
                    <br />
                    You need Manage Server permission.
                  </div>
                ) : (
                  managedGuilds.map((guild) => (
                    <button
                      key={guild.id}
                      type="button"
                      role="option"
                      aria-selected={guild.id === selectedGuildId}
                      onClick={() => {
                        setSelectedGuildId(guild.id);
                        setShowGuildDropdown(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                        guild.id === selectedGuildId
                          ? 'bg-primary-container text-on-primary-container font-semibold'
                          : 'text-on-surface hover:bg-surface-bright'
                      }`}
                    >
                      {guild.iconUrl ? (
                        <Image
                          src={guild.iconUrl}
                          alt={guild.name}
                          width={22}
                          height={22}
                          className="w-5 h-5 rounded object-cover shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-surface-container flex items-center justify-center text-[10px] font-bold text-outline shrink-0">
                          {guild.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate flex-1">{guild.name}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          guild.botPresent ? 'bg-tertiary' : 'bg-outline/40'
                        }`}
                        title={guild.botPresent ? 'Bot installed' : 'Bot not installed'}
                      />
                    </button>
                  ))
                )}
              </div>

              {/* Add SMCore CTA for servers without bot */}
              {managedGuilds.some((g) => !g.botPresent) && (
                <div className="pt-1.5 border-t border-border-subtle">
                  <a
                    href={botInstallUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => setShowGuildDropdown(false)}
                  >
                    <span className="material-symbols-outlined text-[15px]">add_circle</span>
                    Add SMCore to a server
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bot missing banner */}
        {selectedGuildId && currentGuild.botPresent === false && (
          <div className="mx-3 mb-1 px-3 py-2.5 rounded-lg bg-warning/10 border border-warning/25 text-xs text-warning">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span className="material-symbols-outlined text-[15px]">warning</span>
              SMCore not installed
            </div>
            <p className="text-[11px] leading-relaxed text-warning/80">
              The bot is not in this server. Some features will be unavailable.
            </p>
            <a
              href={botInstallUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] underline underline-offset-2 text-warning hover:text-warning/80"
            >
              Add SMCore
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            </a>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-3.5" aria-label="Main navigation">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <div className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-outline">
                {section.title}
              </div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                if (item.disabled) {
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-outline/50 text-xs cursor-not-allowed select-none"
                      aria-disabled="true"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[17px] opacity-40">
                          {item.icon}
                        </span>
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
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container font-semibold shadow-glow'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`material-symbols-outlined text-[17px] ${
                          isActive ? 'text-on-primary-container' : 'text-outline'
                        }`}
                      >
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

        {/* User Profile Footer */}
        <div className="p-3 bg-surface-container-lowest border-t border-border-subtle shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-border-subtle">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-surface-container-high animate-pulse shrink-0" />
              ) : avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full ring-1 ring-tertiary/40 shrink-0 object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-tertiary/40 shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-on-surface truncate">
                  {authLoading ? '...' : displayName}
                </span>
                <span className="text-[10px] font-mono text-outline truncate">
                  Dashboard Manager
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" title="Session Active" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
