import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import type { DashboardRange, DashboardSummary } from '@/lib/types';
import { formatArs, formatPctFraction } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  Car,
  CircleDollarSign,
  LayoutDashboard,
  Percent,
  RefreshCw,
  Users,
  Wifi,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
];

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight text-navy">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('today');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'dashboard', 'summary', range],
    queryFn: () =>
      apiFetch<DashboardSummary>(`/admin/dashboard/summary?range=${range}`),
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-destructive/30 bg-red-50 p-8 text-center">
        <p className="text-sm text-destructive">
          {(error as Error)?.message ?? 'No se pudo cargar el dashboard'}
        </p>
        <Button className="mt-4" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const emptyTrips = data.trips.completed === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LayoutDashboard className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Ops</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-navy sm:text-2xl">
            Inicio
          </h1>
          <p className="text-sm text-muted-foreground">
            Conductores activos, viajes y recaudación (split ya guardado por viaje).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-card p-0.5">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                type="button"
                size="sm"
                variant={range === r.value ? 'default' : 'ghost'}
                className="min-h-9"
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 gap-1"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Online ahora"
          value={String(data.drivers.online_now)}
          hint="is_online = true"
          icon={Wifi}
        />
        <KpiCard
          title="Aprobados"
          value={String(data.drivers.approved)}
          hint={`${data.drivers.pending_review} en pendientes`}
          icon={Users}
        />
        <KpiCard
          title="Viajes completados"
          value={String(data.trips.completed)}
          hint="completed + rated en el rango"
          icon={Car}
        />
        <KpiCard
          title="En curso"
          value={String(data.trips.in_progress)}
          hint="accepted / en ruta / waiting / in_trip"
          icon={Car}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Bruto (GMV)"
          value={formatArs(data.money.gross_fare)}
          hint="sum total_fare"
          icon={CircleDollarSign}
        />
        <KpiCard
          title="Lifty (fee)"
          value={formatArs(data.money.platform_fee)}
          hint="sum platform_fee"
          icon={Percent}
        />
        <KpiCard
          title="Conductores"
          value={formatArs(data.money.driver_earnings)}
          hint={`Propinas ${formatArs(data.money.tips)}`}
          icon={CircleDollarSign}
        />
        <KpiCard
          title="Ticket promedio"
          value={formatArs(data.money.avg_ticket)}
          icon={CircleDollarSign}
        />
        <KpiCard
          title="Take rate"
          value={formatPctFraction(data.money.take_rate)}
          hint="fee / bruto"
          icon={Percent}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comisión vigente
            </CardTitle>
            <CardDescription>Fase actual del motor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{data.commission.phase}</Badge>
              <span className="text-sm text-muted-foreground">
                Día {data.commission.currentDay}
              </span>
            </div>
            <p className="text-2xl font-semibold text-navy">
              {formatPctFraction(data.commission.rate)}
            </p>
            <Button variant="link" className="h-auto px-0" asChild>
              <Link to="/commission">Ver / editar comisiones</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {emptyTrips ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Sin viajes en el rango seleccionado.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
