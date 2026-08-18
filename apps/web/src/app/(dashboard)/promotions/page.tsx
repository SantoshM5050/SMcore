'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Hash,
  Award,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function PromotionsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [logs, setLogs] = useState<any[]>([]);
  const [channelsConfig, setChannelsConfig] = useState<any>(null);
  const [roleConfigs, setRoleConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Search
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [inGameName, setInGameName] = useState('');
  const [inGameId, setInGameId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [actionType, setActionType] = useState<'PROMOTION' | 'DEMOTION' | 'LEFT_FAMILY'>('PROMOTION');
  const [previousRoleId, setPreviousRoleId] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [reason, setReason] = useState('');

  // Channel Config Form State
  const [logChannelIdInput, setLogChannelIdInput] = useState('');

  const fetchPromotionsData = () => {
    if (!guildId) return;
    setLoading(true);
    fetch(`/api/guilds/${guildId}/promotions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs);
        if (data.channelConfig) {
          setChannelsConfig(data.channelConfig);
          setLogChannelIdInput(data.channelConfig.promotionLogsChannelId || '');
        }
        if (data.roleConfigs) setRoleConfigs(data.roleConfigs);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPromotionsData();
  }, [guildId]);

  const handleSubmitPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inGameName || !inGameId || !targetUserId) {
      setNotification({ type: 'error', message: 'Name, In-Game ID, and Target User ID are required.' });
      return;
    }

    setSubmitting(true);
    setNotification(null);

    const prevRoleObj = roleConfigs.find((r) => r.roleId === previousRoleId);
    const newRoleObj = roleConfigs.find((r) => r.roleId === newRoleId);

    try {
      const res = await fetch(`/api/guilds/${guildId}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_PROMOTION',
          targetUserId,
          inGameName,
          inGameId,
          actionType,
          previousRoleId: previousRoleId || null,
          previousRoleName: prevRoleObj?.roleName || null,
          newRoleId: actionType === 'LEFT_FAMILY' ? null : newRoleId || null,
          newRoleName: actionType === 'LEFT_FAMILY' ? 'LEFT FAMILY' : newRoleObj?.roleName || null,
          reason,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          message: `Rank action ${actionType} recorded successfully! ${
            data.roleSwapSuccess ? 'Discord roles updated automatically.' : 'Role swap note: ' + data.roleSwapError
          }`,
        });
        setIsFormOpen(false);
        // Reset form
        setInGameName('');
        setInGameId('');
        setTargetUserId('');
        setPreviousRoleId('');
        setNewRoleId('');
        setReason('');
        setActionType('PROMOTION');
        fetchPromotionsData();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to record rank update.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveChannelConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_CHANNELS',
          promotionLogsChannelId: logChannelIdInput.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', message: 'Promotion Logs Channel updated successfully!' });
        setIsChannelModalOpen(false);
        fetchPromotionsData();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to save channel.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'ALL' || log.actionType === actionFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      log.inGameName.toLowerCase().includes(searchLower) ||
      log.inGameId.toLowerCase().includes(searchLower) ||
      log.targetUserId.toLowerCase().includes(searchLower) ||
      log.executedByTag.toLowerCase().includes(searchLower) ||
      (log.reason && log.reason.toLowerCase().includes(searchLower));

    return matchesAction && matchesSearch;
  });

  const totalLogs = logs.length;
  const totalPromotions = logs.filter((l) => l.actionType === 'PROMOTION').length;
  const totalDemotions = logs.filter((l) => l.actionType === 'DEMOTION').length;
  const totalLeft = logs.filter((l) => l.actionType === 'LEFT_FAMILY').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card to-card/80 p-6 rounded-2xl border border-border/80 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-wide">
              Grand RP Family Promotions & Demotions
            </h1>
            <Badge variant="purple">Module 5</Badge>
          </div>
          <p className="text-xs text-gray-400">
            Submit rank promotions, demotions, or mark members who left the family with automatic Discord role swaps & log embeds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsChannelModalOpen(true)}
            variant="outline"
            className="flex items-center gap-2 text-xs border-border/80 hover:bg-secondary/60"
          >
            <Settings className="w-4 h-4 text-primary" />
            <span>Configure Log Channel</span>
          </Button>

          <Button
            onClick={() => setIsFormOpen(true)}
            variant="primary"
            className="flex items-center gap-2 text-xs bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
          >
            <Plus className="w-4 h-4" />
            <span>+ Submit Rank Action</span>
          </Button>
        </div>
      </div>

      {/* Notification Alert Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 border-border/60 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Rank Updates</span>
            <Award className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-white">{totalLogs}</div>
          <p className="text-[10px] text-gray-500 mt-1">Recorded in database</p>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Promotions</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{totalPromotions}</div>
          <p className="text-[10px] text-gray-500 mt-1">Rank upgrades granted</p>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-rose-400 font-bold uppercase tracking-wider">Demotions</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{totalDemotions}</div>
          <p className="text-[10px] text-gray-500 mt-1">Rank demotions recorded</p>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Left Family</span>
            <LogOut className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-black text-gray-300">{totalLeft}</div>
          <p className="text-[10px] text-gray-500 mt-1">Family roles stripped</p>
        </Card>
      </div>

      {/* History Table with Filters */}
      <Card className="p-6 bg-card border-border/80 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          {/* Action Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'PROMOTION', 'DEMOTION', 'LEFT_FAMILY'].map((type) => (
              <button
                key={type}
                onClick={() => setActionFilter(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  actionFilter === type
                    ? type === 'PROMOTION'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : type === 'DEMOTION'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : type === 'LEFT_FAMILY'
                      ? 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
                      : 'bg-primary text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-secondary/60'
                }`}
              >
                {type === 'ALL'
                  ? 'All Logs'
                  : type === 'PROMOTION'
                  ? '📈 Promotions'
                  : type === 'DEMOTION'
                  ? '📉 Demotions'
                  : '🚪 Left Family'}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search Name, ID, Staff, Reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs bg-secondary/50 border-border/60"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading promotion history...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <ShieldCheck className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-xs font-semibold">No promotion or demotion records found.</p>
              <p className="text-[11px] text-gray-600">Click "+ Submit Rank Action" to record a new rank update.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Date & Time</th>
                  <th className="py-3 px-4">Name (In-Game)</th>
                  <th className="py-3 px-4">ID (In-Game & Discord)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Previous ➡️ New Rank</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 rounded-r-xl">By (Staff)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                      {formatDate(log.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 font-extrabold text-white">
                      {log.inGameName}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-gray-300">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">ID: {log.inGameId}</span>
                        <span className="text-[10px] text-gray-500">&lt;@{log.targetUserId}&gt;</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {log.actionType === 'PROMOTION' && (
                        <Badge variant="green" className="flex items-center gap-1 w-fit">
                          <ArrowUpRight className="w-3 h-3" /> PROMOTION
                        </Badge>
                      )}
                      {log.actionType === 'DEMOTION' && (
                        <Badge variant="red" className="flex items-center gap-1 w-fit">
                          <ArrowDownRight className="w-3 h-3" /> DEMOTION
                        </Badge>
                      )}
                      {log.actionType === 'LEFT_FAMILY' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-500/20 text-gray-300 border border-gray-500/30 flex items-center gap-1 w-fit">
                          <LogOut className="w-3 h-3" /> LEFT FAMILY
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-gray-400">{log.previousRoleName || 'None'}</span>
                        <span className="text-primary font-bold">➡️</span>
                        <span className={log.actionType === 'LEFT_FAMILY' ? 'text-rose-400 line-through' : 'text-emerald-400 font-bold'}>
                          {log.newRoleName || (log.actionType === 'LEFT_FAMILY' ? 'Roles Stripped' : 'None')}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate text-gray-300" title={log.reason || 'None'}>
                      {log.reason || 'No reason specified'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-gray-300 font-medium">@{log.executedByTag}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* NEW PROMOTION / DEMOTION FORM MODAL */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Submit Grand RP Rank Action / Left Form">
        <form onSubmit={handleSubmitPromotion} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Name (In-Game Name) *</label>
              <Input
                type="text"
                placeholder="e.g. Akash Varma"
                value={inGameName}
                onChange={(e) => setInGameName(e.target.value)}
                required
                className="text-xs bg-secondary/60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">In-Game ID *</label>
              <Input
                type="text"
                placeholder="e.g. 123456"
                value={inGameId}
                onChange={(e) => setInGameId(e.target.value)}
                required
                className="text-xs bg-secondary/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Target Discord User ID / Mention *</label>
            <Input
              type="text"
              placeholder="e.g. 1280178101326708856 or @User"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              required
              className="text-xs bg-secondary/60 font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Used to swap Discord roles & send DM notifications automatically.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Action Type *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActionType('PROMOTION')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  actionType === 'PROMOTION'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                    : 'bg-secondary/40 text-gray-400 border-border/60 hover:text-white'
                }`}
              >
                📈 Promotion
              </button>
              <button
                type="button"
                onClick={() => setActionType('DEMOTION')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  actionType === 'DEMOTION'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                    : 'bg-secondary/40 text-gray-400 border-border/60 hover:text-white'
                }`}
              >
                📉 Demotion
              </button>
              <button
                type="button"
                onClick={() => setActionType('LEFT_FAMILY')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  actionType === 'LEFT_FAMILY'
                    ? 'bg-gray-500/20 text-gray-300 border-gray-400'
                    : 'bg-secondary/40 text-gray-400 border-border/60 hover:text-white'
                }`}
              >
                🚪 Left Family
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Previous Rank Role</label>
              <select
                value={previousRoleId}
                onChange={(e) => setPreviousRoleId(e.target.value)}
                className="w-full bg-secondary/60 border border-border/80 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="">-- Select Previous Role (Optional) --</option>
                {roleConfigs.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </div>

            {actionType !== 'LEFT_FAMILY' && (
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">New Rank Role *</label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full bg-secondary/60 border border-border/80 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Select New Role --</option>
                  {roleConfigs.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Reason</label>
            <textarea
              rows={3}
              placeholder="Reason for promotion, demotion, or leaving family..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-secondary/60 border border-border/80 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} className="text-xs bg-primary hover:bg-primary/90">
              {submitting ? 'Processing...' : 'Submit & Swap Roles'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* LOG CHANNEL CONFIGURATION MODAL */}
      <Modal isOpen={isChannelModalOpen} onClose={() => setIsChannelModalOpen(false)} title="Configure Promotion Logs Channel">
        <form onSubmit={handleSaveChannelConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Promotion Logs Channel ID</label>
            <Input
              type="text"
              placeholder="e.g. 1280178101326708856"
              value={logChannelIdInput}
              onChange={(e) => setLogChannelIdInput(e.target.value)}
              className="text-xs font-mono bg-secondary/60"
            />
            <p className="text-[10px] text-gray-500 mt-1.5">
              Enter the Discord Text Channel ID where rich Promotion/Demotion Log Embeds will be posted automatically.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setIsChannelModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} className="text-xs bg-primary">
              {submitting ? 'Saving...' : 'Save Channel Config'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
