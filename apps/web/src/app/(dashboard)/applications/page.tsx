'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { RejectModal } from '@/components/applications/RejectModal';
import { Search, CheckCircle2, XCircle, Eye, ExternalLink, ChevronLeft, ChevronRight, MessageSquare, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { ApplicationItem } from '@/types';

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '100000000000000000';

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);

  // Staff Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const fetchApplications = () => {
    setLoading(true);
    let url = `/api/guilds/${guildId}/applications?page=${page}&limit=10`;
    if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
    if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setApplications(data.items);
          setTotalPages(data.pagination.totalPages || 1);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, [guildId, statusFilter, page]);

  useEffect(() => {
    if (selectedApp) {
      fetch(`/api/guilds/${guildId}/applications/${selectedApp.id}/comments`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setComments(data);
        });
    }
  }, [selectedApp, guildId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/applications/${id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error}`);
        return;
      }
      setSelectedApp(null);
      fetchApplications();
    } catch (err: any) {
      alert(`Failed to approve: ${err.message}`);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingAppId) return;
    const res = await fetch(`/api/guilds/${guildId}/applications/${rejectingAppId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    setSelectedApp(null);
    fetchApplications();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !newComment.trim()) return;

    await fetch(`/api/guilds/${guildId}/applications/${selectedApp.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: newComment }),
    });

    setNewComment('');
    fetch(`/api/guilds/${guildId}/applications/${selectedApp.id}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Applications Review</h1>
        <p className="text-sm text-gray-400 mt-1">Review, approve, or reject gaming role request submissions.</p>
      </div>

      {/* Controls */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-secondary text-gray-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <Input
            placeholder="Search IGN, Tag, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="py-1.5 text-xs"
          />
          <Button type="submit" size="sm" variant="secondary">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </Card>

      {/* Applications Table */}
      <Card>
        {loading ? (
          <div className="py-16 text-center text-gray-500 text-sm">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">No applications found matching your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-border bg-secondary/30">
                <tr>
                  <th className="py-3 px-4">App ID</th>
                  <th className="py-3 px-4">Discord User</th>
                  <th className="py-3 px-4">Requested Role</th>
                  <th className="py-3 px-4">In-Game IGN</th>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-primary font-bold">#{app.id.slice(-6)}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{app.userTag}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-200">{app.roleName}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-300">{app.inGameName}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-300">{app.currentRank}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={app.status.toLowerCase() as any}>{app.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">{formatDate(app.createdAt)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedApp(app)}
                          className="p-1.5 text-gray-300 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {app.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApprove(app.id)}
                              className="px-2.5 py-1 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setRejectingAppId(app.id)}
                              className="px-2.5 py-1 text-xs gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Application Detail View Modal */}
      {selectedApp && (
        <Modal
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title={`Application Details #${selectedApp.id.slice(-6)}`}
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-secondary/40 p-3 rounded-lg border border-border/60">
                <span className="text-xs text-gray-400 block font-semibold uppercase">Applicant Tag</span>
                <span className="font-bold text-white">{selectedApp.userTag}</span>
              </div>
              <div className="bg-secondary/40 p-3 rounded-lg border border-border/60">
                <span className="text-xs text-gray-400 block font-semibold uppercase">Target Role</span>
                <span className="font-bold text-primary">{selectedApp.roleName}</span>
              </div>
              <div className="bg-secondary/40 p-3 rounded-lg border border-border/60">
                <span className="text-xs text-gray-400 block font-semibold uppercase">In-Game Name</span>
                <span className="font-mono text-white">{selectedApp.inGameName}</span>
              </div>
              <div className="bg-secondary/40 p-3 rounded-lg border border-border/60">
                <span className="text-xs text-gray-400 block font-semibold uppercase">Player ID / Hash</span>
                <span className="font-mono text-white">{selectedApp.inGameId}</span>
              </div>
              <div className="bg-secondary/40 p-3 rounded-lg border border-border/60">
                <span className="text-xs text-gray-400 block font-semibold uppercase">Current Rank</span>
                <span className="font-semibold text-white">{selectedApp.currentRank}</span>
              </div>
              <div className="bg-secondary/40 p-3 rounded-lg border border-border/60">
                <span className="text-xs text-gray-400 block font-semibold uppercase">Application Status</span>
                <Badge variant={selectedApp.status.toLowerCase() as any}>{selectedApp.status}</Badge>
              </div>
            </div>

            {selectedApp.screenshotUrl && (
              <div>
                <span className="text-xs font-semibold text-gray-400 block uppercase mb-1.5">
                  Screenshot Proof
                </span>
                <div className="rounded-lg overflow-hidden border border-border max-h-56 bg-black/40">
                  <img
                    src={selectedApp.screenshotUrl}
                    alt="Proof"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Internal Staff Comments Section */}
            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" /> Internal Staff Comments ({comments.length})
              </h4>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="p-2.5 bg-secondary/50 border border-border/60 rounded-lg text-xs">
                    <div className="flex items-center justify-between text-gray-400 font-bold mb-1">
                      <span>{c.authorTag}</span>
                      <span className="text-[10px]">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-gray-200">{c.comment}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <Input
                  placeholder="Write internal staff comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="py-1 text-xs"
                />
                <Button type="submit" size="sm" variant="secondary" className="px-3">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectingAppId && (
        <RejectModal
          isOpen={!!rejectingAppId}
          onClose={() => setRejectingAppId(null)}
          onConfirm={handleRejectConfirm}
          applicationId={rejectingAppId}
        />
      )}
    </div>
  );
}
