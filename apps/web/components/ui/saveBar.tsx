import React from 'react';

interface SaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  message?: string;
}

export function SaveBar({
  isDirty,
  isSaving,
  onSave,
  onReset,
  message = 'Careful — you have unsaved configuration changes!',
}: SaveBarProps) {
  if (!isDirty) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-slide-up">
      <div className="p-3.5 rounded-xl bg-surface-container-high border border-primary/40 shadow-2xl shadow-black/80 flex items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-warning text-[20px] shrink-0">
            warning
          </span>
          <span className="text-xs font-medium text-on-surface truncate">
            {message}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onReset}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface text-xs font-medium transition-colors disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
          >
            {isSaving && (
              <span className="material-symbols-outlined text-[14px] animate-spin">
                progress_activity
              </span>
            )}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
