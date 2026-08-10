'use client';

import React, { useEffect, useState } from 'react';
import { Bot, LogOut, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ServerSwitcher } from './ServerSwitcher';

export function Header() {
  const [botStatus, setBotStatus] = useState<{ online: boolean; status: string; ping: number | null }>({
    online: false,
    status: 'CHECKING',
    ping: null,
  });

  const [user, setUser] = useState<{ username: string; avatar: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/bot/status')
      .then((res) => res.json())
      .then((data) => setBotStatus(data))
      .catch(() => setBotStatus({ online: false, status: 'OFFLINE', ping: null }));

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => null);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Active Guild Selector */}
      <ServerSwitcher />

      {/* Bot Status & User Avatar */}
      <div className="flex items-center gap-4">
        {/* Bot Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-border text-xs">
          <Bot className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-300 font-medium">Bot Status:</span>
          {botStatus.online ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Operational ({botStatus.ping}ms)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <XCircle className="w-3.5 h-3.5" />
              Offline
            </span>
          )}
        </div>

        {/* Invite Bot Button */}
        <a href="/api/bot/invite" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10">
            <Bot className="w-3.5 h-3.5" /> Invite Bot to Server
          </Button>
        </a>

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white leading-none">{user.username}</p>
              <span className="text-[10px] text-gray-400">Administrator</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="p-2 text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
