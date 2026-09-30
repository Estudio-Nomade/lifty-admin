import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { type AdminTripDetail, tripStatusLabel } from '@/lib/types';
import { formatArs } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

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

function shortId(id: string | null | undefined) {
  if (!id) return '—';
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'trips', id],
    queryFn: () => apiFetch<AdminTripDetail>(`/admin/trips/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/trips">
            <ArrowLeft className="size-4" />
            Volver a viajes
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/30 bg-red-50 p-6 text-center">
          <p className="text-sm text-destructive">
            {(error as Error)?.message ?? 'Viaje no encontrado'}
          </p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/trips">
            <ArrowLeft className="size-4" />
            Volver a viajes
          </Link>
        </Button>
        <Badge variant="outline">{tripStatusLabel(data.status)}</Badge>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-navy sm:text-2xl">
          Detalle del viaje
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(data.created_at)} · ID {shortId(data.id)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl text-navy">{formatArs(data.total_fare)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lifty</CardDescription>
            <CardTitle className="text-2xl text-navy">{formatArs(data.platform_fee)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conductor</CardDescription>
            <CardTitle className="text-2xl text-navy">{formatArs(data.driver_earnings)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Propina</CardDescription>
            <CardTitle className="text-2xl text-navy">{formatArs(data.tip_amount)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {(data.base_fare != null || data.distance_fare != null || data.time_fare != null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breakdown tarifa</CardTitle>
            <CardDescription>Componentes persistidos en el viaje</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Base</p>
              <p className="font-medium">{formatArs(data.base_fare)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Distancia</p>
              <p className="font-medium">{formatArs(data.distance_fare)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tiempo</p>
              <p className="font-medium">{formatArs(data.time_fare)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ruta y métricas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Origen</p>
            <p>{data.origin_address ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Destino</p>
            <p>{data.dest_address ?? '—'}</p>
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Distancia</p>
              <p>
                {data.distance_km != null ? `${data.distance_km.toFixed(1)} km` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duración</p>
              <p>
                {data.duration_minutes != null
                  ? `${Math.round(data.duration_minutes)} min`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pago</p>
              <p className="capitalize">{data.payment_method ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cobrado</p>
              <p>{data.is_collected ? 'Sí' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Conductor</p>
              <p className="font-medium">{data.driver_name ?? '—'}</p>
              {data.driver_document_number ? (
                <p className="text-xs text-muted-foreground">DNI {data.driver_document_number}</p>
              ) : null}
              {data.district_name ? (
                <p className="text-xs text-muted-foreground">{data.district_name}</p>
              ) : null}
            </div>
            {data.driver_id ? (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to={`/drivers/${data.driver_id}`}>
                  <User className="size-4" />
                  Ver conductor
                </Link>
              </Button>
            ) : null}
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground">Pasajero</p>
            <p className="font-medium">{data.passenger_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">ID {shortId(data.passenger_id)}</p>
          </div>
          <Separator />
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p>Asignado: {formatDate(data.assigned_at)}</p>
            <p>Actualizado: {formatDate(data.updated_at)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
