'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface RoleConfig {
  id: string;
  roleId: string;
  roleName: string;
  roleColor: string;
  isRequestable: boolean;
  enabled: boolean;
  displayOrder: number;
  minRankRequired: string | null;
}

export default function RolesPage() {
  const sampleGuildId = '100000000000000000';
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // New Role Form State
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newMinRank, setNewMinRank] = useState('');

  const fetchRoles = () => {
    setLoading(true);
    fetch(`/api/guilds/${sampleGuildId}/roles`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRoles(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleToggleRequestable = async (role: RoleConfig) => {
    const updated = !role.isRequestable;
    await fetch(`/api/guilds/${sampleGuildId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roleId: role.roleId,
        roleName: role.roleName,
        isRequestable: updated,
      }),
    });
    fetchRoles();
  };

  const handleToggleEnabled = async (role: RoleConfig) => {
    const updated = !role.enabled;
    await fetch(`/api/guilds/${sampleGuildId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roleId: role.roleId,
        roleName: role.roleName,
        enabled: updated,
      }),
    });
    fetchRoles();
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleId || !newRoleName) return;

    await fetch(`/api/guilds/${sampleGuildId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roleId: newRoleId,
        roleName: newRoleName,
        minRankRequired: newMinRank || null,
        isRequestable: true,
        enabled: true,
        displayOrder: roles.length + 1,
      }),
    });

    setNewRoleId('');
    setNewRoleName('');
    setNewMinRank('');
    fetchRoles();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Requestable Roles</h1>
        <p className="text-sm text-gray-400 mt-1">Configure which Discord rank roles members are allowed to apply for.</p>
      </div>

      {/* Add New Requestable Role Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Add New Requestable Role
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleAddRole} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input
            label="Discord Role ID"
            placeholder="e.g. 200000000000000005"
            value={newRoleId}
            onChange={(e) => setNewRoleId(e.target.value)}
            required
          />
          <Input
            label="Display Role Name"
            placeholder="e.g. CS2 Global Elite"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            required
          />
          <Input
            label="Min Rank Required (Optional)"
            placeholder="e.g. Global Elite / Diamond III"
            value={newMinRank}
            onChange={(e) => setNewMinRank(e.target.value)}
          />
          <Button type="submit" variant="primary" className="gap-2">
            <Plus className="w-4 h-4" /> Add Role
          </Button>
        </form>
      </Card>

      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Active Guild Roles ({roles.length})
          </CardTitle>
        </CardHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No roles configured.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-border bg-secondary/30">
                <tr>
                  <th className="py-3 px-4">Role Name</th>
                  <th className="py-3 px-4">Role ID</th>
                  <th className="py-3 px-4">Min Rank Requirement</th>
                  <th className="py-3 px-4">Requestable</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20"
                        style={{ backgroundColor: role.roleColor || '#99AAB5' }}
                      />
                      <span>{role.roleName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-400">{role.roleId}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-300">
                      {role.minRankRequired || <span className="text-gray-500 italic">None</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <Switch
                        checked={role.isRequestable}
                        onChange={() => handleToggleRequestable(role)}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <Switch
                        checked={role.enabled}
                        onChange={() => handleToggleEnabled(role)}
                      />
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
