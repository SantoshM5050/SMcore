import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  badge?: string;
  badgeVariant?: 'emerald' | 'rose' | 'amber' | 'indigo' | 'neutral';
  subtext?: string;
  sparklineColor?: 'primary' | 'tertiary' | 'error';
  icon?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  badge,
  badgeVariant = 'neutral',
  subtext,
  sparklineColor,
  icon,
  className = '',
}: StatCardProps) {
  const badgeClasses: Record<string, string> = {
    emerald: 'bg-tertiary/15 text-tertiary border-tertiary/25',
    rose: 'bg-error/15 text-error border-error/25',
    amber: 'bg-warning/15 text-warning border-warning/25',
    indigo: 'bg-primary/15 text-primary-light border-primary/25',
    neutral: 'bg-surface-container-high text-outline border-outline-variant/30',
  };

  const sparklineColors: Record<string, { stroke: string; fill: string }> = {
    primary: { stroke: '#6366f1', fill: 'rgba(99, 102, 241, 0.15)' },
    tertiary: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)' },
    error: { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.15)' },
  };

  const spark = sparklineColor ? sparklineColors[sparklineColor] : null;

  return (
    <div
      className={`p-4 rounded-xl bg-surface-container border border-border-medium hover:border-border-active transition-all shadow-sm flex flex-col justify-between relative overflow-hidden group ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-outline">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badgeClasses[badgeVariant]}`}
            >
              {badge}
            </span>
          )}
          {icon && (
            <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-on-surface transition-colors">
              {icon}
            </span>
          )}
        </div>
      </div>

      <div className="my-2.5 flex items-baseline justify-between">
        <span className="font-display text-2xl font-bold text-on-surface tracking-tight">
          {value}
        </span>
        {subtext && (
          <span className="text-xs text-outline font-sans">
            {subtext}
          </span>
        )}
      </div>

      {spark && (
        <div className="w-full h-6 pt-1">
          <svg className="w-full h-full" fill="none" viewBox="0 0 100 24" preserveAspectRatio="none">
            <path
              d="M0 20 L15 16 L30 18 L50 8 L70 14 L85 6 L100 2"
              stroke={spark.stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M0 20 L15 16 L30 18 L50 8 L70 14 L85 6 L100 2 V24 H0 Z"
              fill={spark.fill}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
