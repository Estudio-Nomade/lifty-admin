import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { NavLinks } from './NavLinks';

type MobileNavProps = {
  pendingCount?: number;
};

export function MobileNav({ pendingCount }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { signOut, user } = useAuth();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(100%,20rem)] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&_[data-slot=sheet-close]]:text-sidebar-foreground"
        showCloseButton
      >
        <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
          <div className="flex items-center gap-2 pr-8">
            <img
              src="/lifty-logo.png"
              alt=""
              className="h-9 w-9 rounded-lg bg-white/10 object-contain p-0.5"
            />
            <div>
              <SheetTitle className="text-sidebar-foreground">Lifty Admin</SheetTitle>
              <SheetDescription className="text-sidebar-foreground/70">
                Ops plataforma
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <NavLinks
          pendingCount={pendingCount}
          variant="sheet"
          onNavigate={() => setOpen(false)}
        />

        <div className="mt-auto border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="mb-2 truncate px-1 text-xs text-sidebar-foreground/60">
            {user?.email ?? 'Admin'}
          </p>
          <Button
            variant="ghost"
            className="min-h-12 w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
