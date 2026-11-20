'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Building2, FolderKanban, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { createTransaction, updateTransaction } from '@/app/actions/transactions'
import { toInputDate } from '@/lib/format'
import type {
  CategoryDTO,
  PaymentMethodValue,
  ProjectDTO,
  TransactionDTO,
  TransactionStatusValue,
  TransactionTypeValue,
} from '@/lib/types'
import { PAYMENT_METHOD_LABELS, TRANSACTION_STATUS_LABELS } from '@/lib/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: TransactionDTO | null
  projects: ProjectDTO[]
  categories: CategoryDTO[]
  defaultType?: TransactionTypeValue
  defaultProjectId?: number | null
  onSaved?: () => void
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  projects,
  categories,
  defaultType = 'EXPENSE',
  defaultProjectId = null,
  onSaved,
}: TransactionDialogProps) {
  const router = useRouter()
  const isEditing = Boolean(transaction)

  const [type, setType] = useState<TransactionTypeValue>(defaultType)
  const [scope, setScope] = useState<'GLOBAL' | 'PROJECT'>(defaultProjectId ? 'PROJECT' : 'GLOBAL')
  const [projectId, setProjectId] = useState<string>(defaultProjectId ? String(defaultProjectId) : '')
  const [categoryId, setCategoryId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [date, setDate] = useState<string>(toInputDate(new Date()))
  const [description, setDescription] = useState<string>('')
  const [reference, setReference] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('TRANSFER')
  const [status, setStatus] = useState<TransactionStatusValue>('PAID')
  const [saving, setSaving] = useState(false)

  const filteredCategories = categories.filter((c) => c.type === type && (c.isActive || String(c.id) === categoryId))

  useEffect(() => {
    if (!open) return

    if (transaction) {
      setType(transaction.type)
      setScope(transaction.projectId ? 'PROJECT' : 'GLOBAL')
      setProjectId(transaction.projectId ? String(transaction.projectId) : '')
      setCategoryId(String(transaction.categoryId))
      setAmount(String(transaction.amount))
      setDate(toInputDate(transaction.date))
      setDescription(transaction.description)
      setReference(transaction.reference ?? '')
      setPaymentMethod(transaction.paymentMethod)
      setStatus(transaction.status)
    } else {
      setType(defaultType)
      setScope(defaultProjectId ? 'PROJECT' : 'GLOBAL')
      setProjectId(defaultProjectId ? String(defaultProjectId) : '')
      const firstCat = categories.find((c) => c.type === defaultType && c.isActive)
      setCategoryId(firstCat ? String(firstCat.id) : '')
      setAmount('')
      setDate(toInputDate(new Date()))
      setDescription('')
      setReference('')
      setPaymentMethod('TRANSFER')
      setStatus('PAID')
    }
  }, [open, transaction, defaultType, defaultProjectId, categories])

  function handleTypeChange(nextType: TransactionTypeValue) {
    setType(nextType)
    const currentCatValid = categories.some(
      (c) => String(c.id) === categoryId && c.type === nextType
    )
    if (!currentCatValid) {
      const firstCat = categories.find((c) => c.type === nextType && c.isActive)
      setCategoryId(firstCat ? String(firstCat.id) : '')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Ingresa un monto en ARS válido mayor a 0.')
      return
    }
    if (!categoryId) {
      toast.error('Selecciona una categoría.')
      return
    }
    if (scope === 'PROJECT' && !projectId) {
      toast.error('Selecciona el proyecto al cual imputar este movimiento.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        type,
        scope,
        projectId: scope === 'PROJECT' ? Number(projectId) : null,
        categoryId: Number(categoryId),
        amount: parsedAmount,
        date,
        description,
        reference: reference.trim() || null,
        paymentMethod,
        status,
      }

      const res = isEditing && transaction
        ? await updateTransaction(transaction.id, payload)
        : await createTransaction(payload)

      if (!res.success) {
        toast.error(res.error ?? 'Error al guardar el movimiento')
        setSaving(false)
        return
      }

      toast.success(
        isEditing
          ? 'Movimiento actualizado correctamente'
          : type === 'INCOME'
            ? 'Entrada registrada en ARS'
            : 'Gasto registrado en ARS'
      )
      onOpenChange(false)
      router.refresh()
      onSaved?.()
    } catch {
      toast.error('Ocurrió un error al guardar el movimiento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Movimiento Económico' : 'Nuevo Movimiento Económico (ARS)'}
          </DialogTitle>
          <DialogDescription>
            Registra una entrada de dinero o un gasto, ya sea global de la empresa o imputado a un proyecto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Movimiento */}
          <div className="space-y-2">
            <Label>Tipo de Movimiento</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('INCOME')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                  type === 'INCOME'
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                )}
              >
                <ArrowDownLeft className="h-4 w-4" />
                Entrada (Ingreso)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('EXPENSE')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                  type === 'EXPENSE'
                    ? 'border-rose-500/60 bg-rose-500/15 text-rose-400'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                )}
              >
                <ArrowUpRight className="h-4 w-4" />
                Salida (Gasto)
              </button>
            </div>
          </div>

          {/* Alcance: Global vs Proyecto */}
          <div className="space-y-2">
            <Label>Alcance / Imputación</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('GLOBAL')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                  scope === 'GLOBAL'
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                )}
              >
                <Building2 className="h-4 w-4" />
                Global (Empresa)
              </button>
              <button
                type="button"
                onClick={() => setScope('PROJECT')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                  scope === 'PROJECT'
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                )}
              >
                <FolderKanban className="h-4 w-4" />
                Por Proyecto
              </button>
            </div>
          </div>

          {scope === 'PROJECT' && (
            <div className="space-y-2">
              <Label htmlFor="tx-project">Proyecto Asociado</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="tx-project" className="w-full">
                  <SelectValue placeholder="Selecciona un proyecto..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No hay proyectos creados
                    </SelectItem>
                  ) : (
                    projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} {p.clientName ? `(${p.clientName})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Monto ARS y Fecha */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Monto (ARS $)</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="150000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-date">Fecha</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Categoría y Estado */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tx-category">Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="tx-category" className="w-full">
                  <SelectValue placeholder="Selecciona categoría..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-status">Estado</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TransactionStatusValue)}
              >
                <SelectTrigger id="tx-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSACTION_STATUS_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Concepto */}
          <div className="space-y-2">
            <Label htmlFor="tx-desc">Concepto / Descripción</Label>
            <Input
              id="tx-desc"
              placeholder={
                type === 'INCOME'
                  ? 'Ej: Abono mensual de mantenimiento o hito de desarrollo'
                  : 'Ej: Servidores cloud, honorarios o compra de licencia'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Método de pago y Referencia */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tx-method">Método de Pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethodValue)}
              >
                <SelectTrigger id="tx-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-ref">Comprobante / Referencia (opc.)</Label>
              <Input
                id="tx-ref"
                placeholder="Ej: FC-B-00041 / MP-123"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
