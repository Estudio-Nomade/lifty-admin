import { apiFetch } from '@/lib/api';
import type { PendingDriver } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { data } = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn: () => apiFetch<PendingDriver[]>('/admin/drivers/pending'),
    refetchInterval: 30_000,
  });

  const pendingCount = data?.length ?? 0;

  return (
    <div className="flex h-full min-h-dvh w-full flex-col bg-background md:flex-row">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground pt-[env(safe-area-inset-top)] md:hidden">
        <MobileNav pendingCount={pendingCount} />
        <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5">
          <img
            src="/lifty-logo.png"
            alt=""
            className="h-8 w-8 shrink-0 rounded-md bg-white/10 object-contain p-0.5"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Lifty Admin</p>
            <p className="truncate text-xs text-sidebar-foreground/70">Ops</p>
          </div>
        </div>
        {pendingCount > 0 ? (
          <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            {pendingCount}
          </span>
        ) : null}
      </header>

      <Sidebar pendingCount={pendingCount} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
