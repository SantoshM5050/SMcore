import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-primary text-surface font-semibold hover:bg-[#a9abff] shadow-sm',
      secondary: 'bg-surface-container text-text-primary hover:bg-surface-high border border-outline-variant',
      outline: 'border border-outline bg-transparent text-text-primary hover:bg-surface-container',
      ghost: 'bg-transparent text-text-secondary hover:bg-surface-container hover:text-text-primary',
      danger: 'bg-rose-500/10 text-status-danger hover:bg-rose-500/20 border border-rose-500/30',
    };

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-11 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
