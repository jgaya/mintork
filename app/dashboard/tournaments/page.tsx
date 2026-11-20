import { getTournamentSyncDashboard } from '@/app/actions/tournament-sync'
import { requireAuth } from '@/lib/auth'
import { TournamentsClient } from '@/components/dashboard/tournaments-client'

export default async function TournamentsPage() {
  const [session, initialData] = await Promise.all([
    requireAuth(),
    getTournamentSyncDashboard(true),
  ])

  return <TournamentsClient initialData={initialData} userRole={session.role} />
}
