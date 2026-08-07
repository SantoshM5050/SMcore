import React, { Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-8 text-sm text-gray-500 flex items-center justify-center">Loading Dashboard...</div>}>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="p-8 flex-1 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </Suspense>
  );
}
