'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'
import type { CategoryDTO } from '@/lib/types'

const categorySchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido'),
  isActive: z.boolean().default(true),
})

export type CategoryFormInput = z.infer<typeof categorySchema>

export async function getCategories(onlyActive = false): Promise<CategoryDTO[]> {
  await requireApiAuth()

  const rows = await prisma.category.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    color: c.color,
    isActive: c.isActive,
    transactionCount: c._count.transactions,
    createdAt: c.createdAt.toISOString(),
  }))
}

export async function createCategory(input: CategoryFormInput) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para crear categorías.' }
  }

  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos de categoría inválidos',
    }
  }

  const existing = await prisma.category.findUnique({
    where: { name: parsed.data.name },
  })
  if (existing) {
    return { success: false, error: 'Ya existe una categoría con ese nombre.' }
  }

  await prisma.category.create({ data: parsed.data })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateCategory(id: number, input: CategoryFormInput) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para editar categorías.' }
  }

  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos de categoría inválidos',
    }
  }

  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) {
    return { success: false, error: 'La categoría no existe.' }
  }

  const duplicate = await prisma.category.findFirst({
    where: { name: parsed.data.name, id: { not: id } },
  })
  if (duplicate) {
    return { success: false, error: 'Ya existe otra categoría con ese nombre.' }
  }

  await prisma.category.update({
    where: { id },
    data: parsed.data,
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function toggleCategoryStatus(id: number) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para modificar categorías.' }
  }

  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) {
    return { success: false, error: 'La categoría no existe.' }
  }

  await prisma.category.update({
    where: { id },
    data: { isActive: !existing.isActive },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteCategory(id: number) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para eliminar categorías.' }
  }

  const txCount = await prisma.transaction.count({ where: { categoryId: id } })
  if (txCount > 0) {
    return {
      success: false,
      error: `No se puede eliminar porque tiene ${txCount} movimiento(s) asociado(s). Desactívala en su lugar.`,
    }
  }

  await prisma.category.delete({ where: { id } })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
