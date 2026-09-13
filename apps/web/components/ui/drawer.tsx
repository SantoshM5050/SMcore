'use client';

import React, { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  badge,
  actions,
  children,
  className = '',
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Inspection Pane */}
      <aside
        className={`w-full xl:w-[32%] 2xl:w-[28%] bg-surface-container-low border border-border-medium rounded-xl shadow-xl flex flex-col overflow-hidden transition-all duration-300 z-50 xl:z-10 fixed xl:relative inset-y-4 right-4 xl:inset-auto max-h-[calc(100vh-2rem)] xl:max-h-none ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="px-4 py-3 bg-surface-container border-b border-border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {typeof title === 'string' ? (
              <h3 className="font-display text-base font-bold text-on-surface truncate">
                {title}
              </h3>
            ) : (
              title
            )}
            {badge}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {actions}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Close panel (Esc)"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] flex-1">
          {children}
        </div>
      </aside>
    </>
  );
}
