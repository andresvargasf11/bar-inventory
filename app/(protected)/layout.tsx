import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { runMigrations } from '@/lib/db';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await runMigrations();
  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4 pb-20 md:pb-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
