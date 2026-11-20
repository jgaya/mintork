'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { deleteTransaction } from '@/app/actions/transactions'
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
  PROJECT_STATUS_LABELS,
  TRANSACTION_STATUS_LABELS,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ProjectDialog } from '@/components/dashboard/project-dialog'

interface ProjectDetailClientProps {
  project: ProjectDTO
  transactions: TransactionDTO[]
  allProjects: ProjectDTO[]
  categories: CategoryDTO[]
  userRole: RoleType
}

export function ProjectDetailClient({
  project,
  transactions,
  allProjects,
  categories,
  userRole,
}: ProjectDetailClientProps) {
  const router = useRouter()
  const canEdit = userRole !== 'VIEWER'

  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [txDialogType, setTxDialogType] = useState<TransactionTypeValue>('INCOME')
  const [editingTx, setEditingTx] = useState<TransactionDTO | null>(null)
  const [deletingTx, setDeletingTx] = useState<TransactionDTO | null>(null)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)

  function openNewTx(type: TransactionTypeValue) {
    setEditingTx(null)
    setTxDialogType(type)
    setTxDialogOpen(true)
  }

  function openEditTx(tx: TransactionDTO) {
    setEditingTx(tx)
    setTxDialogOpen(true)
  }

  async function confirmDeleteTx() {
    if (!deletingTx) return
    const res = await deleteTransaction(deletingTx.id)
    if (!res.success) {
      toast.error(res.error ?? 'Error al eliminar')
      return
    }
    toast.success('Movimiento eliminado del proyecto')
    setDeletingTx(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Back & Title */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Proyectos
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {project.name}
            </h1>
            <Badge>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {project.clientName ? `Cliente: ${project.clientName}` : 'Proyecto Interno'}
            {project.description ? ` — ${project.description}` : ''}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setProjectDialogOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar Proyecto
            </Button>
            <Button
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              onClick={() => openNewTx('INCOME')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Entrada del Proyecto
            </Button>
            <Button
              variant="outline"
              className="border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
              onClick={() => openNewTx('EXPENSE')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Gasto del Proyecto
            </Button>
          </div>
        )}
      </div>

      {/* Project KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Entradas Cobradas (ARS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-emerald-400">
              {formatARS(project.totalIncome)}
            </p>
            {project.pendingIncome > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Pendiente: {formatARS(project.pendingIncome)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Gastos Pagados (ARS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-rose-400">
              {formatARS(project.totalExpense)}
            </p>
            {project.pendingExpense > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Pendiente: {formatARS(project.pendingExpense)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Balance Neto (ARS)
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-bold font-mono ${
                project.netBalance >= 0 ? 'text-foreground' : 'text-rose-400'
              }`}
            >
              {formatARS(project.netBalance)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Presupuesto Asignado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-foreground">
              {project.budget !== null ? formatARS(project.budget) : 'Sin definir'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Transactions Table */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-base">
            Movimientos Imputados al Proyecto ({transactions.length})
          </CardTitle>
          <CardDescription>
            Historial completo de entradas y gastos asociados a {project.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay movimientos registrados para este proyecto todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
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
                      <TableCell>
                        <div className="font-medium text-foreground">{tx.description}</div>
                        {tx.reference && (
                          <div className="text-xs text-muted-foreground">Ref: {tx.reference}</div>
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
                      <TableCell className="text-xs text-muted-foreground">
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
                              onClick={() => openEditTx(tx)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeletingTx(tx)}
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
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        transaction={editingTx}
        projects={allProjects}
        categories={categories}
        defaultType={txDialogType}
        defaultProjectId={project.id}
      />

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={project}
      />

      <AlertDialog open={Boolean(deletingTx)} onOpenChange={(o) => !o && setDeletingTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &ldquo;{deletingTx?.description}&rdquo; por{' '}
              <strong>{formatARS(deletingTx?.amount ?? 0)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTx}
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
