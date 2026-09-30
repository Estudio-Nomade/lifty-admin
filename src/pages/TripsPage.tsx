import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { type AdminTripsListResponse, tripStatusLabel } from '@/lib/types';
import { formatArs } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, RefreshCw, Route, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completados' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'cancelled', label: 'Cancelados' },
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function shortRoute(origin: string | null, dest: string | null) {
  const o = origin?.trim() || '—';
  const d = dest?.trim() || '—';
  const clip = (s: string) => (s.length > 28 ? `${s.slice(0, 28)}…` : s);
  return `${clip(o)} → ${clip(d)}`;
}

export function TripsPage() {
  const navigate = useNavigate();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('completed');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    if (status === 'completed') {
      // default API = completed+rated; omit status
    } else if (status) {
      params.set('status', status);
    }
    if (q.trim()) params.set('q', q.trim());
    if (from) params.set('from', `${from}T00:00:00.000Z`);
    if (to) params.set('to', `${to}T23:59:59.999Z`);
    return `?${params.toString()}`;
  }, [q, status, from, to, offset]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'trips', status, q, from, to, offset],
    queryFn: () => apiFetch<AdminTripsListResponse>(`/admin/trips${queryString}`),
  });

  const applySearch = () => {
    setOffset(0);
    setQ(qInput.trim());
  };

  const onFilterChange = (fn: () => void) => {
    setOffset(0);
    fn();
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-navy sm:text-2xl">Viajes</h1>
          <p className="text-sm text-muted-foreground">
            Listado global de la plataforma · solo lectura · split desde la fila del viaje
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="min-h-11 gap-2"
        >
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="size-4" />
            Filtros
          </CardTitle>
          <CardDescription>
            Por defecto: completados y calificados (GMV). En curso no suma dinero.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <div className="relative w-full flex-1 md:min-w-[220px]">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="min-h-11 pl-8 text-base md:text-sm"
                placeholder="Conductor, pasajero, dirección o ID"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applySearch();
                  }
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => onFilterChange(() => setStatus(v))}
            >
              <SelectTrigger className="min-h-11 w-full md:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="min-h-11 w-full md:w-[160px]"
              value={from}
              onChange={(e) => onFilterChange(() => setFrom(e.target.value))}
              aria-label="Desde"
            />
            <Input
              type="date"
              className="min-h-11 w-full md:w-[160px]"
              value={to}
              onChange={(e) => onFilterChange(() => setTo(e.target.value))}
              aria-label="Hasta"
            />
            <Button type="button" className="min-h-11 w-full md:w-auto" onClick={applySearch}>
              Buscar
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/30 bg-red-50 p-6 text-center">
              <p className="text-sm text-destructive">
                {(error as Error)?.message ?? 'No se pudieron cargar los viajes'}
              </p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          ) : data ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">Viajes</p>
                  <p className="font-semibold text-navy">{data.totals_in_filter.trip_count}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">Bruto</p>
                  <p className="font-semibold text-navy">
                    {formatArs(data.totals_in_filter.gross_fare)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">Lifty</p>
                  <p className="font-semibold text-navy">
                    {formatArs(data.totals_in_filter.platform_fee)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">Conductores</p>
                  <p className="font-semibold text-navy">
                    {formatArs(data.totals_in_filter.driver_earnings)}
                  </p>
                </div>
              </div>

              {!data.items.length ? (
                <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Sin viajes para estos filtros.
                </p>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Conductor</TableHead>
                          <TableHead>Pasajero</TableHead>
                          <TableHead>Ruta</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Lifty</TableHead>
                          <TableHead className="text-right">Conductor $</TableHead>
                          <TableHead>Pago</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items.map((t) => (
                          <TableRow
                            key={t.id}
                            className="cursor-pointer"
                            onClick={() => navigate(`/trips/${t.id}`)}
                          >
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatDate(t.created_at)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{tripStatusLabel(t.status)}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {t.driver_id ? (
                                <Link
                                  to={`/drivers/${t.driver_id}`}
                                  className="text-navy underline-offset-2 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {t.driver_name ?? 'Sin nombre'}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {t.passenger_name ?? '—'}
                            </TableCell>
                            <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                              {shortRoute(t.origin_address, t.dest_address)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatArs(t.total_fare)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatArs(t.platform_fee)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-navy">
                              {formatArs(t.driver_earnings)}
                            </TableCell>
                            <TableCell className="text-xs capitalize">
                              {t.payment_method ?? '—'}
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <ul className="space-y-3 md:hidden">
                    {data.items.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg border bg-muted/20 px-3 py-3 text-left text-sm"
                          onClick={() => navigate(`/trips/${t.id}`)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(t.created_at)}
                            </p>
                            <Badge variant="outline">{tripStatusLabel(t.status)}</Badge>
                          </div>
                          <p className="mt-1 font-medium text-navy">
                            {t.driver_name ?? 'Sin conductor'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.passenger_name ?? 'Sin pasajero'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {shortRoute(t.origin_address, t.dest_address)}
                          </p>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Total</p>
                              <p className="font-medium">{formatArs(t.total_fare)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Lifty</p>
                              <p className="font-medium">{formatArs(t.platform_fee)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Conductor</p>
                              <p className="font-medium text-navy">
                                {formatArs(t.driver_earnings)}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {offset + 1}–{Math.min(offset + data.items.length, data.total)} de{' '}
                      {data.total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={offset === 0 || isFetching}
                        onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                      >
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={offset + data.items.length >= data.total || isFetching}
                        onClick={() => setOffset((o) => o + PAGE_SIZE)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
