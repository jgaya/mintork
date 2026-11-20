'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { createUser, deleteUser, updateUser } from '@/app/actions/users'
import { formatDate } from '@/lib/format'
import type { RoleType, UserDTO } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
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

interface UsersClientProps {
  users: UserDTO[]
  currentUserId: number
  currentUserRole: RoleType
}

export function UsersClient({
  users,
  currentUserId,
  currentUserRole,
}: UsersClientProps) {
  const router = useRouter()
  const isAdmin = currentUserRole === 'ADMIN'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserDTO | null>(null)

  // Form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RoleType>('MANAGER')
  const [saving, setSaving] = useState(false)

  function openNew() {
    setEditingUser(null)
    setName('')
    setEmail('')
    setPassword('')
    setRole('MANAGER')
    setDialogOpen(true)
  }

  function openEdit(u: UserDTO) {
    setEditingUser(u)
    setName(u.name)
    setEmail(u.email)
    setPassword('')
    setRole(u.role)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = editingUser
        ? await updateUser(editingUser.id, { name, email, password, role })
        : await createUser({ name, email, password, role })

      if (!res.success) {
        toast.error(res.error ?? 'Error al guardar usuario')
        setSaving(false)
        return
      }

      toast.success(editingUser ? 'Usuario actualizado' : 'Usuario creado')
      setDialogOpen(false)
      router.refresh()
    } catch {
      toast.error('Ocurrió un error al guardar el usuario')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deletingUser) return
    const res = await deleteUser(deletingUser.id)
    if (!res.success) {
      toast.error(res.error ?? 'No se pudo eliminar el usuario')
      setDeletingUser(null)
      return
    }
    toast.success('Usuario eliminado')
    setDeletingUser(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Administra los accesos y roles del personal autorizado al panel económico.
          </p>
        </div>

        {isAdmin && (
          <Button onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Cuentas Registradas ({users.length})
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Como administrador puedes crear, editar o revocar accesos.'
              : 'Solo los usuarios con rol Administrador pueden gestionar cuentas.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo Electrónico</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Mov. Registrados</TableHead>
                  <TableHead>Alta</TableHead>
                  {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-foreground">
                      {u.name}
                      {u.id === currentUserId && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Tú
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.role === 'ADMIN'
                            ? 'default'
                            : u.role === 'MANAGER'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {u.transactionCount}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(u)}
                            title="Editar usuario"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeletingUser(u)}
                            disabled={u.id === currentUserId}
                            title={
                              u.id === currentUserId
                                ? 'No puedes eliminar tu propia cuenta'
                                : 'Eliminar usuario'
                            }
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
        </CardContent>
      </Card>

      {/* User Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Actualiza los datos del usuario. Deja la contraseña vacía si no deseas cambiarla.'
                : 'Crea una nueva cuenta de acceso para el dashboard financiero.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usr-name">Nombre Completo</Label>
              <Input
                id="usr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usr-email">Correo Electrónico</Label>
              <Input
                id="usr-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usr-role">Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as RoleType)}>
                <SelectTrigger id="usr-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador (Acceso total + usuarios)</SelectItem>
                  <SelectItem value="MANAGER">Operador / Manager (CRUD finanzas)</SelectItem>
                  <SelectItem value="VIEWER">Solo Lectura (Ver dashboard)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usr-pass">
                {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
              </Label>
              <Input
                id="usr-pass"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editingUser}
                minLength={editingUser ? undefined : 6}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingUser)} onOpenChange={(o) => !o && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              El usuario <strong>{deletingUser?.email}</strong> perderá acceso al panel. Sus movimientos históricos se conservarán.
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
