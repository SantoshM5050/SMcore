'use client';

import React, { useState } from 'react';
import { GuildProvider } from '@/lib/context/guildContext';
import { AuthProvider } from '@/lib/context/authContext';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <GuildProvider>
        <div className="min-h-screen bg-background text-on-surface flex flex-col">
          <Sidebar
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
          <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
            <Topbar onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
            <main className="relative w-full pt-16 bg-background flex-1 flex flex-col min-w-0">
              {children}
            </main>
          </div>
        </div>
      </GuildProvider>
    </AuthProvider>
  );
}
