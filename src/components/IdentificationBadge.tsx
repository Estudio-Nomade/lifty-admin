import { Badge } from '@/components/ui/badge';
import type { IdentificationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const LABELS: Record<IdentificationStatus, string> = {
  pending_pickup: 'Pendiente retiro en tránsito',
  issued: 'Emitida',
  revoked: 'Revocada',
};

const STYLES: Record<IdentificationStatus, string> = {
  pending_pickup: 'border-amber-300 bg-amber-50 text-amber-900',
  issued: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  revoked: 'border-red-300 bg-red-50 text-red-900',
};

const PHASE_LABELS: Record<string, string> = {
  grace: 'En plazo',
  reminder: 'Recordatorio 20d+',
  paused: 'Suspendida 30d+',
  issued: 'OK',
  revoked: 'Revocada',
  unknown: 'Sin reloj',
};

const PHASE_STYLES: Record<string, string> = {
  grace: 'border-sky-300 bg-sky-50 text-sky-900',
  reminder: 'border-amber-300 bg-amber-50 text-amber-900',
  paused: 'border-red-300 bg-red-50 text-red-900',
  issued: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  revoked: 'border-red-300 bg-red-50 text-red-900',
  unknown: 'border-slate-300 bg-slate-50 text-slate-800',
};

export function IdentificationBadge({
  status,
  phase,
  className,
}: {
  status?: IdentificationStatus | null;
  phase?: string | null;
  className?: string;
}) {
  const value = status ?? 'pending_pickup';
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      <Badge variant="outline" className={STYLES[value]}>
        {LABELS[value]}
      </Badge>
      {phase && value === 'pending_pickup' ? (
        <Badge variant="outline" className={PHASE_STYLES[phase] ?? PHASE_STYLES.unknown}>
          {PHASE_LABELS[phase] ?? phase}
        </Badge>
      ) : null}
    </span>
  );
}
