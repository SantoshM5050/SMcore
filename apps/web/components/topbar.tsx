import React from 'react';
import { ChevronDown, Search, Server, User } from 'lucide-react';

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface/80 px-6 backdrop-blur-md">
      {/* Guild Selector (Placeholder) */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2.5 rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-container-high transition-colors">
          <Server className="h-4 w-4 text-primary" />
          <span>Select Discord Server</span>
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        </button>
      </div>

      {/* Center Search / Command bar */}
      <div className="relative hidden w-96 md:block">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Quick search or press ⌘K..."
          readOnly
          className="w-full rounded-md border border-outline-variant bg-surface-container py-1.5 pl-9 pr-8 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-outline-variant bg-surface px-1.5 text-[10px] text-text-muted">
          ⌘K
        </kbd>
      </div>

      {/* Right User & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-2.5 py-1 text-xs">
          <span className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
          <span className="text-[11px] font-medium text-text-secondary">Bot Gateway Active</span>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-text-secondary">
          <User className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
