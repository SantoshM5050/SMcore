'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Server, ChevronDown, Check, Shield } from 'lucide-react';
import { GuildItem } from '@/types';

export function ServerSwitcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [guilds, setGuilds] = useState<GuildItem[]>([]);
  const [activeGuild, setActiveGuild] = useState<GuildItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const currentGuildId = searchParams.get('guildId') || '';

  useEffect(() => {
    fetch('/api/guilds')
      .then((res) => res.json())
      .then((data: GuildItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setGuilds(data);
          const found = data.find((g) => g.id === currentGuildId);
          if (found) {
            setActiveGuild(found);
          } else {
            const firstGuild = data[0];
            setActiveGuild(firstGuild);
            if (firstGuild && (!searchParams.get('guildId') || currentGuildId !== firstGuild.id)) {
              const newParams = new URLSearchParams(searchParams.toString());
              newParams.set('guildId', firstGuild.id);
              router.replace(`${pathname}?${newParams.toString()}`);
            }
          }
        }
      })
      .catch((err) => console.error('Failed to fetch user guilds:', err));
  }, [currentGuildId, pathname, router, searchParams]);

  const handleSelectGuild = (guild: GuildItem) => {
    setActiveGuild(guild);
    setIsOpen(false);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('guildId', guild.id);
    router.push(`${pathname}?${newParams.toString()}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 bg-secondary/80 hover:bg-secondary border border-border rounded-xl transition-all cursor-pointer text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm">
          {activeGuild?.name ? activeGuild.name.charAt(0) : 'S'}
        </div>
        <div className="hidden md:block pr-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white leading-none">
              {activeGuild?.name || 'Select Server...'}
            </span>
            <Shield className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[10px] text-gray-400">
            ID: {activeGuild?.id || 'N/A'}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150">
          <div className="p-2 border-b border-border text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Switch Server
          </div>
          <div className="max-h-60 overflow-y-auto p-1 space-y-1">
            {guilds.map((g) => (
              <button
                key={g.id}
                onClick={() => handleSelectGuild(g)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeGuild?.id === g.id
                    ? 'bg-primary/20 text-white font-bold'
                    : 'text-gray-300 hover:bg-secondary hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {g.name.charAt(0)}
                  </div>
                  <span className="truncate">{g.name}</span>
                </div>
                {activeGuild?.id === g.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
