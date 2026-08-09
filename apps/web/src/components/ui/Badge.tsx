import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'pending' | 'approved' | 'rejected' | 'default' | 'primary' | 'success' | 'warning' | 'secondary';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
    default: 'bg-secondary text-gray-300 border-border',
    secondary: 'bg-secondary text-gray-300 border-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
