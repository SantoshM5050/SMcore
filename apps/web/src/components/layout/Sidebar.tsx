'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  ScrollText,
  AlertTriangle,
  Hash,
  Radio,
  FileText,
  Users,
  Settings,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    title: 'MODERATION & SECURITY',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Moderation Hub', href: '/moderation', icon: ShieldAlert },
      { name: 'Cases Ledger', href: '/moderation/cases', icon: ScrollText },
      { name: 'Warnings & Escalation', href: '/moderation/warnings', icon: AlertTriangle },
      { name: 'AutoMod & Anti-Raid', href: '/automod', icon: ShieldCheck },
      { name: 'Channel Controls', href: '/channels', icon: Hash },
    ],
  },
  {
    title: 'LOGGING & AUDITING',
    items: [
      { name: 'Analytics & Trends', href: '/analytics', icon: FileText },
      { name: 'Log Routing & Forum', href: '/logs', icon: Radio },
      { name: 'Audit Trail', href: '/audit-logs', icon: ScrollText },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { name: 'Staff & Permissions', href: '/staff', icon: Users },
      { name: 'Server Settings', href: '/settings', icon: Settings },
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
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-3 border-b border-border/60">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-primary/50 shadow-lg shadow-primary/30 flex items-center justify-center bg-black/50">
            <img src="/logo.png" alt="SMCORE Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-wider leading-none">SMCORE</h1>
            <span className="text-[10px] text-primary font-bold tracking-widest uppercase">Moderation SaaS</span>
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
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
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
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-3 bg-secondary/40 border border-border/50 rounded-xl text-center mt-4">
        <div className="flex items-center justify-center gap-1.5 text-xs text-primary font-bold mb-0.5">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>SMCore Security Suite</span>
        </div>
        <p className="text-[10px] text-gray-500">Discord Moderation Platform</p>
      </div>
    </aside>
  );
}
