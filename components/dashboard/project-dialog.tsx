'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createProject, updateProject } from '@/app/actions/projects'
import { toInputDate } from '@/lib/format'
import type { ProjectDTO, ProjectStatusType } from '@/lib/types'
import { PROJECT_STATUS_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectDTO | null
  onSaved?: () => void
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: ProjectDialogProps) {
  const router = useRouter()
  const isEditing = Boolean(project)

  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatusType>('ACTIVE')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dbSchema, setDbSchema] = useState('')
  const [customPricePerPlayer, setCustomPricePerPlayer] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (project) {
      setName(project.name)
      setClientName(project.clientName ?? '')
      setDescription(project.description ?? '')
      setStatus(project.status)
      setBudget(project.budget !== null ? String(project.budget) : '')
      setStartDate(toInputDate(project.startDate))
      setEndDate(toInputDate(project.endDate))
      setDbSchema(project.dbSchema ?? '')
      setCustomPricePerPlayer(
        project.customPricePerPlayer !== null ? String(project.customPricePerPlayer) : ''
      )
    } else {
      setName('')
      setClientName('')
      setDescription('')
      setStatus('ACTIVE')
      setBudget('')
      setStartDate(toInputDate(new Date()))
      setEndDate('')
      setDbSchema('')
      setCustomPricePerPlayer('')
    }
  }, [open, project])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedBudget = budget.trim() ? parseFloat(budget) : null
    if (parsedBudget !== null && (Number.isNaN(parsedBudget) || parsedBudget < 0)) {
      toast.error('Ingresa un presupuesto en ARS válido.')
      return
    }

    const parsedCustomPrice = customPricePerPlayer.trim()
      ? parseFloat(customPricePerPlayer)
      : null
    if (parsedCustomPrice !== null && (Number.isNaN(parsedCustomPrice) || parsedCustomPrice < 0)) {
      toast.error('Ingresa una tarifa por jugador en ARS válida.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name,
        clientName: clientName.trim() || null,
        description: description.trim() || null,
        status,
        budget: parsedBudget,
        startDate: startDate || null,
        endDate: endDate || null,
        dbSchema: dbSchema.trim() || null,
        customPricePerPlayer: parsedCustomPrice,
      }

      const res = isEditing && project
        ? await updateProject(project.id, payload)
        : await createProject(payload)

      if (!res.success) {
        toast.error(res.error ?? 'Error al guardar el proyecto')
        setSaving(false)
        return
      }

      toast.success(isEditing ? 'Proyecto actualizado' : 'Proyecto creado correctamente')
      onOpenChange(false)
      router.refresh()
      onSaved?.()
    } catch {
      toast.error('Ocurrió un error al guardar el proyecto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
          <DialogDescription>
            Configura los datos del proyecto y su presupuesto estimado en ARS.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proj-name">Nombre del Proyecto</Label>
            <Input
              id="proj-name"
              placeholder="Ej: Plataforma Copa Center Padel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proj-client">Cliente (opcional)</Label>
              <Input
                id="proj-client"
                placeholder="Ej: Center Padel Club"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-status">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatusType)}>
                <SelectTrigger id="proj-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_STATUS_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-budget">Presupuesto Estimado en ARS (opcional)</Label>
            <Input
              id="proj-budget"
              type="number"
              step="0.01"
              min="0"
              placeholder="3500000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proj-start">Fecha de Inicio</Label>
              <Input
                id="proj-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-end">Fecha de Fin (opc.)</Label>
              <Input
                id="proj-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proj-schema">Schema MySQL Torneos (opc.)</Label>
              <Input
                id="proj-schema"
                placeholder="Ej: padel, encuentro, lapista, byb"
                value={dbSchema}
                onChange={(e) => setDbSchema(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-custom-price">Tarifa x Jugador ARS (opc.)</Label>
              <Input
                id="proj-custom-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Usa tarifa global si vacío"
                value={customPricePerPlayer}
                onChange={(e) => setCustomPricePerPlayer(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-desc">Descripción / Alcance</Label>
            <Textarea
              id="proj-desc"
              rows={3}
              placeholder="Notas sobre el alcance, hitos o condiciones comerciales..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Proyecto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
