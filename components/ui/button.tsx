import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      default: 'bg-orange-500 hover:bg-orange-600 text-white',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100',
      destructive: 'bg-red-600 hover:bg-red-700 text-white',
      ghost: 'hover:bg-slate-700 text-slate-300 hover:text-white',
      outline: 'border border-slate-600 hover:bg-slate-700 text-slate-300',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm min-w-[2rem]',
      md: 'h-10 px-4 text-sm min-w-[2.5rem]',
      lg: 'h-12 px-6 text-base min-w-[2.75rem]',
      icon: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
