import React from 'react';
import { Gamepad2 } from 'lucide-react';

export interface EmbedPreviewProps {
  title: string;
  description: string;
  footerText?: string;
  footerIconUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  colorHex: string;
  buttonLabel: string;
  buttonEmoji?: string;
}

export function LiveEmbedPreview({
  title,
  description,
  footerText,
  footerIconUrl,
  thumbnailUrl,
  imageUrl,
  colorHex,
  buttonLabel,
  buttonEmoji,
}: EmbedPreviewProps) {
  return (
    <div className="bg-[#2b2d31] p-4 rounded-xl border border-border/80 shadow-2xl max-w-md w-full">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Discord Client Preview</span>
      </div>

      {/* Embed Container */}
      <div
        className="bg-[#1e1f22] rounded-lg p-4 relative overflow-hidden border-l-4"
        style={{ borderLeftColor: colorHex || '#5865F2' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h4 className="font-bold text-white text-base leading-snug">{title || 'Panel Title'}</h4>
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {description || 'Panel description text goes here...'}
            </p>
          </div>

          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Thumbnail"
              className="w-16 h-16 rounded-lg object-cover border border-white/10 flex-shrink-0"
              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
            />
          )}
        </div>

        {imageUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border border-white/10 max-h-48">
            <img
              src={imageUrl}
              alt="Embed Media"
              className="w-full h-full object-cover"
              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
            />
          </div>
        )}

        {footerText && (
          <div className="mt-4 pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-gray-400">
            {footerIconUrl && <img src={footerIconUrl} alt="Footer Icon" className="w-4 h-4 rounded-full" />}
            <span>{footerText}</span>
          </div>
        )}
      </div>

      {/* Action Button Preview */}
      <div className="mt-3">
        <button
          type="button"
          disabled
          className="w-full bg-primary text-white font-semibold py-2.5 px-4 rounded-md flex items-center justify-center gap-2 text-sm shadow-md cursor-not-allowed opacity-90"
        >
          <span>{buttonEmoji || '🎮'}</span>
          <span>{buttonLabel || 'Apply for Role'}</span>
        </button>
      </div>
    </div>
  );
}
