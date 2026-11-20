'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react'
import {
  createCategory,
  deleteCategory,
  toggleCategoryStatus,
  updateCategory,
} from '@/app/actions/categories'
import type { CategoryDTO, RoleType, TransactionTypeValue } from '@/lib/types'
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

const COLOR_PRESETS = [
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f59e0b',
  '#64748b',
]

interface CategoriesClientProps {
  categories: CategoryDTO[]
  userRole: RoleType
}

export function CategoriesClient({ categories, userRole }: CategoriesClientProps) {
  const router = useRouter()
  const canEdit = userRole !== 'VIEWER'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<CategoryDTO | null>(null)
  const [deletingCat, setDeletingCat] = useState<CategoryDTO | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionTypeValue>('EXPENSE')
  const [color, setColor] = useState('#14b8a6')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  function openNew(defaultType: TransactionTypeValue = 'EXPENSE') {
    setEditingCat(null)
    setName('')
    setType(defaultType)
    setColor(defaultType === 'INCOME' ? '#10b981' : '#f59e0b')
    setIsActive(true)
    setDialogOpen(true)
  }

  function openEdit(cat: CategoryDTO) {
    setEditingCat(cat)
    setName(cat.name)
    setType(cat.type)
    setColor(cat.color)
    setIsActive(cat.isActive)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name, type, color, isActive }
      const res = editingCat
        ? await updateCategory(editingCat.id, payload)
        : await createCategory(payload)

      if (!res.success) {
        toast.error(res.error ?? 'Error al guardar categoría')
        setSaving(false)
        return
      }
      toast.success(editingCat ? 'Categoría actualizada' : 'Categoría creada')
      setDialogOpen(false)
      router.refresh()
    } catch {
      toast.error('Ocurrió un error al guardar la categoría')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(cat: CategoryDTO) {
    const res = await toggleCategoryStatus(cat.id)
    if (!res.success) {
      toast.error(res.error ?? 'Error al actualizar estado')
      return
    }
    toast.success(cat.isActive ? 'Categoría desactivada' : 'Categoría activada')
    router.refresh()
  }

  async function confirmDelete() {
    if (!deletingCat) return
    const res = await deleteCategory(deletingCat.id)
    if (!res.success) {
      toast.error(res.error ?? 'No se pudo eliminar')
      setDeletingCat(null)
      return
    }
    toast.success('Categoría eliminada')
    setDeletingCat(null)
    router.refresh()
  }

  const incomeCategories = categories.filter((c) => c.type === 'INCOME')
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  function renderCategoryTable(list: CategoryDTO[]) {
    if (list.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay categorías en esta sección.
        </p>
      )
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Movimientos</TableHead>
            <TableHead>Estado</TableHead>
            {canEdit && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((cat) => (
            <TableRow key={cat.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium text-foreground">{cat.name}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {cat.transactionCount ?? 0}
              </TableCell>
              <TableCell>
                <Badge variant={cat.isActive ? 'default' : 'secondary'}>
                  {cat.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggle(cat)}
                      title={cat.isActive ? 'Desactivar' : 'Activar'}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(cat)}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeletingCat(cat)}
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
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Organiza las categorías de entradas y gastos para analizar la estructura económica.
          </p>
        </div>

        {canEdit && (
          <Button onClick={() => openNew('EXPENSE')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva Categoría
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                Categorías de Entradas
              </CardTitle>
              <CardDescription>{incomeCategories.length} configuradas</CardDescription>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => openNew('INCOME')}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Agregar
              </Button>
            )}
          </CardHeader>
          <CardContent>{renderCategoryTable(incomeCategories)}</CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpRight className="h-4 w-4 text-rose-400" />
                Categorías de Gastos
              </CardTitle>
              <CardDescription>{expenseCategories.length} configuradas</CardDescription>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => openNew('EXPENSE')}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Agregar
              </Button>
            )}
          </CardHeader>
          <CardContent>{renderCategoryTable(expenseCategories)}</CardContent>
        </Card>
      </div>

      {/* Category Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
            <DialogDescription>
              Define el nombre, tipo y color identificador para gráficos y tablas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nombre</Label>
              <Input
                id="cat-name"
                placeholder="Ej: Servidores Cloud, Abono Mensual..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-type">Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as TransactionTypeValue)}
              >
                <SelectTrigger id="cat-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Entrada (Ingreso)</SelectItem>
                  <SelectItem value="EXPENSE">Salida (Gasto)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      color.toLowerCase() === c ? 'scale-110 border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer p-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <Label htmlFor="cat-active" className="cursor-pointer">
                  Categoría Activa
                </Label>
                <p className="text-xs text-muted-foreground">
                  Solo las categorías activas aparecen para nuevos movimientos.
                </p>
              </div>
              <Switch id="cat-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCat ? 'Guardar' : 'Crear Categoría'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingCat)} onOpenChange={(o) => !o && setDeletingCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por eliminar <strong>{deletingCat?.name}</strong>. Si tiene movimientos asociados no podrá eliminarse (puedes desactivarla en su lugar).
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
