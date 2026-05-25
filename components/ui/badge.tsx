import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'low' | 'warning' | 'good' | 'uncounted' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    low: 'bg-red-500/20 text-red-400 border border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    good: 'bg-green-500/20 text-green-400 border border-green-500/30',
    uncounted: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    outline: 'border border-slate-600 text-slate-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
