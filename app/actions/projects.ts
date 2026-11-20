'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'
import type { ProjectDTO, TransactionDTO } from '@/lib/types'

const projectSchema = z.object({
  name: z.string().trim().min(2, 'El nombre del proyecto es obligatorio').max(150),
  clientName: z.string().trim().max(150).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']),
  budget: z.number().nonnegative('El presupuesto no puede ser negativo').nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  dbSchema: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]*$/, 'El nombre de schema solo admite letras, números y _')
    .max(64)
    .nullable()
    .optional(),
  customPricePerPlayer: z
    .number()
    .nonnegative('La tarifa por jugador no puede ser negativa')
    .nullable()
    .optional(),
})

export type ProjectFormInput = z.infer<typeof projectSchema>

export async function getProjectsWithFinancials(): Promise<ProjectDTO[]> {
  await requireApiAuth()

  const projects = await prisma.project.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  const grouped = await prisma.transaction.groupBy({
    by: ['projectId', 'type', 'status'],
    where: {
      projectId: { not: null },
      status: { not: 'CANCELLED' },
    },
    _sum: { amount: true },
    _count: { id: true },
  })

  const statsMap = new Map<
    number,
    {
      totalIncome: number
      totalExpense: number
      pendingIncome: number
      pendingExpense: number
      transactionCount: number
    }
  >()

  for (const row of grouped) {
    if (row.projectId === null) continue
    const current = statsMap.get(row.projectId) ?? {
      totalIncome: 0,
      totalExpense: 0,
      pendingIncome: 0,
      pendingExpense: 0,
      transactionCount: 0,
    }
    const amt = Number(row._sum.amount ?? 0)
    current.transactionCount += row._count.id

    if (row.status === 'PAID') {
      if (row.type === 'INCOME') current.totalIncome += amt
      else if (row.type === 'EXPENSE') current.totalExpense += amt
    } else if (row.status === 'PENDING') {
      if (row.type === 'INCOME') current.pendingIncome += amt
      else if (row.type === 'EXPENSE') current.pendingExpense += amt
    }
    statsMap.set(row.projectId, current)
  }

  return projects.map((p) => {
    const s = statsMap.get(p.id) ?? {
      totalIncome: 0,
      totalExpense: 0,
      pendingIncome: 0,
      pendingExpense: 0,
      transactionCount: 0,
    }

    return {
      id: p.id,
      name: p.name,
      clientName: p.clientName,
      description: p.description,
      status: p.status,
      budget: p.budget !== null ? Number(p.budget) : null,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
      dbSchema: p.dbSchema,
      customPricePerPlayer: p.customPricePerPlayer !== null ? Number(p.customPricePerPlayer) : null,
      totalIncome: s.totalIncome,
      totalExpense: s.totalExpense,
      pendingIncome: s.pendingIncome,
      pendingExpense: s.pendingExpense,
      netBalance: s.totalIncome - s.totalExpense,
      transactionCount: s.transactionCount,
      createdAt: p.createdAt.toISOString(),
    }
  })
}

export async function getProjectById(id: number): Promise<{
  project: ProjectDTO
  transactions: TransactionDTO[]
} | null> {
  await requireApiAuth()

  const p = await prisma.project.findUnique({
    where: { id },
    include: {
      transactions: {
        include: {
          category: { select: { id: true, name: true, color: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      },
    },
  })

  if (!p) return null

  let totalIncome = 0
  let totalExpense = 0
  let pendingIncome = 0
  let pendingExpense = 0

  const transactions: TransactionDTO[] = p.transactions.map((tx) => {
    const amt = Number(tx.amount)
    if (tx.status === 'PAID') {
      if (tx.type === 'INCOME') totalIncome += amt
      else if (tx.type === 'EXPENSE') totalExpense += amt
    } else if (tx.status === 'PENDING') {
      if (tx.type === 'INCOME') pendingIncome += amt
      else if (tx.type === 'EXPENSE') pendingExpense += amt
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
      projectName: p.name,
      categoryId: tx.categoryId,
      categoryName: tx.category.name,
      categoryColor: tx.category.color,
      createdById: tx.createdById,
      createdByName: tx.createdBy?.name ?? null,
      createdAt: tx.createdAt.toISOString(),
    }
  })

  return {
    project: {
      id: p.id,
      name: p.name,
      clientName: p.clientName,
      description: p.description,
      status: p.status,
      budget: p.budget !== null ? Number(p.budget) : null,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
      dbSchema: p.dbSchema,
      customPricePerPlayer: p.customPricePerPlayer !== null ? Number(p.customPricePerPlayer) : null,
      totalIncome,
      totalExpense,
      pendingIncome,
      pendingExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: transactions.length,
      createdAt: p.createdAt.toISOString(),
    },
    transactions,
  }
}

export async function createProject(input: ProjectFormInput) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para crear proyectos.' }
  }

  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos de proyecto inválidos',
    }
  }

  const data = parsed.data
  const normalizedSchema = data.dbSchema?.trim() ? data.dbSchema.trim() : null
  if (normalizedSchema) {
    const schemaInUse = await prisma.project.findFirst({ where: { dbSchema: normalizedSchema } })
    if (schemaInUse) {
      return {
        success: false,
        error: `El schema "${normalizedSchema}" ya está asignado al proyecto "${schemaInUse.name}".`,
      }
    }
  }

  await prisma.project.create({
    data: {
      name: data.name,
      clientName: data.clientName || null,
      description: data.description || null,
      status: data.status,
      budget: data.budget ?? null,
      startDate: data.startDate ? new Date(`${data.startDate}T12:00:00.000Z`) : null,
      endDate: data.endDate ? new Date(`${data.endDate}T12:00:00.000Z`) : null,
      dbSchema: normalizedSchema,
      customPricePerPlayer: data.customPricePerPlayer ?? null,
    },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateProject(id: number, input: ProjectFormInput) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para editar proyectos.' }
  }

  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos de proyecto inválidos',
    }
  }

  const existing = await prisma.project.findUnique({ where: { id } })
  if (!existing) {
    return { success: false, error: 'El proyecto no existe.' }
  }

  const data = parsed.data
  const normalizedSchema = data.dbSchema?.trim() ? data.dbSchema.trim() : null
  if (normalizedSchema) {
    const schemaInUse = await prisma.project.findFirst({
      where: { dbSchema: normalizedSchema, id: { not: id } },
    })
    if (schemaInUse) {
      return {
        success: false,
        error: `El schema "${normalizedSchema}" ya está asignado al proyecto "${schemaInUse.name}".`,
      }
    }
  }

  await prisma.project.update({
    where: { id },
    data: {
      name: data.name,
      clientName: data.clientName || null,
      description: data.description || null,
      status: data.status,
      budget: data.budget ?? null,
      startDate: data.startDate ? new Date(`${data.startDate}T12:00:00.000Z`) : null,
      endDate: data.endDate ? new Date(`${data.endDate}T12:00:00.000Z`) : null,
      dbSchema: normalizedSchema,
      customPricePerPlayer: data.customPricePerPlayer ?? null,
    },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteProject(id: number) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para eliminar proyectos.' }
  }

  const txCount = await prisma.transaction.count({ where: { projectId: id } })
  if (txCount > 0) {
    return {
      success: false,
      error: `Este proyecto tiene ${txCount} movimiento(s) asociado(s). Cámbialo a estado "Cancelado" o "Finalizado", o reasigna sus movimientos primero.`,
    }
  }

  await prisma.project.delete({ where: { id } })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
