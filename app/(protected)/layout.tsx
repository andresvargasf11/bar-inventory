import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
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
