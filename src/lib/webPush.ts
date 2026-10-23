import { ApiError, apiFetch } from './api';

/** Decode VAPID public key to a detached ArrayBuffer (Chrome/Android rejects bare Uint8Array views). */
function vapidPublicKeyToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  // Fresh slice so the buffer is not a SharedArrayBuffer-backed view.
  const buf = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
  if (buf.byteLength !== 65 || new Uint8Array(buf)[0] !== 0x04) {
    throw new Error('INVALID_VAPID_KEY');
  }
  return buf;
}

function humanizeSubscribeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'VAPID_NOT_CONFIGURED' || err.status === 503) {
      return 'Push no configurado en el servidor (VAPID). Avisá a ops.';
    }
    return err.message || 'Error del servidor al registrar la suscripción';
  }
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const lower = msg.toLowerCase();
  if (lower.includes('invalid_vapid') || lower.includes('applicationServerKey')) {
    return 'Clave VAPID inválida. Probá borrar datos del sitio y reintentar.';
  }
  if (
    lower.includes('push service error') ||
    lower.includes('registration failed') ||
    lower.includes('aborterror')
  ) {
    return 'Error del servicio push. Borrá datos del sitio, verificá HTTPS/PWA y que VAPID en Railway coincida.';
  }
  if (lower.includes('notallowed') || lower.includes('permission')) {
    return 'Permiso bloqueado. Activalo en ajustes del navegador / app.';
  }
  if (msg.trim()) return msg;
  return 'No se pudo activar las alertas push';
}

export type PushUiState = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed';

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Prefer live backend key (avoids bake drift vs Railway); env only as fallback. */
async function getVapidPublicKey(): Promise<string> {
  try {
    const res = await apiFetch<{ publicKey: string }>('/admin/push/vapid-public-key');
    const key = res.publicKey?.trim();
    if (key) return key;
  } catch (err) {
    const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
    if (fromEnv) return fromEnv;
    throw err;
  }
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  if (fromEnv) return fromEnv;
  throw new Error('VAPID public key missing');
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) {
    await new Promise<void>((resolve) => {
      const sw = reg.installing ?? reg.waiting;
      if (!sw) {
        resolve();
        return;
      }
      if (sw.state === 'activated') {
        resolve();
        return;
      }
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') resolve();
      });
    });
  }
  return reg;
}

export async function getPushUiState(): Promise<PushUiState> {
  if (!isPushSupported()) return 'unsupported';
  const perm = Notification.permission;
  if (perm === 'denied') return 'denied';
  if (perm === 'default') return 'default';
  try {
    const reg = await getRegistration();
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'subscribed' : 'granted';
  } catch {
    return 'granted';
  }
}

export async function subscribeAdminWebPush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'Este navegador no soporta notificaciones push' };
  }
  if (!window.isSecureContext) {
    return { ok: false, reason: 'Se necesita HTTPS (o localhost) para activar alertas' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      reason:
        permission === 'denied'
          ? 'Permiso bloqueado. Activalo en ajustes del navegador / app.'
          : 'Permiso no concedido',
    };
  }

  let publicKey: string;
  try {
    publicKey = await getVapidPublicKey();
  } catch (err) {
    return {
      ok: false,
      reason:
        err instanceof ApiError && (err.code === 'VAPID_NOT_CONFIGURED' || err.status === 503)
          ? 'Push no configurado en el servidor (VAPID). Avisá a ops.'
          : 'No se pudo obtener la clave VAPID del servidor',
    };
  }

  let applicationServerKey: ArrayBuffer;
  try {
    applicationServerKey = vapidPublicKeyToArrayBuffer(publicKey);
  } catch {
    return {
      ok: false,
      reason: 'Clave VAPID inválida. Probá borrar datos del sitio y reintentar.',
    };
  }

  const reg = await getRegistration();

  // Stale sub from a previous VAPID pair → drop local before fresh subscribe.
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    try {
      await existing.unsubscribe();
    } catch {
      // continue; subscribe may still work after partial cleanup
    }
  }

  let sub: PushSubscription;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (err) {
    return { ok: false, reason: humanizeSubscribeError(err) };
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    try {
      await sub.unsubscribe();
    } catch {
      // ignore
    }
    return { ok: false, reason: 'Suscripción incompleta' };
  }

  try {
    await apiFetch('/admin/push-subscription', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }),
    });
  } catch (err) {
    try {
      await sub.unsubscribe();
    } catch {
      // local cleanup best-effort
    }
    return { ok: false, reason: humanizeSubscribeError(err) };
  }

  return { ok: true };
}

export async function unsubscribeAdminWebPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    try {
      await apiFetch('/admin/push-subscription', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint }),
      });
    } catch {
      // local unsub is enough if API fails
    }
  }
}
