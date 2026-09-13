import React from 'react';

export type BadgeVariant = 'emerald' | 'rose' | 'amber' | 'indigo' | 'neutral';

interface StatusBadgeProps {
  variant?: BadgeVariant;
  pulse?: boolean;
  children: React.ReactNode;
  icon?: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  emerald: {
    bg: 'bg-tertiary/15',
    text: 'text-tertiary',
    border: 'border-tertiary/30',
    dot: 'bg-tertiary',
  },
  rose: {
    bg: 'bg-error/15',
    text: 'text-error',
    border: 'border-error/30',
    dot: 'bg-error',
  },
  amber: {
    bg: 'bg-warning/15',
    text: 'text-warning',
    border: 'border-warning/30',
    dot: 'bg-warning',
  },
  indigo: {
    bg: 'bg-primary/15',
    text: 'text-primary-light',
    border: 'border-primary/30',
    dot: 'bg-primary',
  },
  neutral: {
    bg: 'bg-surface-container-highest/60',
    text: 'text-on-surface-variant',
    border: 'border-outline-variant/40',
    dot: 'bg-outline',
  },
};

export function StatusBadge({
  variant = 'neutral',
  pulse = false,
  children,
  icon,
  className = '',
}: StatusBadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tracking-wider uppercase border ${styles.bg} ${styles.text} ${styles.border} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.dot}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${styles.dot}`} />
        </span>
      )}
      {!pulse && icon && (
        <span className="material-symbols-outlined text-[13px]">{icon}</span>
      )}
      <span>{children}</span>
    </span>
  );
}
