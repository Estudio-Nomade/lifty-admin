/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

registerRoute(
  ({ url }) =>
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api') ||
    url.port === '3001',
  new NetworkOnly(),
);

self.addEventListener('push', (event) => {
  let title = 'Lifty Admin';
  let body = 'Hay una actualización';
  let data: Record<string, string> = { url: '/' };

  try {
    const raw = event.data?.json() as {
      title?: string;
      body?: string;
      data?: Record<string, string>;
    };
    if (raw?.title) title = raw.title;
    if (raw?.body) body = raw.body;
    if (raw?.data) data = { ...data, ...raw.data };
  } catch {
    const text = event.data?.text();
    if (text) body = text;
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data,
      tag: data.driverId ? `driver-${data.driverId}` : 'admin-notify',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data as { url?: string } | undefined)?.url || '/';
  let path = '/';
  try {
    if (rawUrl.startsWith('http')) {
      path = new URL(rawUrl).pathname || '/';
    } else {
      path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    }
  } catch {
    path = '/';
  }

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await (client as WindowClient).navigate(path);
          }
          return;
        }
      }
      await self.clients.openWindow(path);
    })(),
  );
});
