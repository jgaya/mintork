'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'
import type { UserDTO } from '@/lib/types'

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']),
})

const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export async function getUsers(): Promise<UserDTO[]> {
  await requireApiAuth()

  const rows = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    transactionCount: u._count.transactions,
    createdAt: u.createdAt.toISOString(),
  }))
}

export async function createUser(input: CreateUserInput) {
  const session = await requireApiAuth()
  if (session.role !== 'ADMIN') {
    return { success: false, error: 'Solo los administradores pueden crear usuarios.' }
  }

  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos inválidos',
    }
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { success: false, error: 'Ya existe un usuario con ese correo electrónico.' }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
    },
  })

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function updateUser(id: number, input: UpdateUserInput) {
  const session = await requireApiAuth()
  if (session.role !== 'ADMIN') {
    return { success: false, error: 'Solo los administradores pueden editar usuarios.' }
  }

  const parsed = updateUserSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos inválidos',
    }
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    return { success: false, error: 'El usuario no existe.' }
  }

  const email = parsed.data.email.toLowerCase()
  const duplicate = await prisma.user.findFirst({
    where: { email, id: { not: id } },
  })
  if (duplicate) {
    return { success: false, error: 'Ya existe otro usuario con ese correo electrónico.' }
  }

  const updateData: {
    name: string
    email: string
    role: 'ADMIN' | 'MANAGER' | 'VIEWER'
    passwordHash?: string
  } = {
    name: parsed.data.name,
    email,
    role: parsed.data.role,
  }

  if (parsed.data.password && parsed.data.password.length >= 6) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10)
  }

  await prisma.user.update({
    where: { id },
    data: updateData,
  })

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function deleteUser(id: number) {
  const session = await requireApiAuth()
  if (session.role !== 'ADMIN') {
    return { success: false, error: 'Solo los administradores pueden eliminar usuarios.' }
  }

  if (id === session.userId) {
    return { success: false, error: 'No puedes eliminar tu propio usuario en sesión.' }
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    return { success: false, error: 'El usuario no existe.' }
  }

  await prisma.user.delete({ where: { id } })

  revalidatePath('/dashboard/users')
  return { success: true }
}
