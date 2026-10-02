'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/lib/context/guildContext';

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { selectedGuildId } = useGuild();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const NAV_ITEMS = [
    { label: 'Operations Command Center', href: '/dashboard', icon: 'dashboard', category: 'Navigation' },
    { label: 'Bot CLI Terminal', href: '/dashboard/terminal', icon: 'terminal', category: 'Navigation' },
    { label: 'Server Members Directory', href: '/dashboard/members', icon: 'group', category: 'Navigation' },
    { label: 'Cases & Enforcement History', href: '/dashboard/moderation', icon: 'gavel', category: 'Moderation' },
    { label: 'AutoMod Policy Engine', href: '/dashboard/automod', icon: 'smart_toy', category: 'Protection' },
    { label: 'Anti-Raid & Quarantine Matrix', href: '/dashboard/security', icon: 'shield', category: 'Protection' },
    { label: 'Role Hierarchy & Permissions', href: '/dashboard/roles', icon: 'badge', category: 'Administration' },
    { label: 'Support Helpdesk Tickets', href: '/dashboard/tickets', icon: 'confirmation_number', category: 'Support' },
    { label: 'Embed & Announcement Dispatcher', href: '/dashboard/embeds', icon: 'send', category: 'Communication' },
    { label: 'Immutable Audit Trail & CSV Export', href: '/dashboard/audit-logs', icon: 'history_edu', category: 'Logs' },
    { label: 'Guild Configuration & Policies', href: '/dashboard/settings', icon: 'tune', category: 'Administration' },
    { label: 'Server Backups & Snapshots', href: '/dashboard/backups', icon: 'cloud_sync', category: 'Administration' },
  ];

  const filtered = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-surface-container-low border border-border-medium shadow-2xl overflow-hidden font-sans">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle bg-surface-container">
          <span className="material-symbols-outlined text-primary text-[20px]">search</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page (e.g. terminal, members, ban, automod)..."
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none font-sans"
          />
          <kbd className="text-[10px] font-mono text-outline bg-surface-container-highest px-1.5 py-0.5 rounded border border-border-subtle">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-outline font-mono">
              No matching commands or routes found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(item.href)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-container-high transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-on-surface block">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-outline font-mono uppercase">
                      {item.category}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-surface-container-lowest border-t border-border-subtle flex items-center justify-between text-[11px] text-outline font-mono">
          <span>Navigate using search keywords</span>
          <span>Target Guild: {selectedGuildId || 'Active'}</span>
        </div>
      </div>
    </div>
  );
}
