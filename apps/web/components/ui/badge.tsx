import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-surface-container text-text-primary border-outline-variant',
    success: 'bg-emerald-500/10 text-status-success border-emerald-500/20',
    warning: 'bg-amber-500/10 text-status-warning border-amber-500/20',
    danger: 'bg-rose-500/10 text-status-danger border-rose-500/20',
    outline: 'border-outline text-text-secondary',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
