'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { ModerationCaseItem } from '@/types';
import { ModerationAction } from '@repo/database';

export default function CasesLedgerPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [cases, setCases] = useState<ModerationCaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedCase, setSelectedCase] = useState<ModerationCaseItem | null>(null);

  const fetchCases = () => {
    if (!guildId) return;
    setLoading(true);

    const query = new URLSearchParams({
      page: page.toString(),
      limit: '15',
    });
    if (search) query.set('search', search);
    if (selectedAction) query.set('action', selectedAction);

    fetch(`/api/guilds/${guildId}/moderation/cases?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.cases)) {
          setCases(data.cases);
          setTotal(data.total || data.cases.length);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCases();
  }, [guildId, page, selectedAction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCases();
  };

  const getActionBadgeColor = (action: ModerationAction) => {
    switch (action) {
      case ModerationAction.BAN:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case ModerationAction.KICK:
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case ModerationAction.TIMEOUT:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case ModerationAction.WARN:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case ModerationAction.PURGE:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case ModerationAction.LOCK:
      case ModerationAction.UNLOCK:
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    }
  };

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Cases Ledger</h1>
          <p className="text-sm text-gray-400 mt-1">
            Complete historical registry of all disciplinary and moderation actions executed in this guild.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by target user ID, username, or reason..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Actions</option>
              <option value="BAN">Ban</option>
              <option value="UNBAN">Unban</option>
              <option value="KICK">Kick</option>
              <option value="TIMEOUT">Timeout</option>
              <option value="WARN">Warning</option>
              <option value="PURGE">Purge</option>
              <option value="LOCK">Channel Lock</option>
              <option value="UNLOCK">Channel Unlock</option>
              <option value="AUTOMOD">AutoMod</option>
            </select>

            <Button type="submit" variant="secondary" size="md">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              <span>Registered Cases ({total})</span>
            </div>
            <div className="text-xs text-gray-400 font-normal">
              Page {page} of {totalPages}
            </div>
          </CardTitle>
        </CardHeader>

        {loading ? (
          <div className="py-16 text-center text-gray-500 text-sm">Loading cases ledger...</div>
        ) : cases.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">No moderation cases match your filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-border bg-secondary/30">
                <tr>
                  <th className="py-3 px-4">Case #</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target User</th>
                  <th className="py-3 px-4">Moderator</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">#{c.caseNumber}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getActionBadgeColor(c.action)}`}>
                        {c.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{c.targetTag}</div>
                      <div className="text-[11px] font-mono text-gray-500">{c.targetId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-300">{c.moderatorTag}</div>
                      <div className="text-[11px] font-mono text-gray-500">{c.moderatorId}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-gray-300">
                      {c.reason || <span className="text-gray-500 italic">No reason provided</span>}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-400 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedCase(c)}
                        className="p-1.5 text-gray-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/20">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="gap-1 text-xs"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getActionBadgeColor(selectedCase.action)}`}>
                  {selectedCase.action}
                </span>
                <h3 className="text-lg font-extrabold text-white">Case #{selectedCase.caseNumber}</h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedCase(null)}>
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/40 rounded-lg border border-border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Target User</span>
                  <span className="font-semibold text-white">{selectedCase.targetTag}</span>
                  <span className="text-xs font-mono text-gray-500 block">{selectedCase.targetId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Enforcing Moderator</span>
                  <span className="font-semibold text-white">{selectedCase.moderatorTag}</span>
                  <span className="text-xs font-mono text-gray-500 block">{selectedCase.moderatorId}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Reason</span>
                <p className="text-gray-200 mt-0.5 p-2.5 bg-input rounded-lg border border-border text-xs leading-relaxed">
                  {selectedCase.reason || 'No reason provided.'}
                </p>
              </div>

              {selectedCase.durationMinutes && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Punishment Duration</span>
                  <span className="text-xs font-mono text-amber-400">{selectedCase.durationMinutes} Minutes</span>
                </div>
              )}

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Timestamp</span>
                <span className="text-xs font-mono text-gray-400">
                  {new Date(selectedCase.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedCase(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
