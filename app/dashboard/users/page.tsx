import { getUsers } from '@/app/actions/users'
import { requireAuth } from '@/lib/auth'
import { UsersClient } from '@/components/dashboard/users-client'

export default async function UsersPage() {
  const [session, users] = await Promise.all([
    requireAuth(),
    getUsers(),
  ])

  return (
    <UsersClient
      users={users}
      currentUserId={session.userId}
      currentUserRole={session.role}
    />
  )
}
