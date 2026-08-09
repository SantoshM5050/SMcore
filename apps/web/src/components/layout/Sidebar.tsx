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

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Event Signups', href: '/events', icon: Trophy },
  { name: 'Applications', href: '/applications', icon: ClipboardList },
  { name: 'Roles', href: '/roles', icon: ShieldCheck },
  { name: 'Channels', href: '/channels', icon: Hash },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Embed Builder', href: '/embed-builder', icon: Palette },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Logs', href: '/logs', icon: ScrollText },
  { name: 'Profile', href: '/profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId');

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col justify-between p-4 sticky top-0 h-screen z-30">
      <div>
        {/* SMCore Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-border/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-purple-600 border border-primary/40 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">
            S
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-wider leading-none">SMCORE</h1>
            <span className="text-[11px] text-purple-400 font-medium tracking-wide">SMCore Dashboard</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const fullHref = guildId ? `${item.href}?guildId=${guildId}` : item.href;

            return (
              <Link
                key={item.href}
                href={fullHref}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20 font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-secondary/70'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-transform group-hover:scale-110',
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-secondary/50 border border-border/50 rounded-lg text-center">
        <div className="flex items-center justify-center gap-1 text-xs text-purple-400 font-semibold mb-0.5">
          <Zap className="w-3 h-3 fill-current" />
          <span>Powered by SMCore</span>
        </div>
        <p className="text-[10px] text-gray-500">SMCore Discord Bot v14.1</p>
      </div>
    </aside>
  );
}
