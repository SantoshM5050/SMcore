'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Users, Shield, Plus, Trash2, CheckSquare } from 'lucide-react';
import { StaffPermission } from '@repo/database';
import { StaffRoleItem } from '@/types';

interface DiscordRoleItem {
  id: string;
  name: string;
  color: number;
}

const AVAILABLE_PERMISSIONS: { key: StaffPermission; label: string; desc: string }[] = [
  { key: StaffPermission.VIEW_DASHBOARD, label: 'View Dashboard', desc: 'Can access and view dashboard overview' },
  { key: StaffPermission.VIEW_MODERATION, label: 'View Moderation', desc: 'Can inspect cases, punishments & warnings' },
  { key: StaffPermission.WARN_MEMBERS, label: 'Warn Members', desc: 'Can issue and remove warnings' },
  { key: StaffPermission.TIMEOUT_MEMBERS, label: 'Timeout Members', desc: 'Can timeout and untimeout members' },
  { key: StaffPermission.KICK_MEMBERS, label: 'Kick Members', desc: 'Can kick members from the guild' },
  { key: StaffPermission.BAN_MEMBERS, label: 'Ban Members', desc: 'Can ban and unban members' },
  { key: StaffPermission.VIEW_LOGS, label: 'View Logs', desc: 'Can view server activity & audit logs' },
  { key: StaffPermission.MANAGE_LOGS, label: 'Manage Logs', desc: 'Can configure log routing & forum threads' },
  { key: StaffPermission.MANAGE_AUTOMOD, label: 'Manage AutoMod', desc: 'Can configure spam, links, invites & word filters' },
  { key: StaffPermission.MANAGE_ANTIRAID, label: 'Manage Anti-Raid', desc: 'Can configure join security & raid mode' },
  { key: StaffPermission.MANAGE_SETTINGS, label: 'Manage Settings', desc: 'Can edit server settings, mute role & appeal link' },
];

export default function StaffPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [staffList, setStaffList] = useState<StaffRoleItem[]>([]);
  const [availableRoles, setAvailableRoles] = useState<DiscordRoleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<StaffPermission[]>([
    StaffPermission.VIEW_DASHBOARD,
    StaffPermission.VIEW_MODERATION,
    StaffPermission.WARN_MEMBERS,
    StaffPermission.TIMEOUT_MEMBERS,
  ]);

  const fetchStaffAndRoles = () => {
    if (!guildId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/guilds/${guildId}/staff`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/roles/list`).then((res) => res.json()).catch(() => []),
    ])
      .then(([staffData, rolesData]) => {
        if (Array.isArray(staffData)) setStaffList(staffData);
        if (Array.isArray(rolesData)) setAvailableRoles(rolesData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaffAndRoles();
  }, [guildId]);

  const togglePermission = (perm: StaffPermission) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId || selectedPermissions.length === 0) return;

    await fetch(`/api/guilds/${guildId}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roleId: selectedRoleId,
        roleName: roleName || selectedRoleId,
        permissions: selectedPermissions,
      }),
    });

    setSelectedRoleId('');
    setRoleName('');
    fetchStaffAndRoles();
  };

  const handleRemoveStaff = async (id: string) => {
    await fetch(`/api/guilds/${guildId}/staff?id=${id}`, {
      method: 'DELETE',
    });
    fetchStaffAndRoles();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Staff Roles & RBAC Matrix</h1>
        <p className="text-sm text-gray-400 mt-1">
          Assign granular staff permissions and moderation authority to Discord server roles.
        </p>
      </div>

      {/* Add Staff Role Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Bind Staff Role Permissions
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleAddStaff} className="space-y-6 p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Select Discord Server Role
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => {
                  const rId = e.target.value;
                  setSelectedRoleId(rId);
                  const found = availableRoles.find((r) => r.id === rId);
                  if (found) setRoleName(found.name);
                }}
                className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select a role from your Discord Server...</option>
                {availableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (ID: {r.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Display Role Name
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Role display label"
                className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Assigned Permissions ({selectedPermissions.length} selected)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isSelected = selectedPermissions.includes(perm.key);
                return (
                  <button
                    type="button"
                    key={perm.key}
                    onClick={() => togglePermission(perm.key)}
                    className={`text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40 text-white'
                        : 'bg-secondary/30 border-border/60 text-gray-400 hover:border-border'
                    }`}
                  >
                    <CheckSquare className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-primary' : 'text-gray-600'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">{perm.label}</div>
                      <div className="text-[11px] text-gray-400">{perm.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" variant="primary" disabled={!selectedRoleId || selectedPermissions.length === 0} className="gap-2">
            <Plus className="w-4 h-4" /> Save Staff Role Binding
          </Button>
        </form>
      </Card>

      {/* Authorized Staff Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Configured Staff Roles ({staffList.length})
          </CardTitle>
        </CardHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading staff roles...</div>
        ) : staffList.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No staff permissions configured yet. Server administrators have implicit full access.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-border bg-secondary/30">
                <tr>
                  <th className="py-3 px-4">Role Name</th>
                  <th className="py-3 px-4">Role ID</th>
                  <th className="py-3 px-4">Granted Permissions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {staffList.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span>{item.roleName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-400">{item.roleId}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-lg">
                        {item.permissions.map((p) => (
                          <Badge key={p} variant="default" className="text-[10px]">
                            {p.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveStaff(item.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
