'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  FolderKanban,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import {
  deleteTransaction,
  getTransactions,
  type TransactionFilters,
} from '@/app/actions/transactions'
import { formatARS, formatDate } from '@/lib/format'
import type {
  CategoryDTO,
  ProjectDTO,
  RoleType,
  TransactionDTO,
  TransactionTypeValue,
} from '@/lib/types'
import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_STATUS_LABELS,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { TransactionDialog } from '@/components/dashboard/transaction-dialog'

interface TransactionsClientProps {
  initialTransactions: TransactionDTO[]
  initialSummary: {
    totalIncome: number
    totalExpense: number
    netBalance: number
    count: number
  }
  projects: ProjectDTO[]
  categories: CategoryDTO[]
  userRole: RoleType
}

export function TransactionsClient({
  initialTransactions,
  initialSummary,
  projects,
  categories,
  userRole,
}: TransactionsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const canEdit = userRole !== 'VIEWER'

  const [transactions, setTransactions] = useState<TransactionDTO[]>(initialTransactions)
  const [summary, setSummary] = useState(initialSummary)

  // Filters state
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [scopeFilter, setScopeFilter] = useState<string>('ALL') // 'ALL' | 'GLOBAL' | 'PROJECT' | 'project:<id>'
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'CANCELLED'>('ALL')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Modal & Delete state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDefaultType, setDialogDefaultType] = useState<TransactionTypeValue>('EXPENSE')
  const [editingTx, setEditingTx] = useState<TransactionDTO | null>(null)
  const [deletingTx, setDeletingTx] = useState<TransactionDTO | null>(null)

  function buildFilterPayload(overrides?: Partial<{
    typeFilter: 'ALL' | 'INCOME' | 'EXPENSE'
    scopeFilter: string
    categoryFilter: string
    statusFilter: 'ALL' | 'PAID' | 'PENDING' | 'CANCELLED'
    search: string
    dateFrom: string
    dateTo: string
  }>): TransactionFilters {
    const t = overrides?.typeFilter ?? typeFilter
    const s = overrides?.scopeFilter ?? scopeFilter
    const c = overrides?.categoryFilter ?? categoryFilter
    const st = overrides?.statusFilter ?? statusFilter
    const q = overrides?.search ?? search
    const df = overrides?.dateFrom ?? dateFrom
    const dt = overrides?.dateTo ?? dateTo

    const payload: TransactionFilters = {
      type: t,
      status: st,
      search: q || undefined,
      dateFrom: df || undefined,
      dateTo: dt || undefined,
    }

    if (s === 'GLOBAL') {
      payload.scope = 'GLOBAL'
    } else if (s === 'PROJECT') {
      payload.scope = 'PROJECT'
    } else if (s.startsWith('project:')) {
      payload.scope = 'PROJECT'
      payload.projectId = Number(s.replace('project:', ''))
    } else {
      payload.scope = 'ALL'
    }

    if (c !== 'ALL') {
      payload.categoryId = Number(c)
    }

    return payload
  }

  function fetchWithFilters(overrides?: Parameters<typeof buildFilterPayload>[0]) {
    const payload = buildFilterPayload(overrides)
    startTransition(async () => {
      try {
        const res = await getTransactions(payload)
        setTransactions(res.transactions)
        setSummary(res.summary)
      } catch {
        toast.error('Error al cargar movimientos filtrados')
      }
    })
  }

  function handleResetFilters() {
    setTypeFilter('ALL')
    setScopeFilter('ALL')
    setCategoryFilter('ALL')
    setStatusFilter('ALL')
    setSearch('')
    setDateFrom('')
    setDateTo('')
    fetchWithFilters({
      typeFilter: 'ALL',
      scopeFilter: 'ALL',
      categoryFilter: 'ALL',
      statusFilter: 'ALL',
      search: '',
      dateFrom: '',
      dateTo: '',
    })
  }

  function openNew(type: TransactionTypeValue) {
    setEditingTx(null)
    setDialogDefaultType(type)
    setDialogOpen(true)
  }

  function openEdit(tx: TransactionDTO) {
    setEditingTx(tx)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deletingTx) return
    const res = await deleteTransaction(deletingTx.id)
    if (!res.success) {
      toast.error(res.error ?? 'Error al eliminar')
      return
    }
    toast.success('Movimiento eliminado')
    setDeletingTx(null)
    fetchWithFilters()
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Ingresos y Gastos (ARS)
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona todas las entradas de dinero y gastos globales de la empresa o por proyecto.
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
              onClick={() => openNew('INCOME')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva Entrada
            </Button>
            <Button
              variant="outline"
              className="border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
              onClick={() => openNew('EXPENSE')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo Gasto
            </Button>
          </div>
        )}
      </div>

      {/* Summary Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Entradas Filtradas (Pagadas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-emerald-400">
              {formatARS(summary.totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gastos Filtrados (Pagados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-rose-400">
              {formatARS(summary.totalExpense)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Balance Filtrado ({summary.count} mov.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-bold font-mono ${
                summary.netBalance >= 0 ? 'text-foreground' : 'text-rose-400'
              }`}
            >
              {formatARS(summary.netBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/60 bg-card/70">
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por concepto o comprobante..."
                value={search}
                onChange={(e) => {
                  const val = e.target.value
                  setSearch(val)
                  fetchWithFilters({ search: val })
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(v) => {
                const val = v as 'ALL' | 'INCOME' | 'EXPENSE'
                setTypeFilter(val)
                fetchWithFilters({ typeFilter: val })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los Tipos</SelectItem>
                <SelectItem value="INCOME">Solo Entradas</SelectItem>
                <SelectItem value="EXPENSE">Solo Gastos</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={scopeFilter}
              onValueChange={(v) => {
                setScopeFilter(v)
                fetchWithFilters({ scopeFilter: v })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Alcance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Global + Proyectos</SelectItem>
                <SelectItem value="GLOBAL">Solo Globales (Empresa)</SelectItem>
                <SelectItem value="PROJECT">Todos los Proyectos</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={`project:${p.id}`}>
                    Proyecto: {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v)
                fetchWithFilters({ categoryFilter: v })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las Categorías</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.type === 'INCOME' ? 'Entrada' : 'Gasto'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                const val = v as 'ALL' | 'PAID' | 'PENDING' | 'CANCELLED'
                setStatusFilter(val)
                fetchWithFilters({ statusFilter: val })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los Estados</SelectItem>
                <SelectItem value="PAID">Pagado / Cobrado</SelectItem>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="CANCELLED">Anulado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Desde:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    fetchWithFilters({ dateFrom: e.target.value })
                  }}
                  className="h-8 w-auto text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Hasta:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    fetchWithFilters({ dateTo: e.target.value })
                  }}
                  className="h-8 w-auto text-xs"
                />
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/60 bg-card/70">
        <CardContent className="pt-6">
          {isPending ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Actualizando movimientos...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No se encontraron movimientos con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto / Ref.</TableHead>
                    <TableHead>Alcance</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto (ARS)</TableHead>
                    {canEdit && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        {tx.type === 'INCOME' ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          >
                            <ArrowDownLeft className="h-3 w-3" />
                            Entrada
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 border-rose-500/40 bg-rose-500/10 text-rose-400"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            Gasto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="truncate font-medium text-foreground" title={tx.description}>
                          {tx.description}
                        </div>
                        {tx.reference && (
                          <div className="text-xs text-muted-foreground">Ref: {tx.reference}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.projectId && tx.projectName ? (
                          <Link
                            href={`/dashboard/projects/${tx.projectId}`}
                            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
                          >
                            <FolderKanban className="h-3 w-3" />
                            {tx.projectName}
                          </Link>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Building2 className="h-3 w-3" />
                            Global
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: tx.categoryColor }}
                          />
                          {tx.categoryName}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.status === 'PAID'
                              ? 'default'
                              : tx.status === 'PENDING'
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="text-[11px]"
                        >
                          {TRANSACTION_STATUS_LABELS[tx.status]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`whitespace-nowrap text-right font-mono font-semibold ${
                          tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'} {formatARS(tx.amount)}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(tx)}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeletingTx(tx)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editingTx}
        projects={projects}
        categories={categories}
        defaultType={dialogDefaultType}
        onSaved={() => fetchWithFilters()}
      />

      <AlertDialog open={Boolean(deletingTx)} onOpenChange={(o) => !o && setDeletingTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente &ldquo;{deletingTx?.description}&rdquo; por{' '}
              <strong>{formatARS(deletingTx?.amount ?? 0)}</strong>. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
