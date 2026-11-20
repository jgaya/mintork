import { getTransactions } from '@/app/actions/transactions'
import { getProjectsWithFinancials } from '@/app/actions/projects'
import { getCategories } from '@/app/actions/categories'
import { requireAuth } from '@/lib/auth'
import { TransactionsClient } from '@/components/dashboard/transactions-client'

export default async function TransactionsPage() {
  const [session, txData, projects, categories] = await Promise.all([
    requireAuth(),
    getTransactions(),
    getProjectsWithFinancials(),
    getCategories(false),
  ])

  return (
    <TransactionsClient
      initialTransactions={txData.transactions}
      initialSummary={txData.summary}
      projects={projects}
      categories={categories}
      userRole={session.role}
    />
  )
}
