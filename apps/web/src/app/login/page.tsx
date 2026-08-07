'use client';

import React from 'react';
import { Gamepad2, ShieldCheck, Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const handleDiscordLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <main className="min-h-screen bg-[#090a0f] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-card/90 border border-border/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center space-y-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mx-auto shadow-xl shadow-primary/20">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Discord Role Management</h1>
          <p className="text-sm text-gray-400">Enterprise Role Verification Platform for Gaming Servers</p>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-secondary/50 border border-border/60 rounded-xl text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Role-Based Access Control & Administrator Verification</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/50 border border-border/60 rounded-xl text-xs text-gray-300">
            <Zap className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Interactive Discord Bot Integration (No Slash Commands)</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/50 border border-border/60 rounded-xl text-xs text-gray-300">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>OAuth2 Session Security & Real-Time Audit Logs</span>
          </div>
        </div>

        <Button onClick={handleDiscordLogin} className="w-full py-3.5 text-base gap-3 shadow-xl">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
          </svg>
          Login with Discord
        </Button>

        <p className="text-[11px] text-center text-gray-500 mt-6">
          By signing in, you agree to grant administrator permission inspection for your Discord servers.
        </p>
      </div>
    </main>
  );
}
