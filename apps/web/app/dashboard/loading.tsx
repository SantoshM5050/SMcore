import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-surface-container" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-lg border border-outline-variant bg-surface" />
        ))}
      </div>
      <div className="h-64 rounded-lg border border-outline-variant bg-surface" />
    </div>
  );
}
