'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useGuild } from '@/lib/context/guildContext';

export interface TerminalMessage {
  id: string;
  type: 'command' | 'embed' | 'error' | 'system' | 'help';
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

const COMMAND_SUGGESTIONS = [
  '!help',
  '!ban @user spamming server',
  '!softban @user raiding',
  '!unban 200100100100100104',
  '!kick @user rule 2 violation',
  '!timeout @user 10m flooding chat',
  '!untimeout @user',
  '!warn @user inappropriate behavior',
  '!warnings @user',
  '!notes @user',
  '!addnote @user User cooperative',
  '!purge 25',
  '!purge 50 bots',
  '!lock #general raid incoming',
  '!unlock #general',
  '!slowmode 10s',
  '!quarantine @user',
  '!raidmode on',
  '!raidmode off',
  '!stats',
  '!clear',
];

export function InteractiveTerminal({ fullPage = false }: { fullPage?: boolean }) {
  const { selectedGuildId } = useGuild();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [messages, setMessages] = useState<TerminalMessage[]>([
    {
      id: 'init-1',
      type: 'system',
      timestamp: new Date().toLocaleTimeString(),
      data: {
        title: 'SMCore Discord Gateway CLI Console v1.0.0',
        description: 'Interactive real-time Discord moderation terminal. Commands mutate server state, enforce punishments, and generate immutable audit logs. Type `!help` for manual.',
      },
    },
  ]);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages, isExecuting]);

  const executeCommand = async (cmdText: string) => {
    const raw = cmdText.trim();
    if (!raw) return;

    if (raw === '!clear' || raw === '/clear' || raw === 'clear') {
      setMessages([]);
      setInput('');
      return;
    }

    // Add to history
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
            error: json?.error?.message || 'Command syntax error or execution failure.',
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
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple autocompletion
      if (input.trim()) {
        const found = COMMAND_SUGGESTIONS.find((s) =>
          s.toLowerCase().startsWith(input.toLowerCase())
        );
        if (found) {
          setInput(found);
        }
      }
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#0b0e14] border border-[#1e2436] rounded-xl overflow-hidden font-mono shadow-2xl ${
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

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            DISCORD DISPATCH LIVE
          </span>
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-[11px] text-[#717c99] hover:text-[#e2e8f0] transition-colors"
            title="Clear Terminal Output"
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
                className="p-3.5 rounded-lg bg-[#111624] border-l-4 border-indigo-500 border-t border-r border-b border-[#1e263d] space-y-2.5"
              >
                <div className="font-bold text-indigo-400 text-sm flex items-center justify-between">
                  <span>{msg.data?.title}</span>
                  <span className="text-[10px] text-[#636e88] font-normal">{msg.timestamp}</span>
                </div>
                <p className="text-[11px] text-[#8e9ebf]">{msg.data?.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
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
            <span className="text-xs">Executing command across Discord Gateway...</span>
          </div>
        )}
      </div>

      {/* Quick Macro Badges */}
      <div className="px-3 py-1.5 bg-[#0a0d14] border-t border-[#1a2033] flex items-center gap-1.5 overflow-x-auto text-[10px] text-[#717c99]">
        <span className="text-[#55607a] uppercase text-[9px] font-bold shrink-0">Quick Run:</span>
        {[
          { label: '!help', cmd: '!help' },
          { label: '!stats', cmd: '!stats' },
          { label: '!purge 20', cmd: '!purge 20' },
          { label: '!warn', cmd: '!warn 200100100100100102 Unsolicited links' },
          { label: '!timeout 10m', cmd: '!timeout 200100100100103 10m Chat flooding' },
          { label: '!raidmode', cmd: '!raidmode status' },
          { label: '!cases', cmd: '!cases' },
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
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type Discord bot command (e.g. !ban @user, !timeout @user 10m, !help)..."
          className="flex-1 bg-transparent text-sm text-[#f1f5f9] placeholder:text-[#4f5b78] focus:outline-none font-mono"
          disabled={isExecuting}
        />
        <button
          type="button"
          onClick={() => executeCommand(input)}
          disabled={!input.trim() || isExecuting}
          className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
        >
          <span>Run</span>
          <span className="material-symbols-outlined text-[14px]">send</span>
        </button>
      </div>
    </div>
  );
}
