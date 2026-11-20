'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Calculator,
  CheckCircle2,
  Clock,
  Database,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trophy,
  AlertTriangle,
  Unlink,
} from 'lucide-react'
import {
  getTournamentSyncDashboard,
  markTournamentTransactionPaidAction,
  saveTournamentSchemaAction,
  syncOrRecalculateEventAction,
  unlinkTournamentSchemaAction,
  updateBillingConfigAction,
} from '@/app/actions/tournament-sync'
import { formatARS } from '@/lib/format'
import type {
  ExternalEventoState,
  ExternalEventoSyncRow,
  RoleType,
  SchemaSyncStatusDTO,
  TournamentSyncDashboardDTO,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const EVENT_STATE_BADGE: Record<
  ExternalEventoState,
  { label: string; className: string }
> = {
  ABIERTO: {
    label: 'Inscripciones Abiertas',
    className: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
  },
  CERRADO: {
    label: 'Inscripciones Cerradas',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  },
  JUGANDOSE: {
    label: 'Jugándose',
    className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
  },
  FINALIZADO: {
    label: 'Finalizado',
    className: 'border-zinc-500/40 bg-zinc-500/15 text-zinc-300',
  },
}

interface TournamentsClientProps {
  initialData: TournamentSyncDashboardDTO
  userRole: RoleType
}

export function TournamentsClient({ initialData, userRole }: TournamentsClientProps) {
  const router = useRouter()
  const canEdit = userRole !== 'VIEWER'

  const [data, setData] = useState<TournamentSyncDashboardDTO>(initialData)
  const [priceInput, setPriceInput] = useState<string>(String(initialData.config.pricePerPlayer))
  const [autoSync, setAutoSync] = useState<boolean>(initialData.config.autoSyncOnPlaying)
  const [savingConfig, setSavingConfig] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [schemaFilter, setSchemaFilter] = useState<string>('ALL')
  const [stateFilter, setStateFilter] = useState<string>('ALL')
  const [billingFilter, setBillingFilter] = useState<string>('ALL')

  // Add/Edit Schema Dialog State
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false)
  const [editingSchema, setEditingSchema] = useState<SchemaSyncStatusDTO | null>(null)
  const [schemaMode, setSchemaMode] = useState<'existing' | 'new'>('existing')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [newProjectName, setNewProjectName] = useState<string>('')
  const [newClientName, setNewClientName] = useState<string>('')
  const [schemaNameInput, setSchemaNameInput] = useState<string>('')
  const [customPriceInput, setCustomPriceInput] = useState<string>('')
  const [savingSchema, setSavingSchema] = useState(false)
  const [unlinkingSchema, setUnlinkingSchema] = useState<SchemaSyncStatusDTO | null>(null)

  async function refreshSync(showToast = true) {
    setSyncingAll(true)
    try {
      const fresh = await getTournamentSyncDashboard(true)
      setData(fresh)
      setPriceInput(String(fresh.config.pricePerPlayer))
      setAutoSync(fresh.config.autoSyncOnPlaying)
      router.refresh()
      if (showToast) {
        if (fresh.autoCreatedCount > 0) {
          toast.success(
            `Sincronización completada: se crearon ${fresh.autoCreatedCount} cobro(s) pendiente(s) en ARS.`
          )
        } else {
          toast.success('Schemas sincronizados. Todo está al día.')
        }
      }
    } catch {
      toast.error('Error al sincronizar con los schemas MySQL')
    } finally {
      setSyncingAll(false)
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    const parsedPrice = parseFloat(priceInput)
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Ingresa un monto por jugador válido mayor a 0.')
      return
    }

    setSavingConfig(true)
    try {
      const res = await updateBillingConfigAction({
        pricePerPlayer: parsedPrice,
        autoSyncOnPlaying: autoSync,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Error al guardar configuración')
        setSavingConfig(false)
        return
      }
      toast.success(`Tarifa actualizada a ${formatARS(parsedPrice)} por jugador`)
      await refreshSync(false)
    } catch {
      toast.error('Ocurrió un error al guardar la tarifa')
    } finally {
      setSavingConfig(false)
    }
  }

  async function handleSyncEvent(row: ExternalEventoSyncRow) {
    setBusyKey(row.externalKey)
    try {
      const res = await syncOrRecalculateEventAction({
        projectId: row.projectId,
        eventoId: row.eventoId,
      })
      if (!res.success) {
        toast.error(res.error ?? 'No se pudo procesar el cobro')
        return
      }
      toast.success(
        res.mode === 'updated'
          ? `Cobro recalculado para "${row.nombre}" (${formatARS(row.calculatedAmount)})`
          : `Cobro pendiente generado para "${row.nombre}" (${formatARS(row.calculatedAmount)})`
      )
      await refreshSync(false)
    } catch {
      toast.error('Error procesando el cobro del evento')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleMarkPaid(row: ExternalEventoSyncRow) {
    if (!row.transaction) return
    setBusyKey(row.externalKey)
    try {
      const res = await markTournamentTransactionPaidAction(row.transaction.id)
      if (!res.success) {
        toast.error(res.error ?? 'No se pudo marcar como cobrado')
        return
      }
      toast.success(`"${row.nombre}" marcado como Cobrado`)
      await refreshSync(false)
    } catch {
      toast.error('Error al actualizar estado del cobro')
    } finally {
      setBusyKey(null)
    }
  }

  function openAddSchemaDialog() {
    setEditingSchema(null)
    const unlinked = data.allProjects.find((p) => !p.dbSchema)
    setSchemaMode(unlinked ? 'existing' : 'new')
    setSelectedProjectId(unlinked ? String(unlinked.id) : '')
    setNewProjectName('')
    setNewClientName('')
    setSchemaNameInput('')
    setCustomPriceInput('')
    setSchemaDialogOpen(true)
  }

  function openEditSchemaDialog(s: SchemaSyncStatusDTO) {
    setEditingSchema(s)
    setSchemaMode('existing')
    setSelectedProjectId(String(s.projectId))
    setNewProjectName('')
    setNewClientName('')
    setSchemaNameInput(s.dbSchema)
    setCustomPriceInput(s.customPricePerPlayer !== null ? String(s.customPricePerPlayer) : '')
    setSchemaDialogOpen(true)
  }

  async function handleSaveSchema(e: React.FormEvent) {
    e.preventDefault()

    const parsedCustomPrice = customPriceInput.trim() ? parseFloat(customPriceInput) : null
    if (parsedCustomPrice !== null && (Number.isNaN(parsedCustomPrice) || parsedCustomPrice < 0)) {
      toast.error('Ingresa una tarifa personalizada válida en ARS.')
      return
    }

    setSavingSchema(true)
    try {
      const res = await saveTournamentSchemaAction({
        mode: editingSchema ? 'existing' : schemaMode,
        projectId:
          editingSchema || schemaMode === 'existing'
            ? Number(editingSchema ? editingSchema.projectId : selectedProjectId)
            : undefined,
        projectName: schemaMode === 'new' ? newProjectName : undefined,
        clientName: schemaMode === 'new' ? newClientName.trim() || null : undefined,
        dbSchema: schemaNameInput.trim(),
        customPricePerPlayer: parsedCustomPrice,
      })

      if (!res.success) {
        toast.error(res.error ?? 'Error al guardar el schema')
        setSavingSchema(false)
        return
      }

      toast.success(
        editingSchema
          ? `Schema "${schemaNameInput.trim()}" actualizado`
          : `Schema "${schemaNameInput.trim()}" agregado y vinculado`
      )
      setSchemaDialogOpen(false)
      await refreshSync(false)
    } catch {
      toast.error('Ocurrió un error al guardar el schema')
    } finally {
      setSavingSchema(false)
    }
  }

  async function confirmUnlinkSchema() {
    if (!unlinkingSchema) return
    const res = await unlinkTournamentSchemaAction(unlinkingSchema.projectId)
    if (!res.success) {
      toast.error(res.error ?? 'No se pudo desvincular el schema')
      setUnlinkingSchema(null)
      return
    }
    toast.success(`Schema "${unlinkingSchema.dbSchema}" desvinculado`)
    setUnlinkingSchema(null)
    await refreshSync(false)
  }

  const linkedSchemaSet = new Set(data.schemas.map((s) => s.dbSchema))
  const unlinkedDetectedSchemas = data.detectedMySQLSchemas.filter(
    (name) => !linkedSchemaSet.has(name)
  )

  const filteredEvents = data.events.filter((ev) => {
    if (schemaFilter !== 'ALL' && ev.dbSchema !== schemaFilter) return false
    if (stateFilter !== 'ALL' && ev.state !== stateFilter) return false
    if (billingFilter === 'PENDING' && ev.transaction?.status !== 'PENDING') return false
    if (billingFilter === 'PAID' && ev.transaction?.status !== 'PAID') return false
    if (billingFilter === 'UNSYNCED' && ev.transaction !== null) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (
        !ev.nombre.toLowerCase().includes(q) &&
        !ev.projectName.toLowerCase().includes(q) &&
        !ev.dbSchema.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <Trophy className="h-7 w-7 text-primary" />
            Cobros de Torneos (Multi-Schema)
          </h1>
          <p className="text-sm text-muted-foreground">
            Lectura directa en MySQL de los eventos en producción. Al pasar a{' '}
            <strong className="text-foreground">Jugándose</strong> se genera automáticamente la entrada como{' '}
            <strong className="text-amber-400">Pendiente</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button variant="outline" onClick={openAddSchemaDialog}>
              <Plus className="mr-1.5 h-4 w-4" />
              Agregar Schema
            </Button>
          )}
          <Button onClick={() => refreshSync(true)} disabled={syncingAll}>
            {syncingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar Schemas Ahora
          </Button>
        </div>
      </div>

      {/* Configuración de Tarifa Global */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Regla de Liquidación por Jugador Inscripto
          </CardTitle>
          <CardDescription>
            Fórmula aplicada: <span className="font-mono text-foreground">Parejas Activas × 2 = Personas Inscriptas × Tarifa (ARS)</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="price-per-player">Monto por Persona Inscripta (ARS $)</Label>
              <div className="relative">
                <Calculator className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price-per-player"
                  type="number"
                  step="0.01"
                  min="1"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="pl-9 font-mono"
                  disabled={!canEdit || savingConfig}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 px-4 py-2.5">
              <Switch
                id="auto-sync-switch"
                checked={autoSync}
                onCheckedChange={setAutoSync}
                disabled={!canEdit || savingConfig}
              />
              <div>
                <Label htmlFor="auto-sync-switch" className="cursor-pointer text-sm">
                  Auto-cargar al pasar a &ldquo;Jugándose&rdquo;
                </Label>
                <p className="text-xs text-muted-foreground">
                  Crea la entrada pendiente automáticamente al abrir el dashboard o vía cron.
                </p>
              </div>
            </div>

            {canEdit && (
              <Button type="submit" variant="secondary" disabled={savingConfig}>
                {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Tarifa
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Estado de los 4 Schemas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.schemas.map((s) => (
          <Card key={s.projectId} className="border-border/60 bg-card/70">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{s.projectName}</CardTitle>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <Database className="h-3 w-3 text-primary" />
                    schema: <span className="text-foreground">{s.dbSchema}</span>
                  </p>
                </div>
                {s.availableInMySQL ? (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30" variant="outline">
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px] text-amber-400">
                    No local
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {s.availableInMySQL ? (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Eventos detectados:</span>
                    <span className="font-mono text-foreground">
                      {s.totalEventos} ({s.playingOrFinishedEventos} jug./fin.)
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tarifa por persona:</span>
                    <span className="font-mono text-foreground">
                      {formatARS(s.effectivePricePerPlayer)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border/50 pt-2">
                    <span className="text-muted-foreground">Pendiente:</span>
                    <span className="font-mono font-semibold text-amber-400">
                      {formatARS(s.pendingAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cobrado:</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {formatARS(s.paidAmount)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {s.error ?? 'Schema no disponible en esta instancia MySQL.'}
                </p>
              )}

              {canEdit && (
                <div className="flex items-center justify-end gap-1 border-t border-border/50 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => openEditSchemaDialog(s)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Configurar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setUnlinkingSchema(s)}
                  >
                    <Unlink className="mr-1 h-3 w-3" />
                    Desvincular
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros y Tabla de Liquidación */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-base">
            Bandeja de Eventos y Liquidación ({filteredEvents.length})
          </CardTitle>
          <CardDescription>
            Revisa las parejas inscriptas de cada evento, recálcula si hubo bajas/altas de último momento o marca el cobro como pagado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar evento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={schemaFilter} onValueChange={setSchemaFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Proyecto / Schema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los Schemas</SelectItem>
                {data.schemas.map((s) => (
                  <SelectItem key={s.dbSchema} value={s.dbSchema}>
                    {s.projectName} ({s.dbSchema})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado Evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los Estados</SelectItem>
                <SelectItem value="JUGANDOSE">Jugándose</SelectItem>
                <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                <SelectItem value="ABIERTO">Inscripciones Abiertas</SelectItem>
                <SelectItem value="CERRADO">Inscripciones Cerradas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={billingFilter} onValueChange={setBillingFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado Cobro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los Cobros</SelectItem>
                <SelectItem value="PENDING">Pendientes en Dashboard</SelectItem>
                <SelectItem value="PAID">Cobrados</SelectItem>
                <SelectItem value="UNSYNCED">Sin Cargar Aún</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay eventos para mostrar con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto / Schema</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Estado Evento</TableHead>
                    <TableHead>Inscriptos</TableHead>
                    <TableHead className="text-right">Cálculo Actual (ARS)</TableHead>
                    <TableHead>Estado Dashboard</TableHead>
                    {canEdit && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((ev) => {
                    const stateMeta = EVENT_STATE_BADGE[ev.state]
                    const isBusy = busyKey === ev.externalKey
                    const hasDrift =
                      ev.transaction &&
                      ev.transaction.status === 'PENDING' &&
                      (ev.transaction.amount !== ev.calculatedAmount ||
                        ev.transaction.playersCount !== ev.personasInscriptas)

                    return (
                      <TableRow key={ev.externalKey}>
                        <TableCell>
                          <Link
                            href={`/dashboard/projects/${ev.projectId}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {ev.projectName}
                          </Link>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {ev.dbSchema} · #{ev.eventoId}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-foreground">{ev.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {ev.inicio || '-'} → {ev.fin || '-'} · {ev.torneosCount} cat.
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={stateMeta.className}>
                            {stateMeta.label}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="font-mono text-xs text-foreground">
                            {ev.parejasInscriptas} parejas →{' '}
                            <span className="font-semibold text-primary">
                              {ev.personasInscriptas} pers.
                            </span>
                          </div>
                          {ev.parejasSuplentes > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              (+{ev.parejasSuplentes} supl. excluidas)
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-right">
                          <div className="font-mono font-semibold text-foreground">
                            {formatARS(ev.calculatedAmount)}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            × {formatARS(ev.appliedPricePerPlayer)}/pers.
                          </div>
                        </TableCell>

                        <TableCell>
                          {ev.transaction ? (
                            <div className="space-y-1">
                              {ev.transaction.status === 'PAID' ? (
                                <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/30" variant="outline">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Cobrado ({formatARS(ev.transaction.amount)})
                                </Badge>
                              ) : ev.transaction.status === 'PENDING' ? (
                                <Badge className="gap-1 bg-amber-500/15 text-amber-400 border-amber-500/30" variant="outline">
                                  <Clock className="h-3 w-3" />
                                  Pendiente ({formatARS(ev.transaction.amount)})
                                </Badge>
                              ) : (
                                <Badge variant="destructive">Anulado</Badge>
                              )}

                              {hasDrift && (
                                <div className="flex items-center gap-1 text-[11px] text-amber-400">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  Diferencia con inscriptos/tarifa actual
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {ev.state === 'ABIERTO' || ev.state === 'CERRADO'
                                ? 'Esperando inicio ("Jugándose")'
                                : ev.parejasInscriptas === 0
                                  ? 'Sin parejas inscriptas'
                                  : 'Pendiente de sincronizar'}
                            </span>
                          )}
                        </TableCell>

                        {canEdit && (
                          <TableCell className="whitespace-nowrap text-right">
                            <div className="flex justify-end gap-1.5">
                              {ev.transaction?.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-400 hover:bg-emerald-500/20"
                                    disabled={isBusy}
                                    onClick={() => handleMarkPaid(ev)}
                                  >
                                    {isBusy ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      'Marcar Cobrado'
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={hasDrift ? 'secondary' : 'ghost'}
                                    className="h-8 text-xs"
                                    disabled={isBusy}
                                    onClick={() => handleSyncEvent(ev)}
                                    title="Recalcular monto con parejas y tarifa actuales"
                                  >
                                    Recalcular
                                  </Button>
                                </>
                              )}

                              {!ev.transaction && ev.parejasInscriptas > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  disabled={isBusy}
                                  onClick={() => handleSyncEvent(ev)}
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : ev.state === 'JUGANDOSE' || ev.state === 'FINALIZADO' ? (
                                    'Cargar Pendiente'
                                  ) : (
                                    'Adelantar Cobro'
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Agregar / Editar Schema MySQL */}
      <Dialog open={schemaDialogOpen} onOpenChange={setSchemaDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingSchema ? `Configurar Schema "${editingSchema.projectName}"` : 'Agregar Schema de Torneos'}
            </DialogTitle>
            <DialogDescription>
              Vincula una base de datos MySQL del mismo servidor para detectar eventos y liquidar cobros por jugador inscripto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSchema} className="space-y-4">
            {!editingSchema && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSchemaMode('existing')}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    schemaMode === 'existing'
                      ? 'border-primary/60 bg-primary/15 text-primary'
                      : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Proyecto Existente
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaMode('new')}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    schemaMode === 'new'
                      ? 'border-primary/60 bg-primary/15 text-primary'
                      : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Crear Nuevo Proyecto
                </button>
              </div>
            )}

            {editingSchema ? (
              <div className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-sm">
                Proyecto: <strong className="text-foreground">{editingSchema.projectName}</strong>
              </div>
            ) : schemaMode === 'existing' ? (
              <div className="space-y-2">
                <Label htmlFor="schema-proj-select">Proyecto del Dashboard</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="schema-proj-select" className="w-full">
                    <SelectValue placeholder="Selecciona un proyecto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {data.allProjects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} {p.dbSchema ? `(actual: ${p.dbSchema})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="schema-new-proj">Nombre del Proyecto</Label>
                  <Input
                    id="schema-new-proj"
                    placeholder="Ej: Nuevo Club Padel"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schema-new-client">Cliente (opcional)</Label>
                  <Input
                    id="schema-new-client"
                    placeholder="Ej: Club Deportivo"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="schema-db-name">Nombre exacto del Schema MySQL</Label>
              <Input
                id="schema-db-name"
                placeholder="Ej: padel, encuentro, lapista, byb..."
                value={schemaNameInput}
                onChange={(e) => setSchemaNameInput(e.target.value)}
                className="font-mono"
                required
              />
              {unlinkedDetectedSchemas.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Schemas compatibles detectados en este MySQL:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {unlinkedDetectedSchemas.map((detected) => (
                      <button
                        key={detected}
                        type="button"
                        onClick={() => setSchemaNameInput(detected)}
                        className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/20"
                      >
                        + {detected}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schema-custom-price">
                Tarifa personalizada por persona ARS (opcional)
              </Label>
              <Input
                id="schema-custom-price"
                type="number"
                step="0.01"
                min="0"
                placeholder={`Usa tarifa global (${formatARS(data.config.pricePerPlayer)}) si queda vacío`}
                value={customPriceInput}
                onChange={(e) => setCustomPriceInput(e.target.value)}
                className="font-mono"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSchemaDialogOpen(false)}
                disabled={savingSchema}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingSchema}>
                {savingSchema && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSchema ? 'Guardar Cambios' : 'Vincular Schema'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Desvincular Schema */}
      <AlertDialog
        open={Boolean(unlinkingSchema)}
        onOpenChange={(o) => !o && setUnlinkingSchema(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desvincular schema?</AlertDialogTitle>
            <AlertDialogDescription>
              El proyecto <strong>{unlinkingSchema?.projectName}</strong> dejará de leer el schema{' '}
              <strong className="font-mono">{unlinkingSchema?.dbSchema}</strong>. Los cobros ya cargados en el dashboard se conservarán intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnlinkSchema}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
