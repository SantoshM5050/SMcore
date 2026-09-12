import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Sliders,
  FileText,
  Bot,
  LayoutDashboard,
  HelpCircle,
} from 'lucide-react';

const navigationItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, current: true },
  { name: 'Moderation', href: '#', icon: ShieldAlert, current: false, badge: 'Phase 1' },
  { name: 'AutoMod', href: '#', icon: Bot, current: false, badge: 'Phase 2' },
  { name: 'Audit Logs', href: '#', icon: FileText, current: false, badge: 'Phase 3' },
  { name: 'Guild Settings', href: '#', icon: Sliders, current: false, badge: 'Phase 4' },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-outline-variant bg-surface">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-outline-variant px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container text-primary font-display font-bold text-base shadow-sm">
          SM
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-sm tracking-wide text-text-primary">
            SMCore
          </span>
          <span className="text-[11px] text-text-muted">Precision Moderation</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                item.current
                  ? 'bg-surface-container text-primary font-semibold'
                  : 'text-text-secondary hover:bg-surface-container/60 hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${item.current ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] text-text-muted">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-outline-variant p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>v1.0.0-foundation</span>
          </span>
          <span className="font-mono text-[10px] text-primary">SMCore</span>
        </div>
      </div>
    </aside>
  );
}
