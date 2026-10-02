'use client';

import React, { useState } from 'react';
import { useGuild } from '@/lib/context/guildContext';

interface EmbedField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

export default function DiscordEmbedBuilderPage() {
  const { selectedGuildId } = useGuild();

  const [authorName, setAuthorName] = useState('SMCore Governance');
  const [authorIcon, setAuthorIcon] = useState('');
  const [title, setTitle] = useState('🛡️ Welcome to Apex Gaming Community!');
  const [description, setDescription] = useState(
    'Please read our server guidelines in #rules and verify your account in #verification.\n\nEnjoy your stay and welcome to the community, {user}!'
  );
  const [color, setColor] = useState('#5865F2');
  const [footerText, setFooterText] = useState('Apex Gaming Community · Server ID: {guild}');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetChannel, setTargetChannel] = useState('100100100100100101');
  const [fields, setFields] = useState<EmbedField[]>([
    { id: '1', name: 'Rules Channel', value: '<#100100100100100102>', inline: true },
    { id: '2', name: 'Member Count', value: '{memberCount} Members', inline: true },
  ]);

  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const addField = () => {
    if (fields.length >= 25) return;
    setFields((prev) => [
      ...prev,
      { id: String(Date.now()), name: 'New Field Title', value: 'Field description here', inline: false },
    ]);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateField = (id: string, key: keyof EmbedField, val: any) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: val } : f)));
  };

  const handleSendEmbed = async () => {
    setIsSending(true);
    setDispatchStatus(null);
    try {
      // Simulate or dispatch embed to channel
      await new Promise((resolve) => setTimeout(resolve, 800));
      setDispatchStatus(`Embed successfully dispatched to channel <#${targetChannel}>!`);
      setTimeout(() => setDispatchStatus(null), 4000);
    } catch {
      setDispatchStatus('Failed to dispatch embed.');
    } finally {
      setIsSending(false);
    }
  };

  // Preview text with substituted placeholders
  const previewDesc = description
    .replace(/{user}/g, '@NewMember')
    .replace(/{guild}/g, 'Apex Gaming')
    .replace(/{memberCount}/g, '1,482');

  const previewFooter = footerText
    .replace(/{user}/g, '@NewMember')
    .replace(/{guild}/g, '987654321098765432')
    .replace(/{memberCount}/g, '1,482');

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>COMMUNITY</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">DISCORD EMBEDS</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] text-secondary">
              VISUAL BUILDER
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Discord Embed Builder & Message Dispatcher
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-[11px] font-medium border border-indigo-500/20">
              Live Discord WYSIWYG
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dispatchStatus && (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30 animate-fade-in">
              {dispatchStatus}
            </span>
          )}
          <button
            type="button"
            onClick={handleSendEmbed}
            disabled={isSending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>{isSending ? 'Sending to Discord...' : 'Dispatch Embed'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Controls on Left, Realistic Discord Preview on Right */}
      <div className="px-6 py-5 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Embed Controls */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-border-subtle space-y-4 text-xs">
          <div className="border-b border-border-subtle pb-3">
            <h2 className="font-bold text-sm text-on-surface">Embed Configuration</h2>
            <p className="text-outline text-[11px] font-sans">
              Support placeholders: <code className="text-primary">{"{user}"}</code>, <code className="text-primary">{"{guild}"}</code>, <code className="text-primary">{"{memberCount}"}</code>
            </p>
          </div>

          <div className="space-y-3">
            {/* Target Channel */}
            <div>
              <label className="text-[11px] font-mono uppercase font-bold text-outline block mb-1">
                Dispatch Destination Channel
              </label>
              <select
                value={targetChannel}
                onChange={(e) => setTargetChannel(e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono focus:outline-none focus:border-primary"
              >
                <option value="100100100100100101">#general</option>
                <option value="100100100100100102">#announcements</option>
                <option value="100100100100100104">#support-desk</option>
              </select>
            </div>

            {/* Author */}
            <div>
              <label className="text-[11px] font-mono uppercase font-bold text-outline block mb-1">
                Author Line
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author title (optional)..."
                className="w-full px-3 py-1.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle focus:outline-none focus:border-primary"
              />
            </div>

            {/* Title */}
            <div>
              <label className="text-[11px] font-mono uppercase font-bold text-outline block mb-1">
                Embed Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Embed title..."
                className="w-full px-3 py-1.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle focus:outline-none focus:border-primary font-semibold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-mono uppercase font-bold text-outline block mb-1">
                Description / Body
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Main embed text, supports Discord markdown..."
                className="w-full p-3 bg-surface-container text-on-surface rounded-lg border border-border-subtle focus:outline-none focus:border-primary font-sans leading-relaxed"
              />
            </div>

            {/* Color Accent */}
            <div>
              <label className="text-[11px] font-mono uppercase font-bold text-outline block mb-1">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border-subtle bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="px-3 py-1.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle font-mono text-xs w-28 uppercase focus:outline-none"
                />
                <div className="flex gap-1.5">
                  {['#5865F2', '#23A55A', '#F0B232', '#F23F43', '#EB459E'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColor(preset)}
                      style={{ backgroundColor: preset }}
                      className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
                      title={preset}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Fields */}
            <div className="pt-2 border-t border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase font-bold text-outline">
                  Embed Fields ({fields.length}/25)
                </span>
                <button
                  type="button"
                  onClick={addField}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  + Add Field
                </button>
              </div>

              <div className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="p-2.5 rounded-lg bg-surface-container border border-border-subtle space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(field.id, 'name', e.target.value)}
                        placeholder="Field Title"
                        className="flex-1 px-2 py-1 bg-surface-container-high text-on-surface rounded text-xs border border-border-subtle font-semibold focus:outline-none"
                      />
                      <label className="flex items-center gap-1 text-[11px] text-outline cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={field.inline}
                          onChange={(e) => updateField(field.id, 'inline', e.target.checked)}
                          className="accent-primary"
                        />
                        <span>Inline</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="text-rose-400 hover:text-rose-300 text-sm px-1"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateField(field.id, 'value', e.target.value)}
                      placeholder="Field Value"
                      className="w-full px-2 py-1 bg-surface-container-high text-on-surface rounded text-xs border border-border-subtle focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-border-subtle">
              <label className="text-[11px] font-mono uppercase font-bold text-outline block mb-1">
                Footer Text
              </label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Footer text..."
                className="w-full px-3 py-1.5 bg-surface-container text-on-surface rounded-lg border border-border-subtle focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Realistic Discord Message Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-outline px-1">
            <span className="font-mono uppercase text-[10px]">Client Preview</span>
            <span className="font-mono text-[10px]">Discord Dark Mode</span>
          </div>

          <div className="p-4 rounded-xl bg-[#313338] border border-[#232428] shadow-2xl select-none font-sans">
            {/* Simulated Discord Message Row */}
            <div className="flex items-start gap-4">
              {/* Bot Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#5865f2] text-white font-bold flex items-center justify-center shrink-0 shadow-md">
                SM
              </div>

              <div className="flex-1 min-w-0">
                {/* Bot Author Bar */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[#f2f3f5] text-sm hover:underline cursor-pointer">
                    SMCore
                  </span>
                  <span className="bg-[#5865f2] text-white text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                    APP
                  </span>
                  <span className="text-[#949ba4] text-[11px]">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* The Embed Box */}
                <div
                  style={{ borderLeftColor: color }}
                  className="rounded-r-lg bg-[#2b2d31] p-3.5 border-l-4 border-[#232428] max-w-lg space-y-2.5 shadow-sm"
                >
                  {/* Author Line */}
                  {authorName && (
                    <div className="text-[12px] font-bold text-[#f2f3f5] flex items-center gap-1.5">
                      {authorName}
                    </div>
                  )}

                  {/* Title */}
                  {title && (
                    <div className="font-bold text-[#00a8fc] text-[15px] hover:underline cursor-pointer">
                      {title}
                    </div>
                  )}

                  {/* Description */}
                  {previewDesc && (
                    <div className="text-[#dbdee1] text-[13px] leading-relaxed whitespace-pre-wrap">
                      {previewDesc}
                    </div>
                  )}

                  {/* Fields */}
                  {fields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {fields.map((f) => (
                        <div key={f.id} className={f.inline ? 'col-span-1' : 'col-span-2'}>
                          <div className="text-[12px] font-bold text-[#dbdee1]">{f.name}</div>
                          <div className="text-[13px] text-[#b5bac1] leading-relaxed">{f.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  {previewFooter && (
                    <div className="text-[11px] text-[#949ba4] pt-1 border-t border-[#35373c] flex items-center gap-1.5">
                      <span>{previewFooter}</span>
                      <span>•</span>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
