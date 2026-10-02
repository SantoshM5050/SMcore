'use client';

import React from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { InteractiveTerminal } from '@/components/terminal/interactiveTerminal';

export default function TerminalPage() {
  const { selectedGuildId, availableGuilds } = useGuild();
  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId) || {
    name: selectedGuildId ? `Server ${selectedGuildId}` : 'Active Server',
    id: selectedGuildId,
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-64px)] pb-12">
      {/* Top Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>OPERATIONS</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">DISCORD CLI</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-emerald-400">
              GATEWAY SHELL
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Interactive Bot CLI Console
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-medium border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live WebSocket / HTTP Bridge
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-outline">
          <span>Active Target:</span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold border border-border-subtle">
            {currentGuild.name}
          </span>
        </div>
      </div>

      {/* Main Terminal Viewport */}
      <div className="px-6 py-5 max-w-7xl w-full mx-auto space-y-4">
        <InteractiveTerminal fullPage={true} />
      </div>
    </div>
  );
}
