import { IdentificationBadge } from '@/components/IdentificationBadge';
import { PushAlertsCard } from '@/components/PushAlertsCard';
import { ReviewBadge } from '@/components/ReviewBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { PendingDriver } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function formatDate(value: string) {
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

function contactLine(row: PendingDriver) {
  return row.phone || row.email || '—';
}

export function PendingQueuePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn: () => apiFetch<PendingDriver[]>('/admin/drivers/pending'),
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-navy sm:text-2xl">
            Cola de revisión
          </h1>
          <p className="text-sm text-muted-foreground">
            Conductores con documentos en review de plataforma (eje A).
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

      <PushAlertsCard />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pendientes</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Cargando…'
              : `${data?.length ?? 0} conductor${(data?.length ?? 0) === 1 ? '' : 'es'} en cola`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full md:h-10" />
              <Skeleton className="h-16 w-full md:h-10" />
              <Skeleton className="h-16 w-full md:h-10" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/30 bg-red-50 p-6 text-center">
              <p className="text-sm text-destructive">
                {(error as Error)?.message ?? 'No se pudo cargar la cola'}
              </p>
              <Button className="mt-3 min-h-11" variant="outline" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          ) : !data?.length ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
              <p className="text-base font-medium text-navy">No hay conductores en review</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Solo aparecen con status=review (docs completos). Si está en Conductores pero no
                acá, todavía falta onboarding o reconciliar status.
              </p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-2 md:hidden">
                {data.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex min-h-14 w-full items-center gap-3 rounded-xl border bg-card px-3 py-3 text-left shadow-sm transition active:bg-muted/60"
                      onClick={() => navigate(`/drivers/${row.id}`)}
                      aria-label={`Ver ficha de ${row.full_name || 'conductor'}`}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="truncate font-semibold text-navy">
                          {row.full_name || 'Sin nombre'}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {contactLine(row)} · {row.documents_submitted} docs
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <ReviewBadge status={row.admin_review_status || row.status} />
                          <IdentificationBadge status={row.identification_status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(row.created_at)}</p>
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
                      <TableHead>Nombre</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Docs</TableHead>
                      <TableHead>KYC</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Identificación</TableHead>
                      <TableHead>Ingreso</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        tabIndex={0}
                        role="link"
                        aria-label={`Ver ficha de ${row.full_name || 'conductor'}`}
                        onClick={() => navigate(`/drivers/${row.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/drivers/${row.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-medium text-navy">
                          {row.full_name || 'Sin nombre'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div>{row.email || '—'}</div>
                          <div>{row.phone || '—'}</div>
                        </TableCell>
                        <TableCell>{row.documents_submitted}</TableCell>
                        <TableCell className="capitalize">{row.kyc_status ?? '—'}</TableCell>
                        <TableCell>
                          <ReviewBadge status={row.admin_review_status || row.status} />
                        </TableCell>
                        <TableCell>
                          <IdentificationBadge status={row.identification_status} />
                        </TableCell>
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
