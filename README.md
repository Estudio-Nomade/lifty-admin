# Lifty Admin (ops)

Panel ops Lifty — **fuera del monorepo** `software-lifty`.

Path: `/home/marti/Documentos/LIfty/apps/admin`  
(hermano de `software-lifty` y `web-transito`)

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + **PWA** (`vite-plugin-pwa`)

## Dev

```bash
cd /home/marti/Documentos/LIfty/apps/admin
cp .env.example .env   # completar VITE_SUPABASE_* y VITE_API_URL
bun install
bun run dev
# → http://127.0.0.1:5174  (host true → también http://<LAN-IP>:5174)
```

Backend monorepo (otra terminal):

```bash
cd /home/marti/Documentos/LIfty/software-lifty
bun run dev:backend   # :3001
```

## Env

| Var | Valor |
|-----|--------|
| `VITE_SUPABASE_URL` | Proyecto **Lifty** `wabddbkwugepkwrgzhpk` |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable Lifty |
| `VITE_API_URL` | `http://127.0.0.1:3001` en desktop local |

**No** uses keys de web-tránsito (`ykchnss…`).

### Celular en la misma Wi‑Fi (trampa conocida)

Con `VITE_API_URL=http://127.0.0.1:3001`, en el **teléfono** `127.0.0.1` es el phone, no la PC → la API falla.

Para smoke real en handset:

```bash
# en apps/admin/.env (o inline)
VITE_API_URL=http://192.168.x.x:3001   # IP LAN de la PC
bun run dev
# o build + preview:
bun run build && bun run preview
```

Abrí `http://<IP-LAN-PC>:5174` en el browser del celular.  
Si CORS bloquea el origin `http://<ip>:5174`, hay que permitir ese origin en el backend monorepo (cambio aparte; no se mezcla con este panel).

## Auth

Login email+password Supabase Lifty. Se exige `users.role === 'admin'`.

## PWA / Mobile

El panel es **mobile-first** e **instalable**:

- Shell: top bar + menú Sheet en phone; sidebar fija en `md+`
- Cola / registry: cards en mobile, tabla en desktop
- PWA: manifest + service worker (precache assets; **NetworkOnly** para API/Supabase)

### Build / preview (para probar SW + install)

```bash
bun run typecheck
bun run build
bun run preview   # http://127.0.0.1:5174
```

En Chrome DevTools → Application: Manifest + Service Workers.

### Instalar en el dispositivo

| Plataforma | Cómo |
|------------|------|
| **Chrome Android** | En `localhost` o HTTPS: menú → “Instalar app” / “Add to Home screen”. En HTTP LAN puro Android a veces limita install; iOS no. |
| **Safari iOS** | Compartir → “Agregar a pantalla de inicio”. Funciona en HTTP LAN. |
| **Desktop Chrome** | icono install en la barra de direcciones (localhost/HTTPS). |

Theme color / status bar: navy `#0f2a44`. Display: `standalone`.

## Scope MVP

- Cola pendientes + ficha + approve/reject
- Registry de conductores + filtros
- Comisiones + precio combustible
- Badge identificación (solo lectura; stickers los marca tránsito vía bridge)
- **No** cablear en `scripts/dev-all.ts` del monorepo
