'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, UserPlus, Image as ImageIcon, Shield, Sparkles, MessageSquare } from 'lucide-react';

export default function WelcomePage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [config, setConfig] = useState({
    enabled: true,
    channelId: '',
    embedTitle: 'Welcome to the Server!',
    embedDescription: 'Hey {user}, welcome to {server}! Enjoy your stay and check out the rules channel.',
    embedColor: '#5865F2',
    bannerUrl: '',
    autoRoleId: '',
    goodbyeEnabled: false,
    goodbyeChannelId: '',
    goodbyeMessage: '{user} has left the server.',
  });

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);

    fetch(`/api/guilds/${guildId}/welcome`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) setConfig((prev) => ({ ...prev, ...data }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch(`/api/guilds/${guildId}/channels/list`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setChannels(data); })
      .catch(console.error);

    fetch(`/api/guilds/${guildId}/roles`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setRoles(data); })
      .catch(console.error);
  }, [guildId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');

    try {
      const res = await fetch(`/api/guilds/${guildId}/welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setSuccess('Welcome System configuration saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase mb-1">
            <span>Module 3 • Welcome & Auto-Role System</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome & Auto-Role Hub</h1>
          <p className="text-sm text-gray-400 mt-1">Configure automated member welcome embeds, goodbye messages, and auto-roles.</p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {loading ? (
        <Card className="p-8 text-center text-gray-400 text-sm">Loading Welcome System settings...</Card>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Welcome Toggle & Channel */}
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-base font-bold text-white">Welcome Embed System</h3>
                    <p className="text-xs text-gray-400">Post formatted embed message when a new member joins.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    WELCOME TARGET CHANNEL
                  </label>
                  {channels.length > 0 ? (
                    <select
                      value={config.channelId || ''}
                      onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                      className="w-full bg-secondary/70 border border-border rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="">-- Select Channel --</option>
                      {channels.map((c) => (
                        <option key={c.id} value={c.id}>#{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={config.channelId || ''}
                      onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                      placeholder="Enter Channel ID"
                      className="w-full bg-secondary/70 border border-border rounded-xl px-3 py-2 text-xs text-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    MEMBER AUTO-ROLE ON JOIN
                  </label>
                  <select
                    value={config.autoRoleId || ''}
                    onChange={(e) => setConfig({ ...config, autoRoleId: e.target.value })}
                    className="w-full bg-secondary/70 border border-border rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- No Auto-Role --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>@{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    EMBED TITLE
                  </label>
                  <input
                    type="text"
                    value={config.embedTitle}
                    onChange={(e) => setConfig({ ...config, embedTitle: e.target.value })}
                    placeholder="Welcome to the Server!"
                    className="w-full bg-secondary/70 border border-border rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    EMBED DESCRIPTION
                  </label>
                  <textarea
                    rows={3}
                    value={config.embedDescription}
                    onChange={(e) => setConfig({ ...config, embedDescription: e.target.value })}
                    placeholder="Hey {user}, welcome to {server}! Enjoy your stay..."
                    className="w-full bg-secondary/70 border border-border rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Placeholders: <code className="text-primary font-mono">{'{user}'}</code> (Mention), <code className="text-primary font-mono">{'{server}'}</code> (Guild Name).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      EMBED COLOR
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.embedColor}
                        onChange={(e) => setConfig({ ...config, embedColor: e.target.value })}
                        className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.embedColor}
                        onChange={(e) => setConfig({ ...config, embedColor: e.target.value })}
                        className="flex-1 bg-secondary/70 border border-border rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      BANNER IMAGE URL (OPTIONAL)
                    </label>
                    <input
                      type="url"
                      value={config.bannerUrl || ''}
                      onChange={(e) => setConfig({ ...config, bannerUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-secondary/70 border border-border rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Goodbye Settings */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Goodbye Message System</h3>
                    <p className="text-xs text-gray-400">Post a message when a member leaves the server.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.goodbyeEnabled}
                  onChange={(e) => setConfig({ ...config, goodbyeEnabled: e.target.checked })}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
              </div>

              {config.goodbyeEnabled && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      GOODBYE TARGET CHANNEL
                    </label>
                    {channels.length > 0 ? (
                      <select
                        value={config.goodbyeChannelId || ''}
                        onChange={(e) => setConfig({ ...config, goodbyeChannelId: e.target.value })}
                        className="w-full bg-secondary/70 border border-border rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="">-- Same as Welcome Channel --</option>
                        {channels.map((c) => (
                          <option key={c.id} value={c.id}>#{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={config.goodbyeChannelId || ''}
                        onChange={(e) => setConfig({ ...config, goodbyeChannelId: e.target.value })}
                        placeholder="Enter Channel ID"
                        className="w-full bg-secondary/70 border border-border rounded-xl px-3 py-2 text-xs text-white"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      GOODBYE MESSAGE
                    </label>
                    <input
                      type="text"
                      value={config.goodbyeMessage}
                      onChange={(e) => setConfig({ ...config, goodbyeMessage: e.target.value })}
                      placeholder="{user} has left the server."
                      className="w-full bg-secondary/70 border border-border rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} size="md" className="font-bold">
                {saving ? 'Saving...' : '💾 Save Welcome Configuration'}
              </Button>
            </div>
          </div>

          {/* Right Column: Live Embed Preview */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Live Embed Preview
            </h3>

            <div className="bg-[#2f3136] rounded-xl p-4 shadow-2xl border border-white/5 space-y-3 font-sans">
              <div className="flex items-center gap-2 text-xs text-gray-300 font-semibold border-b border-white/10 pb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>SMCore Bot</span>
                <span className="bg-[#5865F2] text-white text-[9px] px-1 rounded font-bold">BOT</span>
                <span className="text-[10px] text-gray-400 ml-auto">Today at 12:00 PM</span>
              </div>

              <div
                className="bg-[#2b2d31] rounded-r-md p-4 space-y-2 text-white border-l-4"
                style={{ borderColor: config.embedColor || '#5865F2' }}
              >
                <h4 className="font-bold text-base">{config.embedTitle || 'Welcome to the Server!'}</h4>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {(config.embedDescription || 'Hey {user}, welcome to {server}!')
                    .replace(/\{user\}/g, '@NewUser')
                    .replace(/\{server\}/g, 'The Code Network')}
                </p>

                {config.bannerUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-white/10 max-h-40">
                    <img src={config.bannerUrl} alt="Welcome Banner" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {config.autoRoleId && (
                <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
                  <Shield className="w-3.5 h-3.5" /> Auto-assigning Role ID: {config.autoRoleId}
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
