'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'
import type { TransactionDTO } from '@/lib/types'

const transactionSchema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE']),
    scope: z.enum(['GLOBAL', 'PROJECT']),
    projectId: z.number().int().positive().nullable().optional(),
    categoryId: z.number().int().positive('Selecciona una categoría'),
    amount: z.number().positive('El monto debe ser mayor a 0'),
    date: z.string().min(1, 'La fecha es obligatoria'),
    description: z.string().trim().min(2, 'Ingresa una descripción').max(255),
    reference: z.string().trim().max(120).nullable().optional(),
    paymentMethod: z.enum(['TRANSFER', 'CASH', 'CARD', 'CRYPTO', 'OTHER']),
    status: z.enum(['PAID', 'PENDING', 'CANCELLED']),
  })
  .refine(
    (data) => {
      if (data.scope === 'PROJECT' && !data.projectId) {
        return false
      }
      return true
    },
    {
      message: 'Debes seleccionar un proyecto cuando el alcance es Por Proyecto',
      path: ['projectId'],
    }
  )

export type TransactionFormInput = z.infer<typeof transactionSchema>

export interface TransactionFilters {
  type?: 'ALL' | 'INCOME' | 'EXPENSE'
  scope?: 'ALL' | 'GLOBAL' | 'PROJECT'
  projectId?: number
  categoryId?: number
  status?: 'ALL' | 'PAID' | 'PENDING' | 'CANCELLED'
  search?: string
  dateFrom?: string
  dateTo?: string
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<{
  transactions: TransactionDTO[]
  summary: {
    totalIncome: number
    totalExpense: number
    netBalance: number
    count: number
  }
}> {
  await requireApiAuth()

  const where: Prisma.TransactionWhereInput = {}

  if (filters.type && filters.type !== 'ALL') {
    where.type = filters.type
  }

  if (filters.projectId) {
    where.projectId = filters.projectId
  } else if (filters.scope === 'GLOBAL') {
    where.projectId = null
  } else if (filters.scope === 'PROJECT') {
    where.projectId = { not: null }
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }

  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status
  }

  if (filters.dateFrom || filters.dateTo) {
    where.date = {}
    if (filters.dateFrom) {
      where.date.gte = new Date(`${filters.dateFrom}T00:00:00.000Z`)
    }
    if (filters.dateTo) {
      where.date.lte = new Date(`${filters.dateTo}T23:59:59.999Z`)
    }
  }

  if (filters.search && filters.search.trim().length > 0) {
    const q = filters.search.trim()
    where.OR = [
      { description: { contains: q } },
      { reference: { contains: q } },
    ]
  }

  const rows = await prisma.transaction.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  })

  let totalIncome = 0
  let totalExpense = 0

  const transactions: TransactionDTO[] = rows.map((tx) => {
    const amt = Number(tx.amount)
    if (tx.status === 'PAID') {
      if (tx.type === 'INCOME') totalIncome += amt
      else if (tx.type === 'EXPENSE') totalExpense += amt
    }

    return {
      id: tx.id,
      type: tx.type,
      amount: amt,
      date: tx.date.toISOString(),
      description: tx.description,
      reference: tx.reference,
      paymentMethod: tx.paymentMethod,
      status: tx.status,
      projectId: tx.projectId,
      projectName: tx.project?.name ?? null,
      categoryId: tx.categoryId,
      categoryName: tx.category.name,
      categoryColor: tx.category.color,
      createdById: tx.createdById,
      createdByName: tx.createdBy?.name ?? null,
      createdAt: tx.createdAt.toISOString(),
    }
  })

  return {
    transactions,
    summary: {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      count: transactions.length,
    },
  }
}

export async function createTransaction(input: TransactionFormInput) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para crear movimientos.' }
  }

  const parsed = transactionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos de movimiento inválidos',
    }
  }

  const data = parsed.data
  const targetProjectId = data.scope === 'GLOBAL' ? null : (data.projectId ?? null)

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
  if (!category) {
    return { success: false, error: 'La categoría seleccionada no existe.' }
  }
  if (category.type !== data.type) {
    return {
      success: false,
      error: 'La categoría seleccionada no corresponde al tipo de movimiento.',
    }
  }

  if (targetProjectId !== null) {
    const project = await prisma.project.findUnique({ where: { id: targetProjectId } })
    if (!project) {
      return { success: false, error: 'El proyecto seleccionado no existe.' }
    }
  }

  await prisma.transaction.create({
    data: {
      type: data.type,
      amount: data.amount,
      date: new Date(`${data.date}T12:00:00.000Z`),
      description: data.description,
      reference: data.reference || null,
      paymentMethod: data.paymentMethod,
      status: data.status,
      projectId: targetProjectId,
      categoryId: data.categoryId,
      createdById: session.userId,
    },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateTransaction(id: number, input: TransactionFormInput) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para editar movimientos.' }
  }

  const parsed = transactionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos de movimiento inválidos',
    }
  }

  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (!existing) {
    return { success: false, error: 'El movimiento no existe.' }
  }

  const data = parsed.data
  const targetProjectId = data.scope === 'GLOBAL' ? null : (data.projectId ?? null)

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
  if (!category || category.type !== data.type) {
    return {
      success: false,
      error: 'La categoría seleccionada no es válida para este tipo de movimiento.',
    }
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      type: data.type,
      amount: data.amount,
      date: new Date(`${data.date}T12:00:00.000Z`),
      description: data.description,
      reference: data.reference || null,
      paymentMethod: data.paymentMethod,
      status: data.status,
      projectId: targetProjectId,
      categoryId: data.categoryId,
    },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteTransaction(id: number) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para eliminar movimientos.' }
  }

  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (!existing) {
    return { success: false, error: 'El movimiento no existe.' }
  }

  await prisma.transaction.delete({ where: { id } })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
