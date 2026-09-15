import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './nav-items';

type NavLinksProps = {
  pendingCount?: number;
  onNavigate?: () => void;
  variant?: 'sidebar' | 'sheet';
};

export function NavLinks({ pendingCount, onNavigate, variant = 'sidebar' }: NavLinksProps) {
  const isSheet = variant === 'sheet';

  return (
    <nav className={cn('flex flex-1 flex-col gap-1', isSheet ? 'p-2' : 'p-3')}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors md:min-h-0 md:gap-2 md:py-2.5 md:text-sm',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                item.disabled && 'pointer-events-none opacity-40',
              )
            }
          >
            <Icon className="size-5 shrink-0 md:size-4" />
            <span className="flex-1">{item.label}</span>
            {item.to === '/' && pendingCount != null && pendingCount > 0 ? (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {pendingCount}
              </span>
            ) : null}
          </NavLink>
        );
      })}
    </nav>
  );
}
