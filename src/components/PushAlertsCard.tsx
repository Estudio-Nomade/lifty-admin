import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getPushUiState,
  isPushSupported,
  subscribeAdminWebPush,
  unsubscribeAdminWebPush,
  type PushUiState,
} from '@/lib/webPush';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export function PushAlertsCard() {
  const [state, setState] = useState<PushUiState>('default');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setState('unsupported');
      return;
    }
    setState(await getPushUiState());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === 'unsupported') {
    return null;
  }

  async function onEnable() {
    setBusy(true);
    try {
      const result = await subscribeAdminWebPush();
      if (result.ok) {
        toast.success('Alertas activadas');
        setState('subscribed');
      } else {
        toast.error(result.reason);
        await refresh();
      }
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo activar');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setBusy(true);
    try {
      await unsubscribeAdminWebPush();
      toast.message('Alertas desactivadas');
      await refresh();
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo desactivar');
    } finally {
      setBusy(false);
    }
  }

  const subscribed = state === 'subscribed';
  const denied = state === 'denied';

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {subscribed ? (
            <BellRing className="size-5 text-primary" aria-hidden />
          ) : denied ? (
            <BellOff className="size-5 text-muted-foreground" aria-hidden />
          ) : (
            <Bell className="size-5 text-navy" aria-hidden />
          )}
          Alertas en el celular
        </CardTitle>
        <CardDescription>
          {subscribed
            ? 'Vas a recibir un aviso cuando un conductor entre a review.'
            : denied
              ? 'Permiso bloqueado. En Android: ajustes del sitio → Notificaciones → Permitir. En iOS: agregá la app al inicio e instalá de nuevo el permiso.'
              : 'Activá notificaciones push (PWA) para no mirar la cola todo el tiempo. El mail sigue andando.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {subscribed ? (
          <>
            <p className="flex-1 text-sm font-medium text-primary">Activadas</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full sm:w-auto"
              disabled={busy}
              onClick={() => void onDisable()}
            >
              Desactivar
            </Button>
          </>
        ) : denied ? (
          <p className="text-sm text-muted-foreground">Bloqueadas en el navegador</p>
        ) : (
          <Button
            type="button"
            className="min-h-12 w-full text-base sm:w-auto sm:min-w-48"
            disabled={busy}
            onClick={() => void onEnable()}
          >
            Activar alertas
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
