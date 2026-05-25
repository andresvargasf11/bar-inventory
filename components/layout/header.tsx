'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wine, LayoutDashboard, Package, ClipboardList, ShoppingCart, History, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/app/actions/auth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/products', label: 'Products', icon: ClipboardList },
  { href: '/orders', label: 'Order List', icon: ShoppingCart },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <Wine size={20} className="text-orange-500" />
            <span className="hidden sm:block">Bar Inventory</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-orange-500/10 text-orange-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Lock button */}
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Lock app"
            >
              <LogOut size={15} />
              <span className="hidden sm:block">Lock</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
