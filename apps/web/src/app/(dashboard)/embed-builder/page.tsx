'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LiveEmbedPreview } from '@/components/embed-builder/LiveEmbedPreview';
import { Palette, Send, Save, Check, Trash2, RefreshCw } from 'lucide-react';

export default function EmbedBuilderPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId') || '100000000000000000';

  const [title, setTitle] = useState('🎮 Gaming Role Verification Request');
  const [description, setDescription] = useState(
    'Click below to apply for official rank roles! Select your target role and fill out your in-game credentials.'
  );
  const [footerText, setFooterText] = useState('Role Request Management System');
  const [footerIconUrl, setFooterIconUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [colorHex, setColorHex] = useState('#5865F2');
  const [buttonLabel, setButtonLabel] = useState('Apply for Role');
  const [buttonEmoji, setButtonEmoji] = useState('🎮');

  const [targetChannelId, setTargetChannelId] = useState('');
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [saved, setSaved] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/embeds`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setTitle(data.title || '');
          setDescription(data.description || '');
          setFooterText(data.footerText || '');
          setFooterIconUrl(data.footerIconUrl || '');
          setThumbnailUrl(data.thumbnailUrl || '');
          setImageUrl(data.imageUrl || '');
          setColorHex(data.colorHex || '#5865F2');
          setButtonLabel(data.buttonLabel || 'Apply for Role');
          setButtonEmoji(data.buttonEmoji || '🎮');
        }
      });

    fetch(`/api/guilds/${guildId}/channels`)
      .then((res) => res.json())
      .then((data) => {
        if (data.discordChannels) setChannels(data.discordChannels);
        if (data.config?.requestChannelId) setTargetChannelId(data.config.requestChannelId);
      });
  }, [guildId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    await fetch(`/api/guilds/${guildId}/embeds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        footerText,
        footerIconUrl,
        thumbnailUrl,
        imageUrl,
        colorHex,
        buttonLabel,
        buttonEmoji,
      }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDeployOrUpdate = async () => {
    if (!targetChannelId) {
      alert('Please select a target Discord channel first.');
      return;
    }

    setDeploying(true);
    setStatusMsg('');

    try {
      const res = await fetch(`/api/guilds/${guildId}/embeds/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: targetChannelId }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatusMsg(data.message || 'Panel deployed/updated successfully!');
      } else {
        setStatusMsg(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMsg(`Deploy error: ${err.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleDeletePanel = async () => {
    if (!confirm('Are you sure you want to unbind and delete this panel embed deployment?')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/embeds/delete`, { method: 'POST' });
      if (res.ok) {
        setStatusMsg('Panel message unlinked and deleted.');
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Panel Embed Builder</h1>
        <p className="text-sm text-gray-400 mt-1">
          Customize panel embeds, button labels, emojis, colors, and deploy/update live in Discord.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Editor Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> Embed Properties
              </CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <Input
                label="Embed Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Embed Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Footer Text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                />
                <Input
                  label="Color Hex"
                  type="text"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  placeholder="#5865F2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Thumbnail URL"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                />
                <Input
                  label="Banner / Image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <Input
                  label="Button Label"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  required
                />
                <Input
                  label="Button Emoji"
                  value={buttonEmoji}
                  onChange={(e) => setButtonEmoji(e.target.value)}
                  placeholder="🎮"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              {saved && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Config Saved!
                </span>
              )}
              {!saved && <div />}
              <Button type="submit" variant="primary" className="gap-2">
                <Save className="w-4 h-4" /> Save Embed Config
              </Button>
            </div>
          </Card>

          {/* Deployment Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" /> Channel Panel Deployment
              </CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Target Request Channel
                </label>
                <select
                  value={targetChannelId}
                  onChange={(e) => setTargetChannelId(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select channel...</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              {statusMsg && <p className="text-xs font-semibold text-emerald-400">{statusMsg}</p>}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={handleDeployOrUpdate}
                  disabled={deploying || !targetChannelId}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 gap-2 text-xs"
                >
                  <Send className="w-4 h-4" /> {deploying ? 'Deploying...' : 'Deploy / Update Panel'}
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDeletePanel}
                  className="py-2.5 gap-2 text-xs"
                >
                  <Trash2 className="w-4 h-4" /> Delete Panel Message
                </Button>
              </div>
            </div>
          </Card>
        </form>

        {/* Live Preview Column */}
        <div className="sticky top-24 flex flex-col items-center">
          <LiveEmbedPreview
            title={title}
            description={description}
            footerText={footerText}
            footerIconUrl={footerIconUrl}
            thumbnailUrl={thumbnailUrl}
            imageUrl={imageUrl}
            colorHex={colorHex}
            buttonLabel={buttonLabel}
            buttonEmoji={buttonEmoji}
          />
        </div>
      </div>
    </div>
  );
}
