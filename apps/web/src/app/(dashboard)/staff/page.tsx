'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Users, Shield, Plus, Trash2 } from 'lucide-react';

interface StaffPerm {
  id: string;
  roleId: string;
  roleName: string;
  permissionLevel: 'HIGH_COMMAND' | 'ROLE_REQUEST_MANAGER';
}

export default function StaffPage() {
  const sampleGuildId = '100000000000000000';
  const [staffList, setStaffList] = useState<StaffPerm[]>([]);
  const [loading, setLoading] = useState(true);

  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'HIGH_COMMAND' | 'ROLE_REQUEST_MANAGER'>('ROLE_REQUEST_MANAGER');

  const fetchStaff = () => {
    setLoading(true);
    fetch(`/api/guilds/${sampleGuildId}/staff`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setStaffList(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleId || !roleName) return;

    await fetch(`/api/guilds/${sampleGuildId}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roleId,
        roleName,
        permissionLevel,
      }),
    });

    setRoleId('');
    setRoleName('');
    fetchStaff();
  };

  const handleDeleteStaff = async (id: string) => {
    await fetch(`/api/guilds/${sampleGuildId}/staff?id=${id}`, {
      method: 'DELETE',
    });
    fetchStaff();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Staff Roles & Permissions</h1>
        <p className="text-sm text-gray-400 mt-1">
          Assign High Command and Role Request Manager authorization levels to Discord roles.
        </p>
      </div>

      {/* Add Staff Permission Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Bind Staff Role Permission
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input
            label="Discord Role ID"
            placeholder="e.g. 300000000000000001"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            required
          />
          <Input
            label="Role Label / Name"
            placeholder="e.g. Lead Moderator"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Permission Level
            </label>
            <select
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value as any)}
              className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ROLE_REQUEST_MANAGER">Role Request Manager (Approve/Reject)</option>
              <option value="HIGH_COMMAND">High Command (Full Control)</option>
            </select>
          </div>
          <Button type="submit" variant="primary" className="gap-2">
            <Plus className="w-4 h-4" /> Grant Permission
          </Button>
        </form>
      </Card>

      {/* Authorized Staff Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Active Staff Permission Bindings ({staffList.length})
          </CardTitle>
        </CardHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading staff roles...</div>
        ) : staffList.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No staff permissions bound yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-border bg-secondary/30">
                <tr>
                  <th className="py-3 px-4">Role Name</th>
                  <th className="py-3 px-4">Role ID</th>
                  <th className="py-3 px-4">Permission Tier</th>
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
                      <Badge variant={item.permissionLevel === 'HIGH_COMMAND' ? 'primary' : 'default'}>
                        {item.permissionLevel}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteStaff(item.id)}
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
