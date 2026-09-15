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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type {
  FuelPriceHistoryItem,
  FuelPriceSetResult,
  FuelPriceStatus,
} from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fuel, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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

function formatArs(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export function FuelPricePage() {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [forcePrompt, setForcePrompt] = useState<{
    warning: string;
    payload: { price: number; source?: string; notes?: string };
  } | null>(null);

  const statusQ = useQuery({
    queryKey: ['admin', 'fuel-price', 'status'],
    queryFn: () => apiFetch<FuelPriceStatus>('/admin/fuel-price/status'),
  });

  const historyQ = useQuery({
    queryKey: ['admin', 'fuel-price', 'history'],
    queryFn: () => apiFetch<FuelPriceHistoryItem[]>('/admin/fuel-price/history'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'fuel-price'] });
  };

  const setMutation = useMutation({
    mutationFn: (body: {
      price: number;
      source?: string;
      notes?: string;
      force?: boolean;
    }) =>
      apiFetch<FuelPriceSetResult>('/admin/fuel-price', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (result, vars) => {
      if (!result.applied) {
        setForcePrompt({
          warning: result.warning ?? 'El cambio supera el umbral del 25%.',
          payload: {
            price: vars.price,
            source: vars.source,
            notes: vars.notes,
          },
        });
        return;
      }
      toast.success(`Precio actualizado a ${formatArs(vars.price)}`);
      setForcePrompt(null);
      setPrice('');
      setSource('');
      setNotes('');
      invalidate();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cargar el precio');
    },
  });

  const submit = (force = false) => {
    const n = Number.parseFloat(price.replace(',', '.'));
    if (Number.isNaN(n) || n <= 0) {
      toast.error('Ingresá un precio válido en ARS/L');
      return;
    }
    setMutation.mutate({
      price: n,
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
      force,
    });
  };

  const loading = statusQ.isLoading || historyQ.isLoading;
  const error = statusQ.isError || historyQ.isError;
  const status = statusQ.data;
  const history = historyQ.data ?? [];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-destructive/30 bg-red-50 p-8 text-center">
        <p className="text-sm text-destructive">No se pudo cargar combustible</p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => {
            void statusQ.refetch();
            void historyQ.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">
            Combustible / Tarifas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Este precio indexa las tarifas de viaje (auto/moto). No edita comisión.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            void statusQ.refetch();
            void historyQ.refetch();
          }}
        >
          <RefreshCw className="size-4" />
          Actualizar
        </Button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        El precio de nafta de referencia reindexa mínima, base, $/km y $/min. No hay editor manual
        de cada tramo en este panel.
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Fuel className="size-4" />
            Precio actual
          </CardTitle>
          <CardDescription>ARS por litro de referencia</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-xs text-muted-foreground">Precio</p>
            <p className="text-3xl font-bold text-primary">
              {status ? formatArs(status.currentPrice) : '—'}
              <span className="ml-1 text-base font-medium text-muted-foreground">/ L</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Última actualización</p>
            <p className="text-sm font-medium text-navy">{formatDate(status?.lastUpdatedAt)}</p>
          </div>
          <div>
            {status?.isStale ? (
              <Badge variant="destructive">Stale — conviene actualizar</Badge>
            ) : (
              <Badge variant="secondary">Al día</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cargar nuevo precio</CardTitle>
          <CardDescription>
            Rango esperado ~$500–$6000. Si el cambio es &gt;25% pedimos confirmación (force).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="fuel-price">Precio ARS/L</Label>
              <Input
                id="fuel-price"
                inputMode="decimal"
                placeholder="ej. 2100"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fuel-source">Fuente</Label>
              <Input
                id="fuel-source"
                placeholder="ej. YPF / surtidor"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="fuel-notes">Notas</Label>
              <Input
                id="fuel-notes"
                placeholder="Opcional"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <Button disabled={setMutation.isPending || !price.trim()} onClick={() => submit(false)}>
            {setMutation.isPending ? 'Guardando…' : 'Guardar precio'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial</CardTitle>
          <CardDescription>Últimas cargas (máx. 100)</CardDescription>
        </CardHeader>
        <CardContent>
          {!history.length ? (
            <p className="text-sm text-muted-foreground">Sin cargas todavía</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Quién</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row, i) => (
                    <TableRow key={row.id ?? `${row.created_at}-${i}`}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(row.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{formatArs(row.price)}</TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                        {row.updated_by || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{row.source || '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {row.notes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={forcePrompt != null} onOpenChange={(o) => !o && setForcePrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Forzar cambio de precio?</DialogTitle>
            <DialogDescription>{forcePrompt?.warning}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setForcePrompt(null)}>
              Cancelar
            </Button>
            <Button
              disabled={setMutation.isPending}
              onClick={() => {
                if (!forcePrompt) return;
                setMutation.mutate({ ...forcePrompt.payload, force: true });
              }}
            >
              {setMutation.isPending ? 'Guardando…' : 'Confirmar igual'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
