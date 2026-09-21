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
  TransitOperator,
  TransitOperatorCreateResult,
} from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, KeyRound, MapPinned, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const SLUG: Record<string, string> = {
  'Villa Dolores': 'villadolores',
  'Villa de las Rosas': 'villadelasrosas',
  'Villa Sarmiento': 'villasarmiento',
  'Mina Clavero': 'minaclavero',
  'San Javier': 'sanjavier',
  Nono: 'nono',
  'Las Calles': 'lascalles',
};

function slugify(name: string): string {
  if (SLUG[name]) return SLUG[name];
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function suggestedEmail(districtName: string) {
  return `${slugify(districtName)}@liftyviajes.com`;
}

function randomPassword(len = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
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

export function TransitOperatorsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [districtId, setDistrictId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
    district_name?: string | null;
  } | null>(null);

  const [reassignOp, setReassignOp] = useState<TransitOperator | null>(null);
  const [reassignDistrictId, setReassignDistrictId] = useState('');

  const [resetOp, setResetOp] = useState<TransitOperator | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);

  const operatorsQ = useQuery({
    queryKey: ['admin', 'transit-operators'],
    queryFn: () => apiFetch<{ items: TransitOperator[] }>('/admin/transit-operators'),
  });

  const districtsQ = useQuery({
    queryKey: ['admin', 'districts'],
    queryFn: () => apiFetch<{ items: AdminDistrict[] }>('/admin/districts'),
  });

  const districts = districtsQ.data?.items ?? [];
  const operators = operatorsQ.data?.items ?? [];

  const districtById = useMemo(() => {
    const m = new Map<string, AdminDistrict>();
    for (const d of districts) m.set(d.id, d);
    return m;
  }, [districts]);

  const takenDistricts = useMemo(() => {
    const s = new Set<string>();
    for (const op of operators) {
      if (op.transit_district_id) s.add(op.transit_district_id);
    }
    return s;
  }, [operators]);

  const freeDistricts = useMemo(
    () => districts.filter((d) => !takenDistricts.has(d.id)),
    [districts, takenDistricts],
  );

  useEffect(() => {
    if (!districtId) return;
    const d = districtById.get(districtId);
    if (d) {
      setEmail(suggestedEmail(d.name));
      setFullName(`Tránsito ${d.name}`);
    }
  }, [districtId, districtById]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'transit-operators'] });
  };

  const createMutation = useMutation({
    mutationFn: (body: {
      district_id: string;
      email: string;
      password: string;
      full_name?: string;
    }) =>
      apiFetch<TransitOperatorCreateResult>('/admin/transit-operators', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          email: body.email.trim().toLowerCase(),
          password: body.password.normalize('NFKC').trim(),
        }),
      }),
    onSuccess: (result) => {
      toast.success('Operador creado (pass verificada en Auth)');
      setCreateOpen(false);
      setCredentials({
        email: result.email,
        password: result.password,
        district_name: result.district_name,
      });
      setDistrictId('');
      setEmail('');
      setPassword('');
      setFullName('');
      setShowPass(false);
      invalidate();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo crear el operador');
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ userId, district_id }: { userId: string; district_id: string }) =>
      apiFetch(`/admin/transit-operators/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ district_id }),
      }),
    onSuccess: () => {
      toast.success('Municipio reasignado');
      setReassignOp(null);
      invalidate();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo reasignar');
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ userId, password: pw }: { userId: string; password: string }) =>
      apiFetch<{ email: string; password: string; message?: string }>(
        `/admin/transit-operators/${userId}/password`,
        {
          method: 'POST',
          body: JSON.stringify({ password: pw.normalize('NFKC').trim() }),
        },
      ),
    onSuccess: (result) => {
      toast.success(result.message ?? 'Contraseña actualizada y verificada en Auth');
      setResetOp(null);
      setResetPassword('');
      setCredentials({
        email: result.email ?? '',
        password: result.password,
      });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo resetear');
    },
  });

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const loading = operatorsQ.isLoading || districtsQ.isLoading;
  const error = operatorsQ.isError || districtsQ.isError;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-destructive/30 bg-red-50 p-8 text-center">
        <p className="text-sm text-destructive">No se pudieron cargar operadores de tránsito</p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => {
            void operatorsQ.refetch();
            void districtsQ.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Operadores tránsito</h1>
          <p className="text-sm text-muted-foreground">
            Una cuenta por municipio (email + contraseña). El reset escribe en Supabase Auth wabdd
            y se verifica con login real antes de mostrarte la pass. Guardala al copiarla; no se
            reconsulta después.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-12 md:min-h-9"
            onClick={() => invalidate()}
          >
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
          <Button
            size="sm"
            className="min-h-12 md:min-h-9"
            onClick={() => {
              setCreateOpen(true);
              setPassword(randomPassword());
            }}
            disabled={freeDistricts.length === 0}
          >
            <Plus className="size-4" />
            Nuevo operador
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cuentas activas</CardTitle>
          <CardDescription>
            {operators.length} operador{operators.length === 1 ? '' : 'es'} ·{' '}
            {freeDistricts.length} municipio{freeDistricts.length === 1 ? '' : 's'} sin cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Municipio</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Todavía no hay operadores. Creá el primero.
                  </TableCell>
                </TableRow>
              ) : (
                operators.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">{op.email ?? '—'}</TableCell>
                    <TableCell>{op.full_name ?? '—'}</TableCell>
                    <TableCell>
                      {op.district_name ? (
                        <Badge variant="secondary" className="gap-1">
                          <MapPinned className="size-3" />
                          {op.district_name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sin municipio</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(op.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11 md:min-h-8"
                          onClick={() => {
                            setResetOp(op);
                            setResetPassword(randomPassword());
                            setShowResetPass(false);
                          }}
                        >
                          <KeyRound className="size-4" />
                          Reset pass
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11 md:min-h-8"
                          onClick={() => {
                            setReassignOp(op);
                            setReassignDistrictId(op.transit_district_id ?? '');
                          }}
                        >
                          Cambiar municipio
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo operador de tránsito</DialogTitle>
            <DialogDescription>
              Crea Auth + users.role=transit atado al municipio. La contraseña se muestra una sola
              vez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Municipio</Label>
              <Select value={districtId} onValueChange={setDistrictId}>
                <SelectTrigger className="min-h-12">
                  <SelectValue placeholder="Elegí municipio" />
                </SelectTrigger>
                <SelectContent>
                  {freeDistricts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-email">Email</Label>
              <Input
                id="to-email"
                className="min-h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-pass">Contraseña</Label>
              <div className="flex gap-2">
                <Input
                  id="to-pass"
                  className="min-h-12"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 shrink-0"
                  onClick={() => setShowPass((v) => !v)}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 shrink-0"
                  onClick={() => setPassword(randomPassword())}
                >
                  Generar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-name">Nombre (opcional)</Label>
              <Input
                id="to-name"
                className="min-h-12"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!districtId || !email || password.length < 8 || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  district_id: districtId,
                  email: email.trim(),
                  password,
                  full_name: fullName.trim() || undefined,
                })
              }
            >
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!reassignOp}
        onOpenChange={(open) => {
          if (!open) setReassignOp(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar municipio</DialogTitle>
            <DialogDescription>{reassignOp?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Municipio</Label>
            <Select value={reassignDistrictId} onValueChange={setReassignDistrictId}>
              <SelectTrigger className="min-h-12">
                <SelectValue placeholder="Municipio" />
              </SelectTrigger>
              <SelectContent>
                {districts
                  .filter(
                    (d) =>
                      d.id === reassignOp?.transit_district_id || !takenDistricts.has(d.id),
                  )
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOp(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !reassignOp ||
                !reassignDistrictId ||
                reassignDistrictId === reassignOp.transit_district_id ||
                patchMutation.isPending
              }
              onClick={() =>
                reassignOp &&
                patchMutation.mutate({
                  userId: reassignOp.id,
                  district_id: reassignDistrictId,
                })
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!resetOp}
        onOpenChange={(open) => {
          if (!open) setResetOp(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resetear contraseña</DialogTitle>
            <DialogDescription>
              Actualiza la contraseña en Supabase Auth (wabdd). Se valida con un login real antes
              de confirmar. Guardá la pass: no se vuelve a mostrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nueva contraseña</Label>
            <div className="flex gap-2">
              <Input
                className="min-h-12"
                type={showResetPass ? 'text' : 'password'}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                onClick={() => setShowResetPass((v) => !v)}
              >
                {showResetPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                onClick={() => setResetPassword(randomPassword())}
              >
                Generar
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOp(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!resetOp || resetPassword.length < 8 || resetMutation.isPending}
              onClick={() =>
                resetOp &&
                resetMutation.mutate({ userId: resetOp.id, password: resetPassword })
              }
            >
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!credentials}
        onOpenChange={(open) => {
          if (!open) setCredentials(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardá estas credenciales</DialogTitle>
            <DialogDescription>
              La contraseña no se vuelve a mostrar. Enviála por un canal seguro fuera del panel.
            </DialogDescription>
          </DialogHeader>
          {credentials ? (
            <div className="space-y-3 py-2">
              {credentials.district_name ? (
                <p className="text-sm text-muted-foreground">
                  Municipio: <strong>{credentials.district_name}</strong>
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-mono text-sm">{credentials.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void copyText(credentials.email, 'Email')}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground">Contraseña</p>
                  <p className="font-mono text-sm">{credentials.password}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void copyText(credentials.password, 'Contraseña')}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <Button
                className="w-full min-h-12"
                variant="secondary"
                onClick={() =>
                  void copyText(
                    `${credentials.email}\n${credentials.password}`,
                    'Credenciales',
                  )
                }
              >
                Copiar ambas
              </Button>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
