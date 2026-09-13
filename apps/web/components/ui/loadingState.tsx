import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = 'Loading server telemetry...',
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[300px] gap-3 text-outline ${className}`}
    >
      <span className="material-symbols-outlined text-3xl animate-spin text-primary">
        progress_activity
      </span>
      <span className="text-xs font-mono tracking-wider uppercase text-outline">
        {message}
      </span>
    </div>
  );
}
