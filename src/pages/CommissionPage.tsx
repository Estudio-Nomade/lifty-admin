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

function formatDayRange(start: number, end: number | null) {
  if (end == null) return `Día ${start}+`;
  if (start === end) return `Día ${start}`;
  return `Días ${start}–${end}`;
}

export function CommissionPage() {
  const queryClient = useQueryClient();
  const [startDateDraft, setStartDateDraft] = useState('');
  const [confirmStartDate, setConfirmStartDate] = useState(false);
  const [editPhase, setEditPhase] = useState<CommissionPhase | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    day_start: '',
    day_end: '',
    base_rate_pct: '',
    daily_increment_pct: '',
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
    onSuccess: (data) => {
      toast.success('Fecha de inicio actualizada');
      setConfirmStartDate(false);
      // Keep draft + cache in sync so banner/configured clear without a full reload race.
      setStartDateDraft(data.start_date);
      queryClient.setQueryData<CommissionStartDate>(['admin', 'commission', 'start-date'], {
        start_date: data.start_date,
        configured: data.configured ?? true,
      });
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
      day_start: String(phase.day_start),
      day_end: phase.day_end == null ? '' : String(phase.day_end),
      base_rate_pct: (phase.base_rate * 100).toFixed(2).replace(/\.?0+$/, ''),
      daily_increment_pct:
        phase.daily_increment == null
          ? ''
          : (phase.daily_increment * 100).toFixed(4).replace(/\.?0+$/, ''),
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
    const dayStart = Number.parseInt(editForm.day_start, 10);
    if (!Number.isFinite(dayStart) || dayStart < 1) {
      toast.error('Día inicio inválido (≥ 1)');
      return;
    }
    const body: Record<string, unknown> = {
      name: editForm.name.trim() || editPhase.name,
      day_start: dayStart,
      base_rate: base,
    };
    if (editForm.day_end.trim() === '') {
      body.day_end = null;
    } else {
      const dayEnd = Number.parseInt(editForm.day_end, 10);
      if (!Number.isFinite(dayEnd) || dayEnd < dayStart) {
        toast.error('Día fin debe ser ≥ día inicio (o vacío = ∞)');
        return;
      }
      body.day_end = dayEnd;
    }
    if (editForm.daily_increment_pct.trim() === '') {
      body.daily_increment = null;
    } else {
      const inc = fractionFromPctInput(editForm.daily_increment_pct);
      if (inc == null) {
        toast.error('Incremento inválido');
        return;
      }
      body.daily_increment = inc;
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

  // Allow save when API only returned the default (configured=false) even if the draft equals
  // that default — otherwise "Guardar fecha" stays forever disabled and ops cannot pin launch.
  const sameStartDateAsLoaded =
    Boolean(startDateDraft) && startDateDraft === startDateQ.data?.start_date;
  const startDateNeedsPersist = startDateQ.data?.configured === false;
  const canSaveStartDate =
    Boolean(startDateDraft) &&
    (!sameStartDateAsLoaded || startDateNeedsPersist) &&
    !startDateMutation.isPending;

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
          La comisión es global para todos los conductores activos según el día desde la fecha de
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
          La fecha de inicio aún no está guardada en config. Se muestra el default; usá{' '}
          <strong>Guardar fecha</strong> para fijarla en la plataforma (aunque dejes el mismo
          default).
        </div>
      ) : null}

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="size-4" />
            Fase actual
          </CardTitle>
          <CardDescription>Según fecha de inicio y días transcurridos</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-xs text-muted-foreground">Fase</p>
            <p className="text-xl font-semibold text-navy">{current?.phase ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Día N</p>
            <p className="text-xl font-semibold text-navy">{current?.currentDay ?? '—'}</p>
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
            Define el día 1 del modelo de fases. Cambiarla recalcula el día actual y la fase
            efectiva.
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
            type="button"
            disabled={!canSaveStartDate}
            title={
              !startDateDraft
                ? 'Elegí una fecha'
                : sameStartDateAsLoaded && !startDateNeedsPersist
                  ? 'No hay cambios respecto a la fecha guardada'
                  : startDateNeedsPersist && sameStartDateAsLoaded
                    ? 'Fijar el default en la plataforma'
                    : 'Guardar fecha de inicio'
            }
            onClick={() => setConfirmStartDate(true)}
          >
            {startDateMutation.isPending ? 'Guardando…' : 'Guardar fecha'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fases</CardTitle>
          <CardDescription>
            Rangos en días desde la fecha de inicio. Rates en % en pantalla; la API recibe fracción
            0–1 (ej. 10% → 0.10).
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
                    <TableHead>Días</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Incremento/día</TableHead>
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
                        <TableCell>{formatDayRange(p.day_start, p.day_end)}</TableCell>
                        <TableCell>{pctFromFraction(p.base_rate)}</TableCell>
                        <TableCell>{pctFromFraction(p.daily_increment)}</TableCell>
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
              Se recalcula el día de todas las fases a partir de {startDateDraft}. El rate efectivo
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
              Ingresá rates en % (ej. 10 = 10%). Se envían a la API como fracción 0–1. Día fin vacío
              = abierto (∞).
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
                <Label htmlFor="ph-ds">Día inicio</Label>
                <Input
                  id="ph-ds"
                  type="number"
                  min={1}
                  value={editForm.day_start}
                  onChange={(e) => setEditForm((f) => ({ ...f, day_start: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ph-de">Día fin (vacío = ∞)</Label>
                <Input
                  id="ph-de"
                  type="number"
                  min={1}
                  value={editForm.day_end}
                  onChange={(e) => setEditForm((f) => ({ ...f, day_end: e.target.value }))}
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
                <Label htmlFor="ph-inc">Incr. %/día</Label>
                <Input
                  id="ph-inc"
                  inputMode="decimal"
                  value={editForm.daily_increment_pct}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, daily_increment_pct: e.target.value }))
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
