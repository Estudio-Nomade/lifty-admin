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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AdminDistrict,
  ServiceMarket,
  ServiceMarketCreateBody,
  ServiceMarketPatchBody,
  ServiceMarketStatus,
  ServiceMarketsListResponse,
} from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pause, Pencil, Play, Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const NONE_DISTRICT = '__none__';

const DEFAULTS = {
  pickup_radius_km: 8,
  dropoff_radius_km: 50,
  match_radius_km: 8,
  geo_bias_radius_km: 20,
} as const;

type FormState = {
  name: string;
  province: string;
  slug: string;
  hub_lat: string;
  hub_lng: string;
  pickup_radius_km: string;
  dropoff_radius_km: string;
  match_radius_km: string;
  geo_bias_radius_km: string;
  default_district_id: string;
  aliases: string[];
  aliasDraft: string;
  slugTouched: boolean;
};

function emptyForm(): FormState {
  return {
    name: '',
    province: '',
    slug: '',
    hub_lat: '',
    hub_lng: '',
    pickup_radius_km: String(DEFAULTS.pickup_radius_km),
    dropoff_radius_km: String(DEFAULTS.dropoff_radius_km),
    match_radius_km: String(DEFAULTS.match_radius_km),
    geo_bias_radius_km: String(DEFAULTS.geo_bias_radius_km),
    default_district_id: NONE_DISTRICT,
    aliases: [],
    aliasDraft: '',
    slugTouched: false,
  };
}

function formFromMarket(m: ServiceMarket): FormState {
  return {
    name: m.name,
    province: m.province,
    slug: m.slug,
    hub_lat: String(m.hub_lat),
    hub_lng: String(m.hub_lng),
    pickup_radius_km: String(m.pickup_radius_km),
    dropoff_radius_km: String(m.dropoff_radius_km),
    match_radius_km: String(m.match_radius_km),
    geo_bias_radius_km: String(m.geo_bias_radius_km),
    default_district_id: m.default_district_id ?? NONE_DISTRICT,
    aliases: [...m.aliases],
    aliasDraft: '',
    slugTouched: true,
  };
}

