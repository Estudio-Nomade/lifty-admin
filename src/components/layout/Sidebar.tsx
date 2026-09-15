import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';
import { NavLinks } from './NavLinks';

type SidebarProps = {
  pendingCount?: number;
};

export function Sidebar({ pendingCount }: SidebarProps) {
  const { signOut, user } = useAuth();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-5">
        <img
          src="/lifty-logo.png"
          alt="Lifty"
          className="h-9 w-9 rounded-lg object-contain bg-white/10 p-0.5"
        />
        <div>
          <p className="text-sm font-semibold tracking-tight">Lifty Admin</p>
          <p className="text-xs text-sidebar-foreground/70">Ops plataforma</p>
        </div>
      </div>

      <NavLinks pendingCount={pendingCount} variant="sidebar" />

      <div className="border-t border-sidebar-border p-3">
        <p className="mb-2 truncate px-1 text-xs text-sidebar-foreground/60">
          {user?.email ?? 'Admin'}
        </p>
        <Button
          variant="ghost"
          className="min-h-11 w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
