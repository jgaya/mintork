import { requireAuth } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAuth()

  return <DashboardShell user={session}>{children}</DashboardShell>
}
