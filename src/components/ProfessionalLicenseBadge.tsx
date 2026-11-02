import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PHASE_STYLES: Record<string, string> = {
  not_started: 'border-amber-300 bg-amber-50 text-amber-900',
  grace: 'border-sky-300 bg-sky-50 text-sky-900',
  overdue: 'border-red-300 bg-red-50 text-red-900',
};

function badgeLabel(phase: string, daysRemaining: number | null | undefined): string {
  if (phase === 'overdue') return 'Carnet profesional — Vencido';
  if (phase === 'not_started') return 'Carnet profesional pendiente — sin reloj';
  if (phase === 'grace') {
    if (daysRemaining != null) {
      return `Carnet profesional pendiente — quedan ${daysRemaining} días`;
    }
    return 'Carnet profesional pendiente';
  }
  return `Carnet profesional — ${phase}`;
}

/** Ops badge for auto professional-carnet grace (not stickers IdentificationBadge). */
export function ProfessionalLicenseBadge({
  phase,
  daysRemaining,
  className,
}: {
  phase?: string | null;
  daysRemaining?: number | null;
  className?: string;
}) {
  if (!phase || phase === 'satisfied' || phase === 'not_applicable') return null;

  return (
    <Badge
      variant="outline"
      className={cn(PHASE_STYLES[phase] ?? 'border-slate-300 bg-slate-50 text-slate-800', className)}
    >
      {badgeLabel(phase, daysRemaining)}
    </Badge>
  );
}
