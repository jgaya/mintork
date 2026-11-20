'use server'

import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'
import { syncPlayingEventsInternal } from '@/app/actions/tournament-sync'
import type { DashboardData, PeriodFilter, TransactionDTO } from '@/lib/types'

function getPeriodStartDate(period: PeriodFilter): Date | undefined {
  const now = new Date()
  if (period === 'month') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  }
  if (period === 'quarter') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1, 0, 0, 0))
  }
  if (period === 'year') {
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0))
  }
  return undefined
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  const monthIdx = parseInt(month, 10) - 1
  return `${MONTH_NAMES[monthIdx] ?? month} ${year.slice(2)}`
}

export async function getDashboardData(period: PeriodFilter = 'all'): Promise<DashboardData> {
  const session = await requireApiAuth()

  // Auto-sincroniza en estado PENDING eventos que hayan pasado a "Jugándose" (si autoSyncOnPlaying está activo)
  try {
    await syncPlayingEventsInternal({
      respectAutoFlag: true,
      createdById: session.userId,
    })
  } catch (err) {
    console.error('Error en auto-sync de torneos:', err)
  }

  const startDate = getPeriodStartDate(period)
  const dateFilter = startDate ? { date: { gte: startDate } } : {}

  // 1. Fetch transactions within selected period for KPIs, categories, and recent list
  const periodTransactions = await prisma.transaction.findMany({
    where: {
      ...dateFilter,
      status: { not: 'CANCELLED' },
    },
    include: {
      project: { select: { id: true, name: true, status: true } },
      category: { select: { id: true, name: true, color: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  })

  let totalIncome = 0
  let globalIncome = 0
  let projectIncome = 0
  let totalExpense = 0
  let globalExpense = 0
  let projectExpense = 0
  let pendingIncome = 0
  let pendingExpense = 0

  const categoryExpenseMap = new Map<number, { categoryId: number; name: string; color: string; amount: number }>()
  const projectMap = new Map<number, { ingresos: number; gastos: number }>()

  for (const tx of periodTransactions) {
    const amount = Number(tx.amount)

    if (tx.status === 'PENDING') {
      if (tx.type === 'INCOME') pendingIncome += amount
      if (tx.type === 'EXPENSE') pendingExpense += amount
      continue
    }

    // PAID transactions
    if (tx.type === 'INCOME') {
      totalIncome += amount
      if (tx.projectId === null) {
        globalIncome += amount
      } else {
        projectIncome += amount
        const entry = projectMap.get(tx.projectId) ?? { ingresos: 0, gastos: 0 }
        entry.ingresos += amount
        projectMap.set(tx.projectId, entry)
      }
    } else if (tx.type === 'EXPENSE') {
      totalExpense += amount
      if (tx.projectId === null) {
        globalExpense += amount
      } else {
        projectExpense += amount
        const entry = projectMap.get(tx.projectId) ?? { ingresos: 0, gastos: 0 }
        entry.gastos += amount
        projectMap.set(tx.projectId, entry)
      }

      const existingCat = categoryExpenseMap.get(tx.categoryId) ?? {
        categoryId: tx.categoryId,
        name: tx.category.name,
        color: tx.category.color,
        amount: 0,
      }
      existingCat.amount += amount
      categoryExpenseMap.set(tx.categoryId, existingCat)
    }
  }

  const netBalance = totalIncome - totalExpense
  const profitMargin = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0

  // 2. Monthly series: if period === 'month', still show last 6 months trend so chart is meaningful
  const now = new Date()
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0))
  const chartTransactions =
    period === 'month'
      ? await prisma.transaction.findMany({
          where: {
            date: { gte: sixMonthsAgo },
            status: 'PAID',
          },
          select: { type: true, amount: true, date: true },
          orderBy: { date: 'asc' },
        })
      : periodTransactions.filter((t) => t.status === 'PAID')

  const monthlyMap = new Map<string, { ingresos: number; gastos: number }>()
  for (const tx of chartTransactions) {
    const d = new Date(tx.date)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const current = monthlyMap.get(key) ?? { ingresos: 0, gastos: 0 }
    const amt = Number(tx.amount)
    if (tx.type === 'INCOME') current.ingresos += amt
    else current.gastos += amt
    monthlyMap.set(key, current)
  }

  const monthlySeries = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({
      month,
      label: formatMonthLabel(month),
      ingresos: vals.ingresos,
      gastos: vals.gastos,
      balance: vals.ingresos - vals.gastos,
    }))

  // 3. Project performance list
  const allProjects = await prisma.project.findMany({
    where: { status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'desc' },
  })

  const projectPerformance = allProjects.map((p) => {
    const stats = projectMap.get(p.id) ?? { ingresos: 0, gastos: 0 }
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      ingresos: stats.ingresos,
      gastos: stats.gastos,
      balance: stats.ingresos - stats.gastos,
      budget: p.budget !== null ? Number(p.budget) : null,
    }
  })

  // 4. Recent 8 transactions (including pending/cancelled for full visibility in table, or non-cancelled)
  const recentRows = await prisma.transaction.findMany({
    where: dateFilter,
    include: {
      project: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: 8,
  })

  const recentTransactions: TransactionDTO[] = recentRows.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount),
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
  }))

  const expensesByCategory = Array.from(categoryExpenseMap.values()).sort(
    (a, b) => b.amount - a.amount
  )

  return {
    period,
    kpis: {
      totalIncome,
      globalIncome,
      projectIncome,
      totalExpense,
      globalExpense,
      projectExpense,
      netBalance,
      profitMargin,
      pendingIncome,
      pendingExpense,
    },
    monthlySeries,
    expensesByCategory,
    projectPerformance,
    recentTransactions,
  }
}
