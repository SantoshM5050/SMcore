'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useGuild } from '@/lib/context/guildContext';

export interface TerminalMessage {
  id: string;
  type: 'command' | 'embed' | 'error' | 'system' | 'help' | 'stream';
  command?: string;
  timestamp: string;
  data?: {
    type?: string;
    title?: string;
    description?: string;
    fields?: Array<{ name: string; value: string }>;
    commands?: Array<{ cmd: string; desc: string }>;
  };
  error?: string;
}

interface CommandDef {
  cmd: string;
  usage: string;
  desc: string;
  category: 'MOD' | 'SECURITY' | 'CHANNELS' | 'SYSTEM';
}

const COMMAND_DEFINITIONS: CommandDef[] = [
  { cmd: '/ban', usage: '/ban <@user|id> [reason]', desc: 'Permanently ban a member and record audit case', category: 'MOD' },
  { cmd: '/softban', usage: '/softban <@user|id> [reason]', desc: 'Ban and immediate unban to prune recent messages', category: 'MOD' },
  { cmd: '/unban', usage: '/unban <id> [reason]', desc: 'Revoke an existing server ban', category: 'MOD' },
  { cmd: '/kick', usage: '/kick <@user|id> [reason]', desc: 'Kick member from Discord server', category: 'MOD' },
  { cmd: '/timeout', usage: '/timeout <@user|id> <duration> [reason]', desc: 'Mute member (e.g. 5m, 1h, 1d)', category: 'MOD' },
  { cmd: '/untimeout', usage: '/untimeout <@user|id>', desc: 'Remove active timeout/mute', category: 'MOD' },
  { cmd: '/warn', usage: '/warn <@user|id> <reason>', desc: 'Issue formal warning with auto-escalation check', category: 'MOD' },
  { cmd: '/warnings', usage: '/warnings <@user|id>', desc: 'View past infractions and warnings for user', category: 'MOD' },
  { cmd: '/delwarn', usage: '/delwarn <warnId>', desc: 'Delete and revoke an active warning', category: 'MOD' },
  { cmd: '/notes', usage: '/notes <@user|id>', desc: 'View confidential moderator notes', category: 'MOD' },
  { cmd: '/addnote', usage: '/addnote <@user|id> <content>', desc: 'Add confidential moderator note', category: 'MOD' },
  { cmd: '/nick', usage: '/nick <@user|id> [newNick]', desc: 'Change member nickname or reset to username', category: 'MOD' },
  { cmd: '/role', usage: '/role <add|remove> <@user|id> <role>', desc: 'Assign or strip a server role', category: 'MOD' },
  { cmd: '/quarantine', usage: '/quarantine <@user|id> [reason]', desc: 'Isolate user into restricted jail zone', category: 'SECURITY' },
  { cmd: '/raidmode', usage: '/raidmode <on|off|status>', desc: 'Toggle emergency anti-raid defense mode', category: 'SECURITY' },
  { cmd: '/purge', usage: '/purge <count 1-100> [filter]', desc: 'Bulk delete messages (bots, links, invites, embeds)', category: 'CHANNELS' },
  { cmd: '/lock', usage: '/lock [#channel] [reason]', desc: 'Lockdown channel by revoking SEND_MESSAGES', category: 'CHANNELS' },
  { cmd: '/unlock', usage: '/unlock [#channel]', desc: 'Restore standard posting permissions', category: 'CHANNELS' },
  { cmd: '/slowmode', usage: '/slowmode <seconds>', desc: 'Set rate limit (0s, 5s, 10s, 30s, 1m, 5m)', category: 'CHANNELS' },
  { cmd: '/case', usage: '/case <caseNumber>', desc: 'Inspect case records and evidence', category: 'SYSTEM' },
  { cmd: '/cases', usage: '/cases [user]', desc: 'List recent server moderation cases', category: 'SYSTEM' },
  { cmd: '/ticket', usage: '/ticket <list|claim <num>|close <num>>', desc: 'Interact with support helpdesk tickets', category: 'SYSTEM' },
  { cmd: '/config', usage: '/config [prefix <val>]', desc: 'View or update guild bot configuration', category: 'SYSTEM' },
  { cmd: '/stats', usage: '/stats', desc: 'Display live guild protection & gateway telemetry', category: 'SYSTEM' },
  { cmd: '/ping', usage: '/ping', desc: 'Check Discord gateway and REST latency', category: 'SYSTEM' },
  { cmd: '/help', usage: '/help', desc: 'Open full Discord operations manual', category: 'SYSTEM' },
  { cmd: '/clear', usage: '/clear', desc: 'Clear the terminal screen buffer', category: 'SYSTEM' },
];

