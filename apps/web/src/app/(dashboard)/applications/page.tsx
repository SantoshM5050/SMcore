'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { RejectModal } from '@/components/applications/RejectModal';
import { Search, CheckCircle2, XCircle, Eye, ChevronLeft, ChevronRight, MessageSquare, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { ApplicationItem } from '@/types';

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

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
        })
        .catch((err) => console.error(err));
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
      if (res.ok) {
        fetchApplications();
        if (selectedApp?.id === id) setSelectedApp(null);
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingAppId) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/applications/${rejectingAppId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        fetchApplications();
        if (selectedApp?.id === rejectingAppId) setSelectedApp(null);
        setRejectingAppId(null);
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async () => {
    if (!selectedApp || !newComment.trim()) return;
    try {
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
    } catch (err) {
      console.error(err);
    }
  };

  const [activeTab, setActiveTab] = useState<'submissions' | 'settings'>('submissions');
  const [mod2Settings, setMod2Settings] = useState<any>({
    cooldownMinutes: 0,
    commonRoleId: '',
    reviewPingRoleId: '',
    enforceSinglePending: true,
    requireProof: false,
    allowProof: true,
    autoDmNotification: true,
    enableAuditLog: true,
  });
  const [mod2Channels, setMod2Channels] = useState<any>({
    roleRequestChannelId: '',
    reviewChannelId: '',
  });
  const [availableChannels, setAvailableChannels] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  const fetchMod2Settings = () => {
    if (!guildId) return;
    fetch(`/api/guilds/${guildId}/settings`)
      .then((res) => res.json())
      .then((data) => { if (data.guildId) setMod2Settings(data); })
      .catch(console.error);

    fetch(`/api/guilds/${guildId}/channels`)
      .then((res) => res.json())
      .then((data) => {
        if (data.config) setMod2Channels(data.config);
        else if (data.guildId) setMod2Channels(data);
        if (data.discordChannels && Array.isArray(data.discordChannels)) setAvailableChannels(data.discordChannels);
      })
      .catch(console.error);

    fetch(`/api/guilds/${guildId}/channels/list`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setAvailableChannels(data); })
      .catch(console.error);

    fetch(`/api/guilds/${guildId}/roles`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setAvailableRoles(data); })
      .catch(console.error);
  };

  const handleSaveMod2Settings = async () => {
    setSavingSettings(true);
    setSettingsSuccess('');
    try {
      await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mod2Settings),
      });

      await fetch(`/api/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mod2Channels),
      });

      setSettingsSuccess('Module 2 Settings saved successfully!');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase mb-1">
            <span>Module 2 • Gaming Role Requests</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Applications Review</h1>
          <p className="text-sm text-gray-400 mt-1">Review submissions, manage requestable roles, embed panels, and rules.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-secondary text-gray-300 hover:text-white'
            }`}
          >
            📋 Submissions Review
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
              fetchMod2Settings();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-secondary text-gray-300 hover:text-white'
            }`}
          >
            ⚙️ Module 2 Settings
          </button>

          <Link
            href={guildId ? `/roles?guildId=${guildId}` : '/roles'}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary text-gray-300 hover:text-white hover:bg-secondary/80 flex items-center gap-1.5 transition-all"
          >
            🛡️ Requestable Roles
          </Link>
          <Link
            href={guildId ? `/embed-builder?guildId=${guildId}` : '/embed-builder'}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary text-gray-300 hover:text-white hover:bg-secondary/80 flex items-center gap-1.5 transition-all"
          >
            🎨 Panel Embed Builder
          </Link>
        </div>
      </div>

      {activeTab === 'submissions' ? (
        <>
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
        </>
      ) : (
        /* MODULE 2 SETTINGS TAB */
        <div className="space-y-6">
          {settingsSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {settingsSuccess}
            </div>
          )}

          {/* Module 2 Channels Config */}
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span># Channel Routes (Module 2)</span>
            </h3>
            <p className="text-xs text-gray-400">
              Configure the channels where the role request panel embed is posted and where staff inspect applications.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  ROLE REQUEST PANEL HOST CHANNEL
                </label>
                {availableChannels.length > 0 ? (
                  <select
                    value={mod2Channels.roleRequestChannelId || ''}
                    onChange={(e) => setMod2Channels({ ...mod2Channels, roleRequestChannelId: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Select Channel --</option>
                    {availableChannels.map((c) => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={mod2Channels.roleRequestChannelId || ''}
                    onChange={(e) => setMod2Channels({ ...mod2Channels, roleRequestChannelId: e.target.value })}
                    placeholder="Enter Channel ID"
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  STAFF REVIEW INSPECTION CHANNEL
                </label>
                {availableChannels.length > 0 ? (
                  <select
                    value={mod2Channels.reviewChannelId || ''}
                    onChange={(e) => setMod2Channels({ ...mod2Channels, reviewChannelId: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Select Channel --</option>
                    {availableChannels.map((c) => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={mod2Channels.reviewChannelId || ''}
                    onChange={(e) => setMod2Channels({ ...mod2Channels, reviewChannelId: e.target.value })}
                    placeholder="Enter Channel ID"
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-white"
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Application Restrictions & Rules */}
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚙️ Application Restrictions & Rules</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50">
                <div>
                  <h4 className="font-bold text-white">Enforce Single Pending Application</h4>
                  <p className="text-gray-400">Prevent users from submitting duplicate applications while one is pending.</p>
                </div>
                <input
                  type="checkbox"
                  checked={mod2Settings.enforceSinglePending ?? true}
                  onChange={(e) => setMod2Settings({ ...mod2Settings, enforceSinglePending: e.target.checked })}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50">
                <div>
                  <h4 className="font-bold text-white">Allow Screenshot Proof Attachment</h4>
                  <p className="text-gray-400">Enable screenshot proof URL input field on application modal.</p>
                </div>
                <input
                  type="checkbox"
                  checked={mod2Settings.allowProof ?? true}
                  onChange={(e) => setMod2Settings({ ...mod2Settings, allowProof: e.target.checked })}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50">
                <div>
                  <h4 className="font-bold text-white">Mandatory Screenshot Proof</h4>
                  <p className="text-gray-400">Require applicants to provide a valid screenshot URL before submitting.</p>
                </div>
                <input
                  type="checkbox"
                  checked={mod2Settings.requireProof ?? false}
                  onChange={(e) => setMod2Settings({ ...mod2Settings, requireProof: e.target.checked })}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50">
                <div>
                  <h4 className="font-bold text-white">Enable Automatic Direct Messages (DM)</h4>
                  <p className="text-gray-400">Send applicant an automated DM notification upon approval or rejection with reason.</p>
                </div>
                <input
                  type="checkbox"
                  checked={mod2Settings.autoDmNotification ?? true}
                  onChange={(e) => setMod2Settings({ ...mod2Settings, autoDmNotification: e.target.checked })}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/40">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  COMMON APPROVED ROLE (OPTIONAL)
                </label>
                <select
                  value={mod2Settings.commonRoleId || ''}
                  onChange={(e) => setMod2Settings({ ...mod2Settings, commonRoleId: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- None (Requested Role Only) --</option>
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>@{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  REVIEW PING ROLE (OPTIONAL)
                </label>
                <select
                  value={mod2Settings.reviewPingRoleId || ''}
                  onChange={(e) => setMod2Settings({ ...mod2Settings, reviewPingRoleId: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- No Ping --</option>
                  <option value="everyone">@everyone</option>
                  <option value="here">@here</option>
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>@{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  APPLICATION COOLDOWN (MINUTES)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10080}
                  value={mod2Settings.cooldownMinutes ?? 0}
                  onChange={(e) => setMod2Settings({ ...mod2Settings, cooldownMinutes: Number(e.target.value) })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveMod2Settings} disabled={savingSettings} size="sm">
                {savingSettings ? 'Saving...' : '💾 Save Module 2 Settings'}
              </Button>
            </div>
          </Card>
        </div>
      )}

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
                  <th className="py-3 px-4">In-Game Level</th>
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
                <span className="text-xs text-gray-400 block font-semibold uppercase">In-Game Level</span>
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