/** NFD strip accents → lower → kebab → max 80 (BE SLUG_RE). */
export function slugifyMarket(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

function parseNum(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

function isValidHub(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function isValidRadius(n: number): boolean {
  return n > 0 && n <= 500;
}

function statusLabel(status: ServiceMarketStatus): string {
  if (status === 'active') return 'Activo';
  if (status === 'paused') return 'Pausado';
  return 'Borrador';
}

function statusBadgeVariant(
  status: ServiceMarketStatus,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'active') return 'default';
  if (status === 'paused') return 'outline';
  return 'secondary';
}

function formatHub(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  const map: Record<string, string> = {
    INVALID_SLUG: 'Slug inválido (kebab-case, sin acentos)',
    INVALID_HUB_COORDS: 'Coordenadas de hub inválidas',
    INVALID_RADIUS: 'Radio inválido (0–500 km)',
    SLUG_TAKEN: 'Ese slug ya está en uso',
    FORBIDDEN: 'Sin permiso de admin',
  };
  return map[err.code] ?? err.message ?? fallback;
}

export function ServiceMarketsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceMarket | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirm, setConfirm] = useState<{
    market: ServiceMarket;
    action: 'activate' | 'pause';
  } | null>(null);

  const marketsQ = useQuery({
    queryKey: ['admin', 'service-markets'],
    queryFn: () => apiFetch<ServiceMarketsListResponse>('/admin/service-markets'),
  });

  const districtsQ = useQuery({
    queryKey: ['admin', 'districts'],
    queryFn: () => apiFetch<{ items: AdminDistrict[] }>('/admin/districts'),
  });

  const markets = marketsQ.data?.items ?? [];
  const districts = districtsQ.data?.items ?? [];

  const districtById = useMemo(() => {
    const m = new Map<string, AdminDistrict>();
    for (const d of districts) m.set(d.id, d);
    return m;
  }, [districts]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'service-markets'] });
  };

  useEffect(() => {
    if (editing || form.slugTouched) return;
    const next = slugifyMarket(form.name);
    setForm((f) => (f.slug === next ? f : { ...f, slug: next }));
  }, [editing, form.name, form.slugTouched]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (m: ServiceMarket) => {
    setEditing(m);
    setForm(formFromMarket(m));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const pushAlias = () => {
    const raw = form.aliasDraft.trim();
    if (!raw) return;
    if (form.aliases.some((a) => a.toLowerCase() === raw.toLowerCase())) {
      setForm((f) => ({ ...f, aliasDraft: '' }));
      return;
    }
    setForm((f) => ({ ...f, aliases: [...f.aliases, raw], aliasDraft: '' }));
  };

  const removeAlias = (alias: string) => {
    setForm((f) => ({ ...f, aliases: f.aliases.filter((a) => a !== alias) }));
  };

  const buildPayload = (): ServiceMarketCreateBody | null => {
    const name = form.name.trim();
    const province = form.province.trim();
    const slug = (editing ? editing.slug : form.slug.trim()) || slugifyMarket(name);
    const hub_lat = parseNum(form.hub_lat);
    const hub_lng = parseNum(form.hub_lng);
    const pickup_radius_km = parseNum(form.pickup_radius_km);
    const dropoff_radius_km = parseNum(form.dropoff_radius_km);
    const match_radius_km = parseNum(form.match_radius_km);
    const geo_bias_radius_km = parseNum(form.geo_bias_radius_km);

    if (name.length < 2) {
      toast.error('Nombre requerido');
      return null;
    }
    if (province.length < 2) {
      toast.error('Provincia requerida');
      return null;
    }
    if (!editing && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      toast.error('Slug inválido (kebab-case)');
      return null;
    }
    if (hub_lat == null || hub_lng == null) {
      toast.error('Hub lat/lng requeridos');
      return null;
    }
    if (!isValidHub(hub_lat, hub_lng)) {
      toast.error('Coordenadas de hub fuera de rango');
      return null;
    }
    if (
      pickup_radius_km == null ||
      dropoff_radius_km == null ||
      match_radius_km == null ||
      geo_bias_radius_km == null ||
      !isValidRadius(pickup_radius_km) ||
      !isValidRadius(dropoff_radius_km) ||
      !isValidRadius(match_radius_km) ||
      !isValidRadius(geo_bias_radius_km)
    ) {
      toast.error('Radios inválidos (0–500 km, > 0)');
      return null;
    }

    const aliases = [...form.aliases];
    const draft = form.aliasDraft.trim();
    if (draft && !aliases.some((a) => a.toLowerCase() === draft.toLowerCase())) {
      aliases.push(draft);
    }

    return {
      slug,
      name,
      province,
      hub_lat,
      hub_lng,
      pickup_radius_km,
      dropoff_radius_km,
      match_radius_km,
      geo_bias_radius_km,
      default_district_id:
        form.default_district_id === NONE_DISTRICT ? null : form.default_district_id,
      aliases,
      ...(editing ? {} : { status: 'draft' as const }),
    };
  };

  const createMutation = useMutation({
    mutationFn: (body: ServiceMarketCreateBody) =>
      apiFetch<ServiceMarket>('/admin/service-markets', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (row) => {
      toast.success(`Mercado «${row.name}» creado (draft)`);
      closeForm();
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo crear el mercado')),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ServiceMarketPatchBody }) =>
      apiFetch<ServiceMarket>(`/admin/service-markets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (row) => {
      toast.success(`Mercado «${row.name}» actualizado`);
      closeForm();
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo guardar')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'pause' }) =>
      apiFetch<ServiceMarket>(`/admin/service-markets/${id}/${action}`, { method: 'POST' }),
    onSuccess: (row, vars) => {
      toast.success(
        vars.action === 'activate'
          ? `«${row.name}» activado`
          : `«${row.name}» pausado`,
      );
      setConfirm(null);
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo cambiar el estado')),
  });

  const submitForm = () => {
    const payload = buildPayload();
    if (!payload) return;
    if (editing) {
      const { slug: _slug, status: _status, ...patch } = payload;
      patchMutation.mutate({ id: editing.id, body: patch });
      return;
    }
    createMutation.mutate(payload);
  };

  const saving = createMutation.isPending || patchMutation.isPending;
  const loading = marketsQ.isLoading;
  const error = marketsQ.isError;
  const districtsError = districtsQ.isError;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    const status = marketsQ.error instanceof ApiError ? marketsQ.error.status : 0;
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-destructive/30 bg-red-50 p-8 text-center">
        <p className="text-sm text-destructive">
          {status === 404
            ? 'API service-markets no disponible (¿BE S1 + migración aplicada?)'
            : 'No se pudieron cargar los mercados'}
        </p>
        <Button className="mt-3 min-h-11" variant="outline" onClick={() => void marketsQ.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">Mercados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ciudades donde opera Lifty (hub geo + radios). No son districts legales.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 gap-2 md:min-h-9"
            onClick={() => invalidate()}
          >
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
          <Button size="sm" className="min-h-11 gap-2 md:min-h-9" onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo mercado
          </Button>
        </div>
      </div>

      {districtsError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No se pudieron cargar districts legales. La lista de mercados sigue disponible; el select
          TyC quedará vacío hasta reintentar.
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mercados operativos</CardTitle>
          <CardDescription>
            {markets.length} mercado{markets.length === 1 ? '' : 's'} · draft no matchea hasta
            activar
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Provincia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead>Pickup / Dropoff</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Todavía no hay mercados. Creá el primero (queda en draft).
                  </TableCell>
                </TableRow>
              ) : (
                markets.map((m) => {
                  const district = m.default_district_id
                    ? districtById.get(m.default_district_id)
                    : null;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.slug}</div>
                        {district ? (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            TyC: {district.name}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{m.province}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(m.status)}>{statusLabel(m.status)}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3 shrink-0" />
                          {formatHub(m.hub_lat, m.hub_lng)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {m.pickup_radius_km} / {m.dropoff_radius_km} km
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11 md:min-h-8"
                            onClick={() => openEdit(m)}
                          >
                            <Pencil className="size-4" />
                            Editar
                          </Button>
                          {m.status !== 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-11 md:min-h-8"
                              onClick={() => setConfirm({ market: m, action: 'activate' })}
                            >
                              <Play className="size-4" />
                              Activar
                            </Button>
                          ) : null}
                          {m.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-11 md:min-h-8"
                              onClick={() => setConfirm({ market: m, action: 'pause' })}
                            >
                              <Pause className="size-4" />
                              Pausar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) closeForm();
          else setFormOpen(true);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar mercado' : 'Nuevo mercado'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Cambiá geo, radios, aliases o district legal. El slug no se edita.'
                : 'Se crea en draft. Activá después de validar coords y TyC.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sm-name">Nombre</Label>
                <Input
                  id="sm-name"
                  className="min-h-11"
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Tandil"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-province">Provincia</Label>
                <Input
                  id="sm-province"
                  className="min-h-11"
                  maxLength={100}
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                  placeholder="Buenos Aires"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sm-slug">Slug</Label>
              <Input
                id="sm-slug"
                className="min-h-11 font-mono text-sm"
                maxLength={80}
                value={editing ? editing.slug : form.slug}
                disabled={!!editing}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    slug: slugifyMarket(e.target.value),
                    slugTouched: true,
                  }))
                }
                placeholder="tandil"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sm-lat">Hub lat</Label>
                <Input
                  id="sm-lat"
                  className="min-h-11"
                  inputMode="decimal"
                  value={form.hub_lat}
                  onChange={(e) => setForm((f) => ({ ...f, hub_lat: e.target.value }))}
                  placeholder="-37.3217"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-lng">Hub lng</Label>
                <Input
                  id="sm-lng"
                  className="min-h-11"
                  inputMode="decimal"
                  value={form.hub_lng}
                  onChange={(e) => setForm((f) => ({ ...f, hub_lng: e.target.value }))}
                  placeholder="-59.1332"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sm-pickup">Pickup km</Label>
                <Input
                  id="sm-pickup"
                  className="min-h-11"
                  inputMode="decimal"
                  value={form.pickup_radius_km}
                  onChange={(e) => setForm((f) => ({ ...f, pickup_radius_km: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-dropoff">Dropoff km</Label>
                <Input
                  id="sm-dropoff"
                  className="min-h-11"
                  inputMode="decimal"
                  value={form.dropoff_radius_km}
                  onChange={(e) => setForm((f) => ({ ...f, dropoff_radius_km: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-match">Match km</Label>
                <Input
                  id="sm-match"
                  className="min-h-11"
                  inputMode="decimal"
                  value={form.match_radius_km}
                  onChange={(e) => setForm((f) => ({ ...f, match_radius_km: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-bias">Geo bias km</Label>
                <Input
                  id="sm-bias"
                  className="min-h-11"
                  inputMode="decimal"
                  value={form.geo_bias_radius_km}
                  onChange={(e) => setForm((f) => ({ ...f, geo_bias_radius_km: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>District legal (opcional)</Label>
              <Select
                value={form.default_district_id}
                onValueChange={(v) => setForm((f) => ({ ...f, default_district_id: v }))}
                disabled={districtsError || districtsQ.isLoading}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue
                    placeholder={
                      districtsError ? 'Districts no disponibles' : 'Sin district'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_DISTRICT}>Sin district</SelectItem>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.province ? ` · ${d.province}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sm-alias">Aliases</Label>
              <div className="flex flex-wrap gap-2">
                {form.aliases.map((a) => (
                  <Badge key={a} variant="secondary" className="gap-1 pr-1">
                    {a}
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-muted"
                      aria-label={`Quitar ${a}`}
                      onClick={() => removeAlias(a)}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="sm-alias"
                  className="min-h-11"
                  value={form.aliasDraft}
                  onChange={(e) => setForm((f) => ({ ...f, aliasDraft: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      pushAlias();
                    }
                  }}
                  placeholder="Agregar alias y Enter"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 shrink-0"
                  onClick={pushAlias}
                >
                  Agregar
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="min-h-11" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button className="min-h-11" onClick={submitForm} disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm != null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm?.action === 'activate' ? '¿Activar mercado?' : '¿Pausar mercado?'}
            </DialogTitle>
            <DialogDescription>
              {confirm?.action === 'activate'
                ? `«${confirm.market.name}» pasará a active: pickup/dropoff/match empezarán a usarlo.${
                    confirm.market.default_district_id
                      ? ''
                      : ' Aviso: sin district legal (TyC) vinculado.'
                  }`
                : `«${confirm?.market.name}» dejará de matchear / aceptar pedidos nuevos en esa zona.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setConfirm(null)}
              disabled={statusMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="min-h-11"
              disabled={statusMutation.isPending || !confirm}
              onClick={() => {
                if (!confirm) return;
                statusMutation.mutate({ id: confirm.market.id, action: confirm.action });
              }}
            >
              {statusMutation.isPending
                ? 'Aplicando…'
                : confirm?.action === 'activate'
                  ? 'Activar'
                  : 'Pausar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
