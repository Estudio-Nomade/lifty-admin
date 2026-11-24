import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import type { CommissionRateFlat, LiftyPayoutAccount } from '@/lib/types';
import { formatArs } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function CommissionPage() {
  const queryClient = useQueryClient();
  const [ratePctDraft, setRatePctDraft] = useState('');
  const [payoutForm, setPayoutForm] = useState({
    alias: '',
    cvu: '',
    holder: '',
    bank: '',
  });

  const rateQ = useQuery({
    queryKey: ['admin', 'commission', 'rate'],
    queryFn: () => apiFetch<CommissionRateFlat>('/admin/commission/rate'),
  });

  const payoutQ = useQuery({
    queryKey: ['admin', 'commission', 'payout-account'],
    queryFn: () => apiFetch<LiftyPayoutAccount>('/admin/commission/payout-account'),
  });

  useEffect(() => {
    if (rateQ.data != null && Number.isFinite(rateQ.data.rate_pct)) {
      setRatePctDraft(String(rateQ.data.rate_pct));
    }
  }, [rateQ.data]);

  useEffect(() => {
    if (!payoutQ.data) return;
    setPayoutForm({
      alias: payoutQ.data.alias ?? '',
      cvu: payoutQ.data.cvu ?? '',
      holder: payoutQ.data.holder ?? '',
      bank: payoutQ.data.bank ?? '',
    });
  }, [payoutQ.data]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'commission'] });
  };

  const rateMutation = useMutation({
    mutationFn: (rate_pct: number) =>
      apiFetch<CommissionRateFlat & { changed?: boolean }>('/admin/commission/rate', {
        method: 'PUT',
        body: JSON.stringify({ rate_pct }),
      }),
    onSuccess: (data) => {
      toast.success(
        data.changed === false
          ? `Comisión sin cambios (${data.rate_pct}%)`
          : `Comisión actualizada a ${data.rate_pct}% (conductores notificados)`,
      );
      queryClient.setQueryData(['admin', 'commission', 'rate'], data);
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la comisión');
    },
  });

  const payoutMutation = useMutation({
    mutationFn: (body: { alias: string; cvu: string; holder: string; bank: string }) =>
      apiFetch<LiftyPayoutAccount>('/admin/commission/payout-account', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      toast.success('Cuenta de cobro actualizada');
      queryClient.setQueryData(['admin', 'commission', 'payout-account'], data);
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la cuenta');
    },
  });

  const saveRate = () => {
    const n = Number.parseFloat(ratePctDraft.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 30) {
      toast.error('Comisión inválida (0–30%)');
      return;
    }
    rateMutation.mutate(n);
  };

  const loading = rateQ.isLoading;
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (rateQ.isError) {
    const msg =
      (rateQ.error instanceof ApiError && rateQ.error.message) || 'No se pudo cargar comisiones';
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-destructive/30 bg-red-50 p-8 text-center">
        <p className="text-sm text-destructive">{msg}</p>
        <Button className="mt-3" variant="outline" onClick={() => void rateQ.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const rate = rateQ.data;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Comisiones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un solo % global de Lifty sobre cada viaje nuevo. No cambia la tarifa al pasajero. Default
          launch <strong className="font-medium text-foreground">0%</strong>; subir a 5% cuando ops
          lo indique.
        </p>
        <div className="mt-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/commission/receipts">Ver comprobantes de comisión</Link>
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="size-4" />
            Comisión vigente
          </CardTitle>
          <CardDescription>
            Aplica de inmediato a viajes nuevos. Al guardar un valor distinto se notifica a
            conductores aprobados (push + Mensajes).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Actual</p>
            <p className="text-3xl font-bold text-primary">
              {rate != null && Number.isFinite(rate.rate_pct) ? `${rate.rate_pct}%` : '—'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate-pct">Nueva comisión (%)</Label>
            <Input
              id="rate-pct"
              className="w-32"
              inputMode="decimal"
              value={ratePctDraft}
              onChange={(e) => setRatePctDraft(e.target.value)}
              placeholder="0"
            />
          </div>
          <Button disabled={rateMutation.isPending} onClick={saveRate}>
            {rateMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cuenta cobro Lifty</CardTitle>
          <CardDescription>
            Alias/CVU que ven los conductores al saldar deuda de comisión.
            {payoutQ.data?.debt_cap_ars != null
              ? ` Tope de deuda online: ${formatArs(payoutQ.data.debt_cap_ars)}.`
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {payoutQ.isError ? (
            <p className="text-sm text-destructive">
              {payoutQ.error instanceof ApiError
                ? payoutQ.error.message
                : 'No se pudo cargar la cuenta de cobro'}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="payout-alias">Alias</Label>
                <Input
                  id="payout-alias"
                  value={payoutForm.alias}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, alias: e.target.value }))}
                  placeholder="lifty.cobros"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payout-cvu">CVU</Label>
                <Input
                  id="payout-cvu"
                  value={payoutForm.cvu}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, cvu: e.target.value }))}
                  placeholder="0000003100010000000001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payout-holder">Titular</Label>
                <Input
                  id="payout-holder"
                  value={payoutForm.holder}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, holder: e.target.value }))}
                  placeholder="Lifty Viajes SA"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payout-bank">Banco</Label>
                <Input
                  id="payout-bank"
                  value={payoutForm.bank}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, bank: e.target.value }))}
                  placeholder="Banco Galicia"
                />
              </div>
            </div>
          )}
          <Button
            disabled={payoutMutation.isPending || payoutQ.isError}
            onClick={() =>
              payoutMutation.mutate({
                alias: payoutForm.alias,
                cvu: payoutForm.cvu,
                holder: payoutForm.holder,
                bank: payoutForm.bank,
              })
            }
          >
            {payoutMutation.isPending ? 'Guardando…' : 'Guardar cuenta'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
