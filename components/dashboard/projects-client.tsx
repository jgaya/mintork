'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowRight,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { deleteProject } from '@/app/actions/projects'
import { formatARS } from '@/lib/format'
import type { ProjectDTO, RoleType } from '@/lib/types'
import { PROJECT_STATUS_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
import { ProjectDialog } from '@/components/dashboard/project-dialog'

interface ProjectsClientProps {
  projects: ProjectDTO[]
  userRole: RoleType
}

export function ProjectsClient({ projects, userRole }: ProjectsClientProps) {
  const router = useRouter()
  const canEdit = userRole !== 'VIEWER'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null)
  const [deletingProject, setDeletingProject] = useState<ProjectDTO | null>(null)

  function openNew() {
    setEditingProject(null)
    setDialogOpen(true)
  }

  function openEdit(project: ProjectDTO) {
    setEditingProject(project)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deletingProject) return
    const res = await deleteProject(deletingProject.id)
    if (!res.success) {
      toast.error(res.error ?? 'No se pudo eliminar el proyecto')
      setDeletingProject(null)
      return
    }
    toast.success('Proyecto eliminado')
    setDeletingProject(null)
    router.refresh()
  }

  const totalProjectsIncome = projects.reduce((acc, p) => acc + p.totalIncome, 0)
  const totalProjectsExpense = projects.reduce((acc, p) => acc + p.totalExpense, 0)
  const totalProjectsNet = totalProjectsIncome - totalProjectsExpense

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            Control económico, ingresos, gastos y rentabilidad de cada proyecto en ARS.
          </p>
        </div>

        {canEdit && (
          <Button onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        )}
      </div>

      {/* Totals Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Ingresos por Proyectos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-emerald-400">
              {formatARS(totalProjectsIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Gastos por Proyectos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-rose-400">
              {formatARS(totalProjectsExpense)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Balance Neto Proyectos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-bold font-mono ${
                totalProjectsNet >= 0 ? 'text-foreground' : 'text-rose-400'
              }`}
            >
              {formatARS(totalProjectsNet)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card className="border-border/60 bg-card/70">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aún no hay proyectos creados. Crea el primer proyecto para imputar ingresos y gastos.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const budgetPct =
              p.budget && p.budget > 0
                ? Math.min(100, Math.round((p.totalExpense / p.budget) * 100))
                : null

            return (
              <Card key={p.id} className="border-border/60 bg-card/70 transition-colors hover:border-primary/40">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 shrink-0 text-primary" />
                        <CardTitle className="truncate text-lg">{p.name}</CardTitle>
                      </div>
                      <CardDescription>
                        {p.clientName ? `Cliente: ${p.clientName}` : 'Proyecto interno'}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        p.status === 'ACTIVE'
                          ? 'default'
                          : p.status === 'COMPLETED'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {PROJECT_STATUS_LABELS[p.status]}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/50 bg-secondary/30 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Ingresos</span>
                      <p className="mt-0.5 font-mono font-semibold text-emerald-400">
                        {formatARS(p.totalIncome)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gastos</span>
                      <p className="mt-0.5 font-mono font-semibold text-rose-400">
                        {formatARS(p.totalExpense)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Balance</span>
                      <p
                        className={`mt-0.5 font-mono font-semibold ${
                          p.netBalance >= 0 ? 'text-foreground' : 'text-rose-400'
                        }`}
                      >
                        {formatARS(p.netBalance)}
                      </p>
                    </div>
                  </div>

                  {p.budget !== null && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Presupuesto: <span className="font-mono text-foreground">{formatARS(p.budget)}</span>
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {budgetPct ?? 0}% ejecutado en gastos
                        </span>
                      </div>
                      <Progress value={budgetPct ?? 0} className="h-1.5" />
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border/50 pt-3">
                    <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
                      <Link href={`/dashboard/projects/${p.id}`}>
                        Ver movimientos ({p.transactionCount})
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                          title="Editar proyecto"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeletingProject(p)}
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
      />

      <AlertDialog
        open={Boolean(deletingProject)}
        onOpenChange={(o) => !o && setDeletingProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por eliminar el proyecto <strong>{deletingProject?.name}</strong>. Solo se puede eliminar si no tiene movimientos económicos asociados.
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
