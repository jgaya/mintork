import { getDashboardData } from '@/app/actions/dashboard'
import { getProjectsWithFinancials } from '@/app/actions/projects'
import { getCategories } from '@/app/actions/categories'
import { requireAuth } from '@/lib/auth'
import type { PeriodFilter } from '@/lib/types'
import { OverviewClient } from '@/components/dashboard/overview-client'

const VALID_PERIODS: PeriodFilter[] = ['month', 'quarter', 'year', 'all']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const period: PeriodFilter = VALID_PERIODS.includes(params.period as PeriodFilter)
    ? (params.period as PeriodFilter)
    : 'all'

  const [session, data, projects, categories] = await Promise.all([
    requireAuth(),
    getDashboardData(period),
    getProjectsWithFinancials(),
    getCategories(true),
  ])

  return (
    <OverviewClient
      data={data}
      projects={projects}
      categories={categories}
      userRole={session.role}
    />
  )
}
