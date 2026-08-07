'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, ShieldCheck, Server, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [guilds, setGuilds] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUser(data.user);
      });

    fetch('/api/guilds')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setGuilds(data);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Account & Guild Selector</h1>
        <p className="text-sm text-gray-400 mt-1">Manage active Discord session profile and connected server instances.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="md:col-span-1 space-y-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> User Session Profile
            </CardTitle>
          </CardHeader>

          {user ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary mx-auto flex items-center justify-center text-primary text-2xl font-bold">
                {user.username.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{user.username}</h3>
                <p className="text-xs text-gray-400 font-mono">ID: {user.discordId}</p>
                {user.email && <p className="text-xs text-gray-500 mt-1">{user.email}</p>}
              </div>

              <div className="pt-4 border-t border-border">
                <Button variant="danger" size="sm" onClick={handleLogout} className="w-full gap-2">
                  <LogOut className="w-4 h-4" /> Terminate Session (Logout)
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-6 text-center">Loading user session...</p>
          )}
        </Card>

        {/* Guild Selector Card */}
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" /> Managed Discord Guilds ({guilds.length})
            </CardTitle>
          </CardHeader>

          {guilds.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No managed guilds found.</p>
          ) : (
            <div className="space-y-3">
              {guilds.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-4 bg-secondary/50 border border-border/60 rounded-xl hover:border-primary/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
                      {g.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{g.name}</h4>
                      <p className="text-xs text-gray-400 font-mono">ID: {g.id}</p>
                    </div>
                  </div>
                  <Button variant="primary" size="sm">
                    Active Instance
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
