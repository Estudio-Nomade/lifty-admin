import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, apiFetch } from '@/lib/api';
import {
  commissionReceiptStatusLabel,
  type CommissionReceiptListItem,
  type CommissionReceiptsResponse,
  type CommissionReceiptStatus,
} from '@/lib/types';
import { cn, formatArs } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type StatusFilter = CommissionReceiptStatus | 'all';

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'pending_review', label: 'Pendientes' },
  { value: 'all', label: 'Todos' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected_fraud', label: 'Fraude' },
];

const PAGE_SIZE = 50;

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ReceiptStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === 'pending_review' && 'border-sky-300 bg-sky-50 text-sky-900',
        status === 'approved' && 'border-emerald-300 bg-emerald-50 text-emerald-900',
        status === 'rejected_fraud' && 'border-red-300 bg-red-50 text-red-900',
      )}
    >
      {commissionReceiptStatusLabel(status)}
    </Badge>
  );
}

export function CommissionReceiptsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('pending_review');
  const [offset, setOffset] = useState(0);
  const [fraudTarget, setFraudTarget] = useState<CommissionReceiptListItem | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('status', status);
    p.set('limit', String(PAGE_SIZE));
    p.set('offset', String(offset));
    return `?${p}`;
  }, [status, offset]);

  const listQ = useQuery({
    queryKey: ['admin', 'commission', 'receipts', status, offset],
    queryFn: () => apiFetch<CommissionReceiptsResponse>(`/admin/commission/receipts${qs}`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'commission', 'receipts'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'driver'] });
  };

  const approveM = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/commission/receipts/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Comprobante aprobado');
      invalidate();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo aprobar');
    },
  });

  const fraudM = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/commission/receipts/${id}/reject-fraud`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      toast.success('Marcado como fraude — deuda restaurada y conductor bloqueado');
      setFraudTarget(null);
      invalidate();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo marcar fraude');
    },
  });

  const items = listQ.data?.items ?? [];
  const total = listQ.data?.total ?? 0;
  const busy = approveM.isPending || fraudM.isPending;

  if (listQ.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (listQ.isError) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-destructive/30 bg-red-50 p-8 text-center">
        <p className="text-sm text-destructive">
          {listQ.error instanceof ApiError
            ? listQ.error.message
            : 'No se pudieron cargar los comprobantes'}
        </p>
        <Button className="mt-3" variant="outline" onClick={() => void listQ.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">
            Comprobantes de comisión
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisá transferencias de deuda. Aprobar confía el pago (quita bloqueo fraude). Fraude
            restaura la deuda y bloquea online.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/commission">Cuenta cobro / fases</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={listQ.isFetching}
            onClick={() => void listQ.refetch()}
          >
            <RefreshCw className={cn('size-3.5', listQ.isFetching && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((c) => (
          <Button
            key={c.value}
            size="sm"
            variant={status === c.value ? 'default' : 'outline'}
            onClick={() => {
              setOffset(0);
              setStatus(c.value);
            }}
          >
            {c.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cola</CardTitle>
          <CardDescription>
            {total} comprobante{total === 1 ? '' : 's'}
            {status === 'pending_review' ? ' pendiente(s)' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!items.length ? (
            <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No hay comprobantes en este filtro.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Deuda previa</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Archivo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDate(r.created_at)}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/drivers/${r.driver_id}`}
                            className="font-medium text-navy hover:underline"
                          >
                            {r.driver_name || r.driver_email || r.driver_id.slice(0, 8)}
                          </Link>
                          {r.driver_email ? (
                            <p className="text-xs text-muted-foreground">{r.driver_email}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatArs(r.amount_ars)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatArs(r.debt_before_ars)}
                        </TableCell>
                        <TableCell>
                          <ReceiptStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell>
                          <a
                            href={r.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Ver <ExternalLink className="size-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === 'pending_review' ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => approveM.mutate(r.id)}
                              >
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => setFraudTarget(r)}
                              >
                                Fraude
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {items.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/drivers/${r.driver_id}`}
                          className="font-medium text-navy hover:underline"
                        >
                          {r.driver_name || r.driver_email || 'Conductor'}
                        </Link>
                        <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                      </div>
                      <ReceiptStatusBadge status={r.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Monto</p>
                        <p className="font-medium">{formatArs(r.amount_ars)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Deuda previa</p>
                        <p className="font-medium">{formatArs(r.debt_before_ars)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={r.file_url} target="_blank" rel="noreferrer">
                          Ver archivo
                        </a>
                      </Button>
                      {r.status === 'pending_review' ? (
                        <>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => approveM.mutate(r.id)}
                          >
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            onClick={() => setFraudTarget(r)}
                          >
                            Fraude
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {total > PAGE_SIZE ? (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  >
                    Anterior
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + PAGE_SIZE >= total}
                    onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  >
                    Siguiente
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={fraudTarget != null} onOpenChange={(o) => !o && setFraudTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Marcar como fraude?</DialogTitle>
            <DialogDescription>
              Se suma la deuda previa del comprobante (
              <strong>{fraudTarget ? formatArs(fraudTarget.debt_before_ars) : '—'}</strong>) al saldo
              actual del conductor, se bloquea online por fraude y el comprobante queda rechazado. El
              conductor no podrá conectarse hasta que apruebes un comprobante nuevo o quites el
              bloqueo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFraudTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={fraudM.isPending || !fraudTarget}
              onClick={() => fraudTarget && fraudM.mutate(fraudTarget.id)}
            >
              {fraudM.isPending ? 'Procesando…' : 'Confirmar fraude'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
