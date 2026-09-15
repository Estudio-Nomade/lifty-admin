import { IdentificationBadge } from '@/components/IdentificationBadge';
import { ReviewBadge } from '@/components/ReviewBadge';
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api';
import {
  DOC_TYPES,
  docLabel,
  type DriverDetail,
  type DriverDocument,
  type ReviewResult,
} from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, FileText, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

function looksLikeImage(url: string) {
  return /\.(png|jpe?g|webp|gif|bmp|avif)(\?|$)/i.test(url) || /\/image\//i.test(url);
}

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

function vehicleTypeLabel(type: string | null | undefined) {
  if (!type) return null;
  const map: Record<string, string> = {
    car: 'Auto',
    moto: 'Moto',
    motorcycle: 'Moto',
  };
  return map[type] ?? type;
}

function DocPreview({
  doc,
  onOpen,
}: {
  doc: DriverDocument;
  onOpen: (doc: DriverDocument) => void;
}) {
  const [broken, setBroken] = useState(false);
  const tryImage = looksLikeImage(doc.file_url) && !broken;

  return (
    <button
      type="button"
      className="flex aspect-video w-full items-center justify-center bg-muted transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onOpen(doc)}
      aria-label={`Ver ${docLabel(doc.doc_type)}`}
    >
      {tryImage ? (
        <img
          src={doc.file_url}
          alt={docLabel(doc.doc_type)}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <FileText className="size-10" />
          <span className="text-xs">Click para abrir</span>
        </div>
      )}
    </button>
  );
}

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DriverDocument | null>(null);
  const [showSuperseded, setShowSuperseded] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'driver', id],
    enabled: !!id,
    queryFn: () => apiFetch<DriverDetail>(`/admin/drivers/${id}`),
  });

  const reviewMutation = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      apiFetch<ReviewResult>(`/admin/drivers/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      }),
    onSuccess: (result) => {
      toast.success(
        result.action === 'approve'
          ? 'Conductor aprobado. Puede conectarse; debe retirar logos/stickers en 30 días o se suspende la cuenta.'
          : 'Conductor rechazado.',
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'pending'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'driver', id] });
      setConfirmAction(null);
      if (result.action === 'approve' || result.action === 'reject') {
        navigate('/');
      }
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo completar la acción';
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-destructive/30 bg-red-50 p-8 text-center">
        <p className="text-sm text-destructive">
          {(error as Error)?.message ?? 'No se encontró el conductor'}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Volver</Link>
          </Button>
          <Button onClick={() => void refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  const canReview = data.admin_review_status === 'pending';
  const activeDocs = data.documents.filter((d) => d.status !== 'superseded');
  const supersededDocs = data.documents.filter((d) => d.status === 'superseded');
  const visibleDocs = showSuperseded ? data.documents : activeDocs;

  const presentTypes = new Set(activeDocs.map((d) => d.doc_type));
  const missingTypes = DOC_TYPES.filter((t) => !presentTypes.has(t));
  const presentRequired = DOC_TYPES.filter((t) => presentTypes.has(t));

  const districtDisplay = data.district_name
    ? data.district_province
      ? `${data.district_name}, ${data.district_province}`
      : data.district_name
    : data.district_id
      ? data.district_id.slice(0, 8)
      : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-24 sm:gap-6 md:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 gap-1 px-0 text-muted-foreground"
            asChild
          >
            <Link to="/drivers">
              <ArrowLeft className="size-4" />
              Volver a conductores
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight text-navy sm:text-2xl">
            {data.full_name || 'Sin nombre'}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            ID / DNI:{' '}
            <span className="font-semibold text-navy">
              {data.registry_id ||
                data.document_number ||
                (data.document_number_last4 ? `****${data.document_number_last4}` : data.id.slice(0, 8))}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <ReviewBadge status={data.admin_review_status} />
            <IdentificationBadge
              status={data.identification_status}
              phase={data.identification_phase}
            />
          </div>
        </div>
        {canReview ? (
          <div className="hidden w-full flex-wrap gap-2 sm:flex sm:w-auto">
            <Button
              variant="destructive"
              className="min-h-11 flex-1 sm:flex-none"
              onClick={() => setConfirmAction('reject')}
              disabled={reviewMutation.isPending}
            >
              Rechazar
            </Button>
            <Button
              className="min-h-11 flex-1 sm:flex-none"
              onClick={() => setConfirmAction('approve')}
              disabled={reviewMutation.isPending}
            >
              Aprobar
            </Button>
          </div>
        ) : null}
      </div>

      {canReview ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-card/95 p-3 backdrop-blur supports-backdrop-filter:bg-card/80 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
          <Button
            variant="destructive"
            className="min-h-12 flex-1"
            onClick={() => setConfirmAction('reject')}
            disabled={reviewMutation.isPending}
          >
            Rechazar
          </Button>
          <Button
            className="min-h-12 flex-1"
            onClick={() => setConfirmAction('approve')}
            disabled={reviewMutation.isPending}
          >
            Aprobar
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Email" value={data.email} />
            <Row label="Teléfono" value={data.phone} />
            <Row label="Nombre completo" value={data.full_name} />
            <Row label="Alta" value={formatDate(data.created_at)} />
            <Row label="Distrito" value={districtDisplay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identidad / KYC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="KYC" value={data.kyc_status} />
            <Row label="Nombre verificado" value={data.verified_name} />
            <Row
              label="DNI / documento"
              value={
                data.document_number ||
                (data.document_number_last4 ? `••••${data.document_number_last4}` : null)
              }
            />
            <Row label="Review notes" value={data.admin_review_notes} />
            <Row label="Revisado" value={formatDate(data.admin_reviewed_at)} />
            <Row label="Aprobado plataforma" value={formatDate(data.approved_at)} />
            <Row label="Identificación emitida" value={formatDate(data.identification_issued_at)} />
            <Row label="Ref. tránsito" value={data.identification_external_ref} />
            <Row
              label="Fase stickers"
              value={
                data.identification_phase
                  ? `${data.identification_phase}${
                      data.identification_days_until_pause != null &&
                      data.identification_status === 'pending_pickup'
                        ? ` · quedan ${data.identification_days_until_pause}d para suspensión`
                        : ''
                    }`
                  : null
              }
            />
            <Row
              label="Suspensión stickers"
              value={
                data.identification_blocks_online
                  ? 'Bloquea online (suspendida o revocada)'
                  : 'No bloquea online'
              }
            />
            <Row
              label="Fecha límite stickers"
              value={formatDate(data.identification_pause_at)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehículos</CardTitle>
          <CardDescription>{data.vehicles.length} registrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {!data.vehicles.length ? (
            <p className="text-sm text-muted-foreground">Sin vehículo</p>
          ) : (
            <ul className="space-y-3">
              {data.vehicles.map((v) => (
                <li
                  key={v.id}
                  className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-navy"
                >
                  <div className="font-medium">
                    {[v.brand, v.model, v.year].filter(Boolean).join(' ') || 'Vehículo'}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    {v.plate ? <span>Patente: {v.plate}</span> : null}
                    {v.color ? <span>Color: {v.color}</span> : null}
                    {v.vehicle_type ? (
                      <span>Tipo: {vehicleTypeLabel(v.vehicle_type)}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist de documentos</CardTitle>
          <CardDescription>
            {presentRequired.length}/{DOC_TYPES.length} requeridos presentes
            {missingTypes.length ? ` · faltan ${missingTypes.length}` : ' · completo'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {DOC_TYPES.map((t) => {
              const ok = presentTypes.has(t);
              return (
                <li key={t} className="flex items-center gap-2 text-sm">
                  {ok ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" />
                  )}
                  <span className={ok ? 'text-navy' : 'text-muted-foreground'}>{docLabel(t)}</span>
                  {!ok ? (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      Falta
                    </Badge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Documentos</CardTitle>
            <CardDescription>
              {activeDocs.length} activo(s)
              {supersededDocs.length ? ` · ${supersededDocs.length} supersedido(s)` : ''}
            </CardDescription>
          </div>
          {supersededDocs.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSuperseded((s) => !s)}
            >
              {showSuperseded ? 'Ocultar supersedidos' : 'Ver supersedidos'}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {!visibleDocs.length ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
              <Circle className="size-4" />
              No hay documentos subidos
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
                >
                  <DocPreview doc={doc} onOpen={setPreviewDoc} />
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-navy">{docLabel(doc.doc_type)}</p>
                      <ReviewBadge
                        status={doc.status === 'pending_review' ? 'pending' : doc.status}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Subido: {formatDate(doc.created_at)}
                    </p>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Abrir en pestaña <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canReview ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas de revisión</CardTitle>
            <CardDescription>Opcional en approve; recomendadas al rechazar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones para el conductor u ops…"
              rows={4}
              maxLength={500}
            />
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={confirmAction != null} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'approve' ? '¿Aprobar conductor?' : '¿Rechazar conductor?'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'approve'
                ? 'Se aprueba la review de plataforma. El conductor puede conectarse y tiene 30 días para retirar logos/stickers en tránsito. Si se pasa ese plazo, la cuenta se suspende hasta que tránsito confirme la entrega.'
                : 'Se rechazan los documentos pendientes. El conductor deberá volver a subir papeles.'}
            </DialogDescription>
          </DialogHeader>
          <Separator />
          {notes.trim() ? (
            <p className="text-sm text-muted-foreground">
              Notas: <span className="text-foreground">{notes.trim()}</span>
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmAction === 'reject' ? 'destructive' : 'default'}
              disabled={reviewMutation.isPending}
              onClick={() => {
                if (confirmAction) reviewMutation.mutate(confirmAction);
              }}
            >
              {reviewMutation.isPending
                ? 'Guardando…'
                : confirmAction === 'approve'
                  ? 'Confirmar aprobación'
                  : 'Confirmar rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDoc != null} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewDoc ? docLabel(previewDoc.doc_type) : 'Documento'}</DialogTitle>
            <DialogDescription>
              {previewDoc ? `Subido: ${formatDate(previewDoc.created_at)}` : null}
            </DialogDescription>
          </DialogHeader>
          {previewDoc ? (
            <div className="space-y-3">
              <div className="flex max-h-[70vh] max-w-full items-center justify-center overflow-auto rounded-lg bg-muted">
                <DocLightboxBody url={previewDoc.file_url} alt={docLabel(previewDoc.doc_type)} />
              </div>
              <a
                href={previewDoc.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Abrir en pestaña <ExternalLink className="size-3.5" />
              </a>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocLightboxBody({ url, alt }: { url: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  const tryImage = looksLikeImage(url) && !broken;

  if (tryImage) {
    return (
      <img
        src={url}
        alt={alt}
        className="max-h-[70vh] w-auto max-w-full object-contain"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-10 text-muted-foreground">
      <FileText className="size-16" />
      <p className="text-sm">No se pudo previsualizar. Abrí el archivo en otra pestaña.</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-navy">{value || '—'}</span>
    </div>
  );
}
