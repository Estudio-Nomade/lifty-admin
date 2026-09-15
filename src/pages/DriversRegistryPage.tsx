import { IdentificationBadge } from '@/components/IdentificationBadge';
import { ReviewBadge } from '@/components/ReviewBadge';
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
import type { DriversListResponse, RegistryDriver } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, RefreshCw, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function vehicleTypeLabel(type: string | null | undefined) {
  if (!type) return null;
  const map: Record<string, string> = {
    car: 'Auto',
    auto: 'Auto',
    moto: 'Moto',
    motorcycle: 'Moto',
  };
  return map[type] ?? type;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'review', label: 'En review' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'step1', label: 'Onboarding' },
];

const ID_OPTIONS = [
  { value: 'all', label: 'Todas las identificaciones' },
  { value: 'pending_pickup', label: 'Pendiente retiro logo' },
  { value: 'issued', label: 'Logo emitido' },
  { value: 'revoked', label: 'Revocada' },
];

function onlineLabel(row: RegistryDriver) {
  if (row.is_online) {
    return (
      <Badge className="border-emerald-300 bg-emerald-50 text-emerald-900" variant="outline">
        Online
      </Badge>
    );
  }
  if (row.identification_blocks_online) {
    return (
      <Badge className="border-red-300 bg-red-50 text-red-900" variant="outline">
        Suspendida
      </Badge>
    );
  }
  return <span className="text-sm text-muted-foreground">Offline</span>;
}

export function DriversRegistryPage() {
  const navigate = useNavigate();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [identification, setIdentification] = useState('all');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status !== 'all') params.set('status', status);
    if (identification !== 'all') params.set('identification_status', identification);
    params.set('limit', '100');
    const s = params.toString();
    return s ? `?${s}` : '';
  }, [q, status, identification]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'drivers', queryString],
    queryFn: () => apiFetch<DriversListResponse>(`/admin/drivers${queryString}`),
  });

  const applySearch = () => setQ(qInput.trim());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-navy sm:text-2xl">
            Conductores
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro de todos los conductores. ID operativo = DNI / documento.
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
            <Users className="size-4" />
            Registrados
          </CardTitle>
          <CardDescription>
            {isLoading
              ? 'Cargando…'
              : `${data?.total ?? 0} conductor${(data?.total ?? 0) === 1 ? '' : 'es'} · mostrando ${data?.items.length ?? 0}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <div className="relative w-full flex-1 md:min-w-[220px]">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="min-h-11 pl-8 text-base md:text-sm"
                placeholder="Buscar por DNI, nombre, teléfono o email"
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
            <Select value={status} onValueChange={setStatus}>
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
            <Select value={identification} onValueChange={setIdentification}>
              <SelectTrigger className="min-h-11 w-full md:w-[210px]">
                <SelectValue placeholder="Identificación" />
              </SelectTrigger>
              <SelectContent>
                {ID_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" className="min-h-11 w-full md:w-auto" onClick={applySearch}>
              Buscar
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full md:h-10" />
              <Skeleton className="h-16 w-full md:h-10" />
              <Skeleton className="h-16 w-full md:h-10" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/30 bg-red-50 p-6 text-center">
              <p className="text-sm text-destructive">
                {(error as Error)?.message ?? 'No se pudo cargar el registro'}
              </p>
              <Button className="mt-3 min-h-11" variant="outline" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          ) : !data?.items.length ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
              <p className="text-base font-medium text-navy">No hay conductores con ese filtro</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Probá limpiar la búsqueda o el estado.
              </p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-2 md:hidden">
                {data.items.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex min-h-14 w-full items-center gap-3 rounded-xl border bg-card px-3 py-3 text-left shadow-sm transition active:bg-muted/60"
                      onClick={() => navigate(`/drivers/${row.id}`)}
                      aria-label={`Ver ficha de ${row.full_name || row.registry_id}`}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-mono text-sm font-semibold text-navy">
                            {row.registry_id}
                          </span>
                          <span className="truncate font-medium text-navy">
                            {row.full_name || row.verified_name || 'Sin nombre'}
                          </span>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {row.phone || row.email || '—'}
                          {row.district_name ? ` · ${row.district_name}` : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ReviewBadge status={row.admin_review_status || row.status} />
                          <IdentificationBadge
                            status={row.identification_status}
                            phase={row.identification_phase}
                          />
                          {onlineLabel(row)}
                        </div>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID (DNI)</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Municipio</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Logos / stickers</TableHead>
                      <TableHead>Online</TableHead>
                      <TableHead>Alta</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        tabIndex={0}
                        role="link"
                        aria-label={`Ver ficha de ${row.full_name || row.registry_id}`}
                        onClick={() => navigate(`/drivers/${row.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/drivers/${row.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-mono text-sm font-semibold text-navy">
                          {row.registry_id}
                        </TableCell>
                        <TableCell className="font-medium text-navy">
                          <div>{row.full_name || row.verified_name || 'Sin nombre'}</div>
                          {row.verified_name && row.verified_name !== row.full_name ? (
                            <div className="text-xs text-muted-foreground">{row.verified_name}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div>{row.phone || '—'}</div>
                          <div className="max-w-[180px] truncate">{row.email || '—'}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.district_name || '—'}
                          {row.district_province ? (
                            <div className="text-xs text-muted-foreground">
                              {row.district_province}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{row.plate || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {vehicleTypeLabel(row.vehicle_type) || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ReviewBadge status={row.admin_review_status || row.status} />
                        </TableCell>
                        <TableCell>
                          <IdentificationBadge
                            status={row.identification_status}
                            phase={row.identification_phase}
                          />
                        </TableCell>
                        <TableCell>{onlineLabel(row)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(row.created_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <ChevronRight className="size-4" aria-hidden />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
