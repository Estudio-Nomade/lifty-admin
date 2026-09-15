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
  CommissionCurrent,
  CommissionPhase,
  CommissionStartDate,
} from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function pctFromFraction(rate: number | null | undefined) {
  if (rate == null || Number.isNaN(rate)) return '—';
  return `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 2)}%`;
}

function fractionFromPctInput(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(',', '.'));
  if (Number.isNaN(n)) return null;
  return n / 100;
}

function formatMonthRange(start: number, end: number | null) {
  if (end == null) return `Mes ${start}+`;
  if (start === end) return `Mes ${start}`;
  return `Meses ${start}–${end}`;
}

export function CommissionPage() {
  const queryClient = useQueryClient();
  const [startDateDraft, setStartDateDraft] = useState('');
  const [confirmStartDate, setConfirmStartDate] = useState(false);
  const [editPhase, setEditPhase] = useState<CommissionPhase | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    month_start: '',
    month_end: '',
    base_rate_pct: '',
    monthly_increment_pct: '',
    cap_rate_pct: '',
  });

  const currentQ = useQuery({
    queryKey: ['admin', 'commission', 'current'],
    queryFn: () => apiFetch<CommissionCurrent>('/admin/commission/current'),
  });

  const phasesQ = useQuery({
    queryKey: ['admin', 'commission', 'phases'],
    queryFn: () => apiFetch<CommissionPhase[]>('/admin/commission/phases'),
  });

  const startDateQ = useQuery({
    queryKey: ['admin', 'commission', 'start-date'],
    queryFn: () => apiFetch<CommissionStartDate>('/admin/commission/start-date'),
  });

  useEffect(() => {
    if (startDateQ.data?.start_date) {
      setStartDateDraft(startDateQ.data.start_date);
    }
  }, [startDateQ.data?.start_date]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'commission'] });
  };

  const startDateMutation = useMutation({
    mutationFn: (value: string) =>
      apiFetch<CommissionStartDate>('/admin/commission/start-date', {
        method: 'PUT',
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => {
      toast.success('Fecha de inicio actualizada');
      setConfirmStartDate(false);
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la fecha');
    },
  });

  const phaseMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch<CommissionPhase>(`/admin/commission/phases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Fase actualizada');
      setEditPhase(null);
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la fase');
    },
  });

  const openEdit = (phase: CommissionPhase) => {
    setEditPhase(phase);
    setEditForm({
      name: phase.name,
      month_start: String(phase.month_start),
      month_end: phase.month_end == null ? '' : String(phase.month_end),
      base_rate_pct: (phase.base_rate * 100).toFixed(2).replace(/\.?0+$/, ''),
      monthly_increment_pct:
        phase.monthly_increment == null
          ? ''
          : (phase.monthly_increment * 100).toFixed(2).replace(/\.?0+$/, ''),
      cap_rate_pct:
        phase.cap_rate == null ? '' : (phase.cap_rate * 100).toFixed(2).replace(/\.?0+$/, ''),
    });
  };

  const savePhase = () => {
    if (!editPhase) return;
    const base = fractionFromPctInput(editForm.base_rate_pct);
    if (base == null || base < 0 || base > 1) {
      toast.error('Base rate inválido (0–100%)');
      return;
    }
    const body: Record<string, unknown> = {
      name: editForm.name.trim() || editPhase.name,
      month_start: Number.parseInt(editForm.month_start, 10) || editPhase.month_start,
      base_rate: base,
    };
    if (editForm.month_end.trim() === '') {
      body.month_end = null;
    } else {
      body.month_end = Number.parseInt(editForm.month_end, 10);
    }
    if (editForm.monthly_increment_pct.trim() === '') {
      body.monthly_increment = null;
    } else {
      const inc = fractionFromPctInput(editForm.monthly_increment_pct);
      if (inc == null) {
        toast.error('Incremento inválido');
        return;
      }
      body.monthly_increment = inc;
    }
    if (editForm.cap_rate_pct.trim() === '') {
      body.cap_rate = null;
    } else {
      const cap = fractionFromPctInput(editForm.cap_rate_pct);
      if (cap == null) {
        toast.error('Cap inválido');
        return;
      }
      body.cap_rate = cap;
    }
    phaseMutation.mutate({ id: editPhase.id, body });
  };

  const loading = currentQ.isLoading || phasesQ.isLoading || startDateQ.isLoading;
  const allFailed = currentQ.isError && phasesQ.isError && startDateQ.isError;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (allFailed) {
    const msg =
      (currentQ.error instanceof ApiError && currentQ.error.message) ||
      (phasesQ.error instanceof ApiError && phasesQ.error.message) ||
      (startDateQ.error instanceof ApiError && startDateQ.error.message) ||
      'No se pudo cargar comisiones';
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-destructive/30 bg-red-50 p-8 text-center">
        <p className="text-sm text-destructive">{msg}</p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => {
            void currentQ.refetch();
            void phasesQ.refetch();
            void startDateQ.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  const current = currentQ.data;
  const phases = phasesQ.data ?? [];
  const partialErrors = [
    currentQ.isError
      ? `Fase actual: ${currentQ.error instanceof ApiError ? currentQ.error.message : 'error'}`
      : null,
    phasesQ.isError
      ? `Fases: ${phasesQ.error instanceof ApiError ? phasesQ.error.message : 'error'}`
      : null,
    startDateQ.isError
      ? `Fecha inicio: ${startDateQ.error instanceof ApiError ? startDateQ.error.message : 'error'}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Comisiones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La comisión es global para todos los conductores activos según el mes desde la fecha de
          inicio. No hay % por conductor.
        </p>
      </div>

      {partialErrors.length ? (
        <div className="rounded-lg border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
          {partialErrors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}

      {startDateQ.data && startDateQ.data.configured === false ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          La fecha de inicio aún no está guardada en config. Se muestra el default; guardala para
          fijarla en la plataforma.
        </div>
      ) : null}

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="size-4" />
            Fase actual
          </CardTitle>
          <CardDescription>Según fecha de inicio y mes calendario</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-xs text-muted-foreground">Fase</p>
            <p className="text-xl font-semibold text-navy">{current?.phase ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mes N</p>
            <p className="text-xl font-semibold text-navy">{current?.currentMonth ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rate efectivo</p>
            <p className="text-3xl font-bold text-primary">
              {current ? pctFromFraction(current.rate) : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fecha de inicio</CardTitle>
          <CardDescription>
            Define el mes 1 del modelo de fases. Cambiarla recalcula el mes de todas las fases.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="start-date">Inicio (YYYY-MM-DD)</Label>
            <Input
              id="start-date"
              type="date"
              value={startDateDraft}
              onChange={(e) => setStartDateDraft(e.target.value)}
              className="w-48"
            />
          </div>
          <Button
            disabled={
              !startDateDraft ||
              startDateDraft === startDateQ.data?.start_date ||
              startDateMutation.isPending
            }
            onClick={() => setConfirmStartDate(true)}
          >
            Guardar fecha
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fases</CardTitle>
          <CardDescription>
            Rates en % en pantalla; la API recibe fracción 0–1 (ej. 10% → 0.10).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!phases.length ? (
            <p className="text-sm text-muted-foreground">No hay fases configuradas</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Meses</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Incremento/mes</TableHead>
                    <TableHead>Cap</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phases.map((p) => {
                    const isCurrent = current?.phase === p.name;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-navy">
                          <span className="inline-flex items-center gap-2">
                            {p.name}
                            {isCurrent ? <Badge>Actual</Badge> : null}
                          </span>
                        </TableCell>
                        <TableCell>{formatMonthRange(p.month_start, p.month_end)}</TableCell>
                        <TableCell>{pctFromFraction(p.base_rate)}</TableCell>
                        <TableCell>{pctFromFraction(p.monthly_increment)}</TableCell>
                        <TableCell>{pctFromFraction(p.cap_rate)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="size-3.5" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmStartDate} onOpenChange={setConfirmStartDate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cambiar fecha de inicio?</DialogTitle>
            <DialogDescription>
              Se recalcula el mes de todas las fases a partir de {startDateDraft}. El rate efectivo
              puede cambiar de inmediato.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmStartDate(false)}>
              Cancelar
            </Button>
            <Button
              disabled={startDateMutation.isPending}
              onClick={() => startDateMutation.mutate(startDateDraft)}
            >
              {startDateMutation.isPending ? 'Guardando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editPhase != null} onOpenChange={(o) => !o && setEditPhase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar fase</DialogTitle>
            <DialogDescription>
              Ingresá rates en % (ej. 10 = 10%). Se envían a la API como fracción 0–1.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ph-name">Nombre</Label>
              <Input
                id="ph-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ph-ms">Mes inicio</Label>
                <Input
                  id="ph-ms"
                  type="number"
                  min={1}
                  value={editForm.month_start}
                  onChange={(e) => setEditForm((f) => ({ ...f, month_start: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ph-me">Mes fin (vacío = ∞)</Label>
                <Input
                  id="ph-me"
                  type="number"
                  min={1}
                  value={editForm.month_end}
                  onChange={(e) => setEditForm((f) => ({ ...f, month_end: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ph-base">Base %</Label>
                <Input
                  id="ph-base"
                  inputMode="decimal"
                  value={editForm.base_rate_pct}
                  onChange={(e) => setEditForm((f) => ({ ...f, base_rate_pct: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ph-inc">Incr. %/mes</Label>
                <Input
                  id="ph-inc"
                  inputMode="decimal"
                  value={editForm.monthly_increment_pct}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, monthly_increment_pct: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ph-cap">Cap %</Label>
                <Input
                  id="ph-cap"
                  inputMode="decimal"
                  value={editForm.cap_rate_pct}
                  onChange={(e) => setEditForm((f) => ({ ...f, cap_rate_pct: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditPhase(null)}>
              Cancelar
            </Button>
            <Button disabled={phaseMutation.isPending} onClick={savePhase}>
              {phaseMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