export function InteractiveTerminal({ fullPage = false }: { fullPage?: boolean }) {
  const { selectedGuildId } = useGuild();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [streamActive, setStreamActive] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);

  const [messages, setMessages] = useState<TerminalMessage[]>([
    {
      id: 'init-1',
      type: 'system',
      timestamp: new Date().toLocaleTimeString(),
      data: {
        title: 'SMCore Discord Gateway Console · Shard #0 Connected',
        description:
          'High-speed Discord moderation shell. Commands mutate live server state, update infraction dossiers, and enforce hierarchy rules. Both slash commands (/ban) and prefix commands (!ban) are fully supported. Type /help to see all commands.',
      },
    },
  ]);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages, isExecuting]);

  // Periodic simulated gateway stream events if enabled
  useEffect(() => {
    if (!streamActive) return;

    const streamEvents = [
      'GATEWAY [HEARTBEAT_ACK] Latency: 22ms · Shard 0/1 OK',
      'AUTOMOD [SCAN] #general · Message 109283726 checked: clean',
      'PRESENCE [SYNC] Member cache synchronized (1,482 members cached)',
      'SECURITY [MONITOR] Join velocity nominal (0.2 joins/min)',
    ];

    const timer = setInterval(() => {
      const randomEvent = streamEvents[Math.floor(Math.random() * streamEvents.length)];
      setMessages((prev) => {
        // Keep buffer bounded
        const updated = [...prev];
        if (updated.length > 80) updated.shift();
        return [
          ...updated,
          {
            id: `stream-${Date.now()}`,
            type: 'stream',
            timestamp: new Date().toLocaleTimeString(),
            data: { description: randomEvent },
          },
        ];
      });
    }, 18000);

    return () => clearInterval(timer);
  }, [streamActive]);

  // Suggestions computation
  const filteredSuggestions = React.useMemo(() => {
    if (!input.trim()) return [];
    const query = input.trim().toLowerCase();
    const cleanQ = query.startsWith('/') || query.startsWith('!') ? query.slice(1) : query;
    return COMMAND_DEFINITIONS.filter(
      (c) =>
        c.cmd.toLowerCase().includes(cleanQ) ||
        c.desc.toLowerCase().includes(cleanQ) ||
        c.usage.toLowerCase().includes(cleanQ)
    );
  }, [input]);

  const executeCommand = async (cmdText: string) => {
    const raw = cmdText.trim();
    if (!raw) return;

    setShowSuggestions(false);

    if (raw === '!clear' || raw === '/clear' || raw === 'clear') {
      setMessages([]);
      setInput('');
      return;
    }

    setHistory((prev) => [raw, ...prev]);
    setHistoryIndex(-1);

    const cmdMsgId = `cmd-${Date.now()}`;
    const newMsg: TerminalMessage = {
      id: cmdMsgId,
      type: 'command',
      command: raw,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setIsExecuting(true);

    try {
      const res = await fetch(`/api/guilds/${selectedGuildId}/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: raw }),
      });

      const json = await res.json().catch(() => null);

      if (json && json.success && json.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: `resp-${Date.now()}`,
            type: json.data.type === 'help' ? 'help' : 'embed',
            timestamp: new Date().toLocaleTimeString(),
            data: json.data,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            timestamp: new Date().toLocaleTimeString(),
            error: json?.error?.message || 'Command execution syntax error or unknown action.',
          },
        ]);
      }
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'error',
          timestamp: new Date().toLocaleTimeString(),
          error: err instanceof Error ? err.message : 'Network execution failure.',
        },
      ]);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && filteredSuggestions[selectedSuggestionIdx]) {
        setInput(filteredSuggestions[selectedSuggestionIdx].cmd + ' ');
        setShowSuggestions(false);
      } else {
        executeCommand(input);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions) {
        setSelectedSuggestionIdx((prev) => Math.max(0, prev - 1));
      } else if (history.length > 0) {
        const nextIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showSuggestions) {
        setSelectedSuggestionIdx((prev) => Math.min(filteredSuggestions.length - 1, prev + 1));
      } else if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setInput(filteredSuggestions[selectedSuggestionIdx || 0].cmd + ' ');
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleExportLog = () => {
    const text = messages
      .map((m) => {
        if (m.type === 'command') return `[${m.timestamp}] USER: ${m.command}`;
        if (m.type === 'error') return `[${m.timestamp}] ERROR: ${m.error}`;
        if (m.type === 'embed')
          return `[${m.timestamp}] BOT: ${m.data?.title} - ${m.data?.description || ''} ${
            m.data?.fields?.map((f) => `${f.name}: ${f.value}`).join(' | ') || ''
          }`;
        return `[${m.timestamp}] ${m.type.toUpperCase()}: ${m.data?.description || m.data?.title || ''}`;
      })
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smcore-terminal-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`flex flex-col bg-[#0b0e14] border border-[#1e2436] rounded-xl overflow-hidden font-mono shadow-2xl relative ${
        fullPage ? 'h-[calc(100vh-140px)]' : 'h-[520px]'
      }`}
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e121b] border-b border-[#1e2436] select-none text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[#8892b0] text-[11px] font-semibold tracking-wide flex items-center gap-1.5">
            <span className="text-[#6366f1]">smcore@gateway:</span>/guilds/{selectedGuildId || 'active'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Stream live toggle */}
          <button
            type="button"
            onClick={() => setStreamActive(!streamActive)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
              streamActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-surface-container text-[#6d7a96] border-[#1e263d]'
            }`}
            title="Toggle live background Discord gateway telemetry"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                streamActive ? 'bg-emerald-400 animate-pulse' : 'bg-[#55607a]'
              }`}
            />
            <span>STREAM {streamActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Export log */}
          <button
            type="button"
            onClick={handleExportLog}
            className="text-[11px] text-[#717c99] hover:text-[#e2e8f0] transition-colors flex items-center gap-1"
            title="Export terminal transcript as text"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            <span>Export</span>
          </button>

          {/* Clear screen */}
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-[11px] text-[#717c99] hover:text-[#e2e8f0] transition-colors"
            title="Clear Terminal Output (/clear)"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        ref={outputRef}
        className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs text-[#cad2e5] leading-relaxed scroll-smooth"
      >
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div
                key={msg.id}
                className="p-3.5 rounded-lg bg-[#121724] border border-[#232b40] text-[#a5b4d4] space-y-1.5"
              >
                <div className="flex items-center justify-between text-indigo-400 font-bold">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">terminal</span>
                    {msg.data?.title}
                  </span>
                  <span className="text-[10px] text-[#636e88]">{msg.timestamp}</span>
                </div>
                <p className="text-[11px] text-[#8ea0c7]">{msg.data?.description}</p>
              </div>
            );
          }

          if (msg.type === 'stream') {
            return (
              <div
                key={msg.id}
                className="text-[10px] font-mono text-[#586580] flex items-center gap-2 py-0.5"
              >
                <span className="text-[#3b4356] select-none">[{msg.timestamp}]</span>
                <span className="text-[#4e5d7d]">{msg.data?.description}</span>
              </div>
            );
          }

          if (msg.type === 'command') {
            return (
              <div key={msg.id} className="flex items-start gap-2 text-indigo-300 font-semibold pt-1">
                <span className="text-emerald-400 select-none">➜</span>
                <span className="text-[#6366f1] select-none">smcore:~$</span>
                <span className="text-[#f1f5f9] font-bold">{msg.command}</span>
                <span className="text-[10px] text-[#55607a] ml-auto select-none">{msg.timestamp}</span>
              </div>
            );
          }

          if (msg.type === 'help') {
            return (
              <div
                key={msg.id}
                className="p-4 rounded-lg bg-[#111624] border-l-4 border-indigo-500 border-t border-r border-b border-[#1e263d] space-y-3"
              >
                <div className="font-bold text-indigo-400 text-sm flex items-center justify-between">
                  <span>{msg.data?.title}</span>
                  <span className="text-[10px] text-[#636e88] font-normal">{msg.timestamp}</span>
                </div>
                <p className="text-[11px] text-[#8e9ebf]">{msg.data?.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 max-h-72 overflow-y-auto pr-1">
                  {msg.data?.commands?.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => setInput(c.cmd.split(' ')[0] + ' ')}
                      className="p-2 rounded bg-[#0b0e17] border border-[#1d243a] hover:border-indigo-500/50 cursor-pointer transition-colors"
                    >
                      <div className="text-emerald-400 font-bold text-[11px]">{c.cmd}</div>
                      <div className="text-[#7584a6] text-[10px]">{c.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (msg.type === 'embed') {
            const isDanger = msg.data?.type === 'danger';
            const isWarning = msg.data?.type === 'warning';
            const borderColor = isDanger
              ? 'border-rose-500'
              : isWarning
              ? 'border-amber-500'
              : 'border-emerald-500';

            const headerColor = isDanger
              ? 'text-rose-400'
              : isWarning
              ? 'text-amber-400'
              : 'text-emerald-400';

            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded-lg bg-[#0e1320] border-l-4 ${borderColor} border-t border-r border-b border-[#1c2338] space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${headerColor} text-xs tracking-wide flex items-center gap-1.5`}>
                    <span className="material-symbols-outlined text-[15px]">verified_user</span>
                    {msg.data?.title}
                  </span>
                  <span className="text-[10px] text-[#5c6885]">{msg.timestamp}</span>
                </div>
                {msg.data?.description && (
                  <p className="text-[11px] text-[#93a4cc]">{msg.data.description}</p>
                )}
                {msg.data?.fields && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#1a2136]">
                    {msg.data.fields.map((f, i) => (
                      <div key={i} className="text-[11px]">
                        <span className="text-[#6d7c9f] block uppercase text-[9px] font-bold tracking-wider">
                          {f.name}
                        </span>
                        <span className="text-[#e2e8f0] font-mono break-all">{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (msg.type === 'error') {
            return (
              <div
                key={msg.id}
                className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-rose-400 shrink-0">
                  error
                </span>
                <span>{msg.error}</span>
              </div>
            );
          }

          return null;
        })}

        {isExecuting && (
          <div className="flex items-center gap-2 text-indigo-400 py-1">
            <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
            <span className="text-xs">Dispatching command across Discord Gateway...</span>
          </div>
        )}
      </div>

      {/* Floating Suggestions Dropup when typing */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute left-3 right-3 bottom-20 bg-[#0d111c] border border-[#252f4a] rounded-xl shadow-2xl p-1 z-30 max-h-56 overflow-y-auto">
          <div className="px-2 py-1 text-[9px] font-mono uppercase text-[#616f8e] border-b border-[#1b2236] flex justify-between">
            <span>Matching Commands ({filteredSuggestions.length})</span>
            <span>Tab / Enter to select · Esc to close</span>
          </div>
          {filteredSuggestions.map((s, idx) => (
            <div
              key={s.cmd}
              onClick={() => {
                setInput(s.cmd + ' ');
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                idx === selectedSuggestionIdx
                  ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                  : 'hover:bg-[#161c2c] text-[#a5b4d4]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400 font-mono">{s.cmd}</span>
                <span className="text-[#6d7d9f] font-mono text-[11px]">{s.usage}</span>
              </div>
              <span className="text-[#7e8dae] text-[10px]">{s.desc}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Macro Pills */}
      <div className="px-3 py-1.5 bg-[#0a0d14] border-t border-[#1a2033] flex items-center gap-1.5 overflow-x-auto text-[10px] text-[#717c99]">
        <span className="text-[#55607a] uppercase text-[9px] font-bold shrink-0">Fast Run:</span>
        {[
          { label: '/help', cmd: '/help' },
          { label: '/stats', cmd: '/stats' },
          { label: '/ping', cmd: '/ping' },
          { label: '/purge 20', cmd: '/purge 20' },
          { label: '/warn', cmd: '/warn 200100100100100102 Excessive spam' },
          { label: '/timeout 10m', cmd: '/timeout 200100100100103 10m Flooding chat' },
          { label: '/lock', cmd: '/lock #general Raid incoming' },
          { label: '/raidmode on', cmd: '/raidmode on' },
          { label: '/cases', cmd: '/cases' },
        ].map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => executeCommand(item.cmd)}
            className="px-2 py-0.5 rounded bg-[#131826] hover:bg-[#1a2135] text-[#93a2c5] hover:text-[#f8fafc] border border-[#212942] transition-colors whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Terminal Input Bar */}
      <div className="p-2.5 bg-[#0e121c] border-t border-[#1e2436] flex items-center gap-2">
        <span className="text-emerald-400 font-bold select-none text-sm pl-1">➜</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            const val = e.target.value;
            setInput(val);
            setShowSuggestions(val.trim().length > 0 && !val.includes(' '));
            setSelectedSuggestionIdx(0);
          }}
          onFocus={() => {
            if (input.trim().length > 0 && !input.includes(' ')) {
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type Discord command (/ban @user, /timeout @user 10m, /purge 20, /help)..."
          className="flex-1 bg-transparent text-sm text-[#f1f5f9] placeholder:text-[#4f5b78] focus:outline-none font-mono"
          disabled={isExecuting}
        />
        <button
          type="button"
          onClick={() => executeCommand(input)}
          disabled={!input.trim() || isExecuting}
          className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
        >
          <span>Run</span>
          <span className="material-symbols-outlined text-[14px]">send</span>
        </button>
      </div>
    </div>
  );
}
