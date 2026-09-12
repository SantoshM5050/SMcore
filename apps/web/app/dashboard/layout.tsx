'use client';

import React from 'react';
import { GuildProvider } from '@/lib/context/guildContext';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuildProvider>
      <div className="min-h-screen bg-surface text-on-surface">
        <Sidebar />
        <div className="pl-72">
          <Topbar />
          <main className="relative w-full pt-16 bg-surface min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </div>
      </div>
    </GuildProvider>
  );
}
