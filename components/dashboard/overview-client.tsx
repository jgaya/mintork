'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Clock,
  FolderKanban,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { formatARS, formatDate } from '@/lib/format'
import type {
  CategoryDTO,
  DashboardData,
  PeriodFilter,
  ProjectDTO,
  RoleType,
  TransactionTypeValue,
} from '@/lib/types'
import { TRANSACTION_STATUS_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { FinancialCharts } from '@/components/dashboard/financial-charts'
import { TransactionDialog } from '@/components/dashboard/transaction-dialog'

interface OverviewClientProps {
  data: DashboardData
  projects: ProjectDTO[]
  categories: CategoryDTO[]
  userRole: RoleType
}

export function OverviewClient({
  data,
  projects,
  categories,
  userRole,
}: OverviewClientProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<TransactionTypeValue>('INCOME')
  const canEdit = userRole !== 'VIEWER'

  function handlePeriodChange(period: PeriodFilter) {
    router.push(`/dashboard?period=${period}`)
  }

  function openNewTransaction(type: TransactionTypeValue) {
    setDialogType(type)
    setDialogOpen(true)
  }

  const { kpis } = data
  const isPositive = kpis.netBalance >= 0

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Resumen Económico
          </h1>
          <p className="text-sm text-muted-foreground">
            Estado financiero de Mintork Soft en Pesos Argentinos (ARS) — movimientos globales y por proyecto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={data.period} onValueChange={(v) => handlePeriodChange(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mes Actual</SelectItem>
              <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
              <SelectItem value="year">Año Actual</SelectItem>
              <SelectItem value="all">Todo el Historial</SelectItem>
            </SelectContent>
          </Select>

          {canEdit && (
            <>
              <Button
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                onClick={() => openNewTransaction('INCOME')}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Nueva Entrada
              </Button>
              <Button
                variant="outline"
                className="border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
                onClick={() => openNewTransaction('EXPENSE')}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Nuevo Gasto
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entradas Totales (ARS)
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatARS(kpis.totalIncome)}
            </div>
            <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
              <span className="flex items-center justify-between">
                <span>Globales:</span>
                <span className="font-mono text-foreground">{formatARS(kpis.globalIncome)}</span>
              </span>
              <span className="flex items-center justify-between">
                <span>Proyectos:</span>
                <span className="font-mono text-foreground">{formatARS(kpis.projectIncome)}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos Totales (ARS)
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {formatARS(kpis.totalExpense)}
            </div>
            <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
              <span className="flex items-center justify-between">
                <span>Globales:</span>
                <span className="font-mono text-foreground">{formatARS(kpis.globalExpense)}</span>
              </span>
              <span className="flex items-center justify-between">
                <span>Proyectos:</span>
                <span className="font-mono text-foreground">{formatARS(kpis.projectExpense)}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance Neto (ARS)
            </CardTitle>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isPositive ? 'bg-primary/15 text-primary' : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${
                isPositive ? 'text-foreground' : 'text-rose-400'
              }`}
            >
              {formatARS(kpis.netBalance)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
              )}
              <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                Margen {kpis.profitMargin.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">sobre ingresos cobrados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes (ARS)
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {formatARS(kpis.pendingIncome - kpis.pendingExpense)}
            </div>
            <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
              <span className="flex items-center justify-between">
                <span>Por cobrar:</span>
                <span className="font-mono text-emerald-400">{formatARS(kpis.pendingIncome)}</span>
              </span>
              <span className="flex items-center justify-between">
                <span>Por pagar:</span>
                <span className="font-mono text-rose-400">{formatARS(kpis.pendingExpense)}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <FinancialCharts data={data} />

      {/* Recent Transactions */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Últimos Movimientos</CardTitle>
            <CardDescription>
              Entradas y gastos más recientes registrados en el período
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/transactions">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay movimientos en este período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Alcance</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto (ARS)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{tx.description}</div>
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
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: tx.categoryColor }}
                          />
                          {tx.categoryName}
                        </span>
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
        projects={projects}
        categories={categories}
        defaultType={dialogType}
      />
    </div>
  )
}
