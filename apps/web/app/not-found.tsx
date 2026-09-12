import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary mb-4">
        <FileQuestion className="h-6 w-6" />
      </div>
      <h2 className="font-display text-2xl font-bold text-text-primary">
        404 — Page Not Found
      </h2>
      <p className="mt-2 max-w-sm text-xs text-text-muted">
        The requested resource or dashboard view does not exist or has been relocated.
      </p>
      <div className="mt-6">
        <Link href="/dashboard">
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
