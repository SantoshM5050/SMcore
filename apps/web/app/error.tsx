'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error in SMCore Web:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-status-danger mb-4">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="font-display text-xl font-bold text-text-primary">
        An unexpected error occurred
      </h2>
      <p className="mt-2 max-w-md text-xs text-text-muted">
        {error.message || 'Something went wrong while rendering the dashboard interface.'}
      </p>
      <div className="mt-6">
        <Button onClick={() => reset()} variant="secondary" size="sm" className="flex items-center gap-2">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Try again</span>
        </Button>
      </div>
    </div>
  );
}
