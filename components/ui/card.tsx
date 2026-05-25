import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ className, padding = 'md', ...props }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
  return (
    <div
      className={cn(
        'rounded-xl bg-slate-900 border border-slate-700/60',
        paddings[padding],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between mb-3', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold text-slate-300 uppercase tracking-wider', className)}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string };
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-orange-500">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {trend && (
        <div className={cn('text-xs', trend.direction === 'up' ? 'text-green-400' : trend.direction === 'down' ? 'text-red-400' : 'text-slate-400')}>
          {trend.label}
        </div>
      )}
    </Card>
  );
}
