'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ClipboardList, ShoppingCart, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/products', label: 'Products', icon: ClipboardList },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/history', label: 'History', icon: History },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm md:hidden">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 min-h-[3.5rem]',
                'text-xs transition-colors',
                active ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon size={20} />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
