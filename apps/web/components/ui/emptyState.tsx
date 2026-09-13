import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = 'search_off',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center bg-surface-container-low rounded-xl border border-border-subtle ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-outline mb-3">
        <span className="material-symbols-outlined text-[26px]">{icon}</span>
      </div>
      <h4 className="font-display text-base font-bold text-on-surface">{title}</h4>
      <p className="font-sans text-xs text-outline max-w-sm mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs transition-colors border border-border-subtle"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
