'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGuild } from '@/lib/context/guildContext';
import { apiClient, TicketItem, TicketCategoryItem } from '@/lib/api/apiClient';

export default function TicketsDashboardPage() {
  const { selectedGuildId, availableGuilds } = useGuild();
  const currentGuild = availableGuilds.find((g) => g.id === selectedGuildId) || {
    name: selectedGuildId ? `Guild ${selectedGuildId}` : 'No Server Selected',
    id: selectedGuildId,
  };

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [categories, setCategories] = useState<TicketCategoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTickets = useCallback(async () => {
    if (!selectedGuildId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [ticketsRes, catRes] = await Promise.all([
        apiClient.tickets.list(selectedGuildId, {
          pageSize: 50,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          search: searchQuery.trim() || undefined,
        }),
        apiClient.tickets.getCategories(selectedGuildId).catch(() => ({ success: false, data: [] })),
      ]);

      if (ticketsRes.success && ticketsRes.data) {
        const items = ticketsRes.data.items;
        setTickets(items);
        setTotalCount(ticketsRes.data.total);
        if (items.length > 0) {
          const first = items[0];
          setSelectedTicket((prev) =>
            prev ? items.find((t) => t.id === prev.id) || first : first
          );
        } else {
          setSelectedTicket(null);
        }
      } else {
        setTickets([]);
        setTotalCount(0);
        setSelectedTicket(null);
        if (ticketsRes.error?.message) {
          setError(ticketsRes.error.message);
        }
      }

      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch tickets';
      setError(msg);
      setTickets([]);
      setTotalCount(0);
      setSelectedTicket(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuildId, statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openCount = useMemo(() => {
    return tickets.filter((t) => t.status === 'OPEN').length;
  }, [tickets]);

  const claimedCount = useMemo(() => {
    return tickets.filter((t) => t.status === 'CLAIMED').length;
  }, [tickets]);

  const closedCount = useMemo(() => {
    return tickets.filter((t) => t.status === 'CLOSED').length;
  }, [tickets]);

  // Chat message state & handlers
  const [chatInput, setChatInput] = useState('');
  const [ticketChatMessages, setTicketChatMessages] = useState<Record<string, Array<{ text: string; timestamp: string }>>>({
    'ticket-1': [
      { text: 'Hello! I am reviewing your ticket now.', timestamp: '10:14 AM' },
    ],
  });

  const handleSendChatMessage = (ticketId: string) => {
    if (!chatInput.trim()) return;
    const newMsg = {
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTicketChatMessages((prev) => ({
      ...prev,
      [ticketId]: [...(prev[ticketId] || []), newMsg],
    }));
    setChatInput('');
  };

  const handleClaimTicket = async (ticket: TicketItem) => {
    if (!selectedGuildId) return;
    try {
      await fetch(`/api/guilds/${selectedGuildId}/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLAIMED', claimedByUserId: '123456789012345678' }),
      });
      await loadTickets();
    } catch {
      // ignore
    }
  };

  const handleCloseTicket = async (ticket: TicketItem) => {
    if (!selectedGuildId) return;
    try {
      await fetch(`/api/guilds/${selectedGuildId}/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED', closeReason: 'Resolved by staff operator' }),
      });
      await loadTickets();
    } catch {
      // ignore
    }
  };

  const handleReopenTicket = async (ticket: TicketItem) => {
    if (!selectedGuildId) return;
    try {
      await fetch(`/api/guilds/${selectedGuildId}/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OPEN' }),
      });
      await loadTickets();
    } catch {
      // ignore
    }
  };

  const handleExportTranscript = (ticket: TicketItem) => {
    const msgs = ticketChatMessages[ticket.id] || [];
    const content = [
      `============================================================`,
      `DISCORD SUPPORT TICKET TRANSCRIPT #${ticket.ticketNumber}`,
      `Guild ID: ${ticket.guildId}`,
      `Channel ID: ${ticket.channelId}`,
      `Created By: ${ticket.creatorUserId}`,
      `Status: ${ticket.status}`,
      `Subject: ${ticket.subject || 'Support Ticket'}`,
      `Created At: ${new Date(ticket.createdAt).toISOString()}`,
      `============================================================\n`,
      `[${new Date(ticket.createdAt).toLocaleTimeString()}] USER (${ticket.creatorUserId}): ${ticket.subject || 'Ticket opened'}`,
      ...msgs.map((m) => `[${m.timestamp}] STAFF: ${m.text}`),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.ticketNumber}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: TicketItem['status']) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-tertiary-container/30 text-tertiary border border-tertiary/20">
            OPEN
          </span>
        );
      case 'CLAIMED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            CLAIMED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-container-high text-outline">
            CLOSED
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary-container/30 text-primary border border-primary/20">
            RESOLVED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container text-outline">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest/60 border-b border-outline-variant/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>HELPDESK</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">TICKETS</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-tertiary">
              LIVE DISCORD SYNC
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Support Ticket Control
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-mono text-[11px] font-medium">
              {currentGuild.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadTickets()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono border border-outline-variant/30 transition-colors"
          >
            <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => loadTickets()} className="underline font-bold ml-2">
            Retry
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="px-6 pt-4 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-outline">Total Records</div>
            <div className="text-xl font-bold font-mono text-on-surface mt-0.5">{totalCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-outline">Open Tickets</div>
            <div className="text-xl font-bold font-mono text-tertiary mt-0.5">{openCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-tertiary-container/20 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-[18px]">mark_chat_unread</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-outline">Claimed Active</div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">{claimedCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300">
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-outline">Closed / Archive</div>
            <div className="text-xl font-bold font-mono text-outline mt-0.5">{closedCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
          </div>
        </div>
      </div>

      {/* Filter Deck */}
      <div className="px-6 py-3">
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject, creator Snowflake ID, or channel ID..."
              className="w-full pl-9 pr-4 py-1.5 bg-surface-container-lowest text-on-surface placeholder:text-outline-variant text-xs rounded-lg border border-outline-variant/40 focus:outline-none focus:border-primary transition-all font-mono"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-1.5 border border-outline-variant/40 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLAIMED">Claimed</option>
              <option value="CLOSED">Closed</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-1.5 border border-outline-variant/40 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji ? `${c.emoji} ` : ''}{c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace: Table & Inspection Drawer */}
      <div className="px-6 py-2 flex flex-col xl:flex-row gap-4 items-start relative">
        {/* Ticket Table */}
        <div className="w-full xl:w-[68%] 2xl:w-[72%] flex flex-col rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-container flex items-center justify-between border-b border-outline-variant/20">
            <span className="text-xs font-semibold text-on-surface">Ticket Registry</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container-high text-primary">
              Showing {tickets.length} of {totalCount}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-lowest/80 text-outline text-[10px] uppercase font-mono tracking-wider border-b border-outline-variant/20">
                  <th className="py-2.5 px-3 w-16">#</th>
                  <th className="py-2.5 px-3 w-24">Status</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Category</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Subject</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Creator</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Staff Assigned</th>
                  <th className="py-2.5 px-3 w-28">Created</th>
                  <th className="py-2.5 px-3 text-right w-16">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-outline">
                      <div className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined animate-spin text-[18px] text-primary">
                          progress_activity
                        </span>
                        <span>Loading support tickets from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-outline">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-outline text-[32px]">
                          confirmation_number
                        </span>
                        <span className="text-on-surface font-medium text-xs">
                          No support tickets found
                        </span>
                        <span className="text-[11px] text-outline max-w-sm">
                          Tickets created by server members using the Discord `/ticket` command or panel buttons will appear here in real time.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => {
                    const isSelected = selectedTicket?.id === ticket.id;
                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-surface-container-high/80'
                            : 'hover:bg-surface-container/60'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-primary font-bold">
                          #{String(ticket.ticketNumber).padStart(4, '0')}
                        </td>
                        <td className="py-2.5 px-3">{getStatusBadge(ticket.status)}</td>
                        <td className="py-2.5 px-3 font-medium text-on-surface">
                          {ticket.category?.name || 'General Support'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-on-surface truncate block max-w-xs font-mono">
                            {ticket.subject || 'No Subject Specified'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-on-surface-variant">
                            {ticket.creatorUserId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-on-surface-variant">
                            {ticket.claimedByUserId || '— Unassigned —'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-outline whitespace-nowrap">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                            }}
                            className="p-1 rounded bg-surface-container hover:bg-surface-bright text-outline hover:text-on-surface transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">dock_to_left</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slide-over Inspection Drawer */}
        <div className="w-full xl:w-[32%] 2xl:w-[28%] rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-xl flex flex-col overflow-hidden">
          {selectedTicket ? (
            <>
              <div className="px-4 py-3 bg-surface-container flex items-center justify-between border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-on-surface">
                    Ticket #{String(selectedTicket.ticketNumber).padStart(4, '0')}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <span className="text-[10px] font-mono text-outline truncate max-w-[120px]">
                  {selectedTicket.id}
                </span>
              </div>

              <div className="p-4 space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 space-y-2">
                  <div className="text-[10px] uppercase font-mono text-outline">Ticket Subject</div>
                  <div className="font-semibold text-on-surface text-sm">
                    {selectedTicket.subject || 'No Subject Specified'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    <div className="text-[10px] uppercase font-mono text-outline">Creator User ID</div>
                    <div className="font-mono text-on-surface truncate mt-0.5">
                      {selectedTicket.creatorUserId}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    <div className="text-[10px] uppercase font-mono text-outline">Assigned Staff</div>
                    <div className="font-mono text-on-surface truncate mt-0.5">
                      {selectedTicket.claimedByUserId || 'Unassigned'}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 space-y-2">
                  <div className="text-[10px] uppercase font-mono text-outline">Discord Channel</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-primary">#{selectedTicket.channelId}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(selectedTicket.channelId)}
                      className="text-[10px] font-mono text-outline hover:text-on-surface underline"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-outline">
                    <span>Opened:</span>
                    <span className="text-on-surface">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-outline">
                    <span>Last Activity:</span>
                    <span className="text-on-surface">{new Date(selectedTicket.lastActivityAt).toLocaleString()}</span>
                  </div>
                  {selectedTicket.closedAt && (
                    <div className="flex items-center justify-between text-outline">
                      <span>Closed:</span>
                      <span className="text-on-surface">{new Date(selectedTicket.closedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Interactive Simulated Discord Ticket Chat */}
                <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-outline font-bold">
                      Live Channel Transcript
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExportTranscript(selectedTicket)}
                      className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">download</span>
                      <span>Export TXT</span>
                    </button>
                  </div>

                  {/* Message feed */}
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-border-subtle max-h-48 overflow-y-auto space-y-2 font-sans text-[11px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="font-bold text-on-surface">User ({selectedTicket.creatorUserId.slice(-4)})</span>
                        <span className="text-outline text-[9px]">Opened ticket</span>
                      </div>
                      <p className="text-on-surface-variant bg-surface-container-high/50 p-2 rounded">
                        {selectedTicket.subject || 'Hello, I need help with server permissions and roles.'}
                      </p>
                    </div>

                    {ticketChatMessages[selectedTicket.id]?.map((m, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="font-bold text-indigo-400">Staff (You)</span>
                          <span className="text-outline text-[9px]">{m.timestamp}</span>
                        </div>
                        <p className="text-on-surface bg-indigo-500/10 border border-indigo-500/20 p-2 rounded">
                          {m.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Staff Reply Box & Canned Macros */}
                  {selectedTicket.status !== 'CLOSED' && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                        <span className="text-outline text-[9px] uppercase font-mono shrink-0">Macros:</span>
                        <button
                          type="button"
                          onClick={() => setChatInput('Hello! Thanks for reaching out. How can we assist you today?')}
                          className="px-1.5 py-0.5 rounded bg-surface-container-high text-outline hover:text-on-surface whitespace-nowrap"
                        >
                          Greeting
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatInput('Please provide your user ID and any relevant screenshots.')}
                          className="px-1.5 py-0.5 rounded bg-surface-container-high text-outline hover:text-on-surface whitespace-nowrap"
                        >
                          Request Info
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatInput('Issue has been resolved. Closing ticket now. Thank you!')}
                          className="px-1.5 py-0.5 rounded bg-surface-container-high text-outline hover:text-on-surface whitespace-nowrap"
                        >
                          Resolved
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSendChatMessage(selectedTicket.id))}
                          placeholder="Send staff message into Discord ticket..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs border border-border-subtle focus:outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendChatMessage(selectedTicket.id)}
                          disabled={!chatInput.trim()}
                          className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-dark disabled:opacity-40 text-white text-xs font-semibold"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Claim & Close */}
                <div className="pt-2 border-t border-outline-variant/20 flex items-center gap-2">
                  {selectedTicket.status === 'OPEN' && (
                    <button
                      type="button"
                      onClick={() => handleClaimTicket(selectedTicket)}
                      className="flex-1 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-colors"
                    >
                      Claim Ticket
                    </button>
                  )}

                  {selectedTicket.status !== 'CLOSED' ? (
                    <button
                      type="button"
                      onClick={() => handleCloseTicket(selectedTicket)}
                      className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs border border-rose-500/30 transition-colors"
                    >
                      Close & Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReopenTicket(selectedTicket)}
                      className="flex-1 py-2 rounded-lg bg-surface-container hover:bg-surface-bright text-outline hover:text-on-surface font-semibold text-xs border border-border-subtle transition-colors"
                    >
                      Reopen Ticket
                    </button>
                  )}
                </div>

                {selectedTicket.transcriptUrl && (
                  <div className="pt-1">
                    <a
                      href={selectedTicket.transcriptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary-container/30 text-primary hover:bg-primary-container/40 font-mono text-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      <span>View Full Transcript</span>
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-outline text-xs">
              Select a ticket from the list to view comprehensive channel metadata and participants.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
