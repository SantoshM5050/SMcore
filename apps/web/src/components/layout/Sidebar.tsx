'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Hash,
  Users,
  Palette,
  Settings,
  BarChart3,
  ScrollText,
  User,
  Zap,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    title: 'MODULES',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Event Signups', href: '/events', icon: Trophy, badge: 'Popular' },
      { name: 'Applications', href: '/applications', icon: ClipboardList },
      { name: 'Embed Builder', href: '/embed-builder', icon: Palette },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      { name: 'Roles', href: '/roles', icon: ShieldCheck },
      { name: 'Channels', href: '/channels', icon: Hash },
      { name: 'Staff', href: '/staff', icon: Users },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  {
    title: 'SYSTEM & LOGS',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Audit Logs', href: '/logs', icon: ScrollText },
      { name: 'Profile', href: '/profile', icon: User },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId');

  return (
    <aside className="w-64 bg-card border-r border-border/80 min-h-screen flex flex-col justify-between p-4 sticky top-0 h-screen z-30 shadow-2xl overflow-y-auto">
      <div className="space-y-5">
        {/* SMCore Brand Header */}
        <div className="flex items-center gap-3 px-3 py-3 border-b border-border/60">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-primary/50 shadow-lg shadow-primary/30 flex items-center justify-center bg-black/50">
            <img src="/logo.png" alt="SMCORE Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-wider leading-none">SMCORE</h1>
            <span className="text-[10px] text-primary font-bold tracking-widest uppercase">System Hub</span>
          </div>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <h2 className="px-3 text-[10px] font-extrabold text-gray-400 tracking-widest uppercase">
                {group.title}
              </h2>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const fullHref = guildId ? `${item.href}?guildId=${guildId}` : item.href;

                  return (
                    <Link
                      key={item.href}
                      href={fullHref}
                      className={cn(
                        'flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group',
                        isActive
                          ? 'bg-primary text-white shadow-lg shadow-primary/25 font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-secondary/70'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'w-4 h-4 transition-transform group-hover:scale-110',
                            isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary'
                          )}
                        />
                        <span>{item.name}</span>
                      </div>

                      {item.badge && (
                        <span className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase',
                          isActive ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-secondary/40 border border-border/50 rounded-xl text-center mt-4">
        <div className="flex items-center justify-center gap-1.5 text-xs text-primary font-bold mb-0.5">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>SMCore Platform v14.2</span>
        </div>
        <p className="text-[10px] text-gray-500">Enterprise Bot & Dashboard</p>
      </div>
    </aside>
  );
}
