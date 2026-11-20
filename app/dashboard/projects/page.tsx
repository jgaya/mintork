import { getProjectsWithFinancials } from '@/app/actions/projects'
import { requireAuth } from '@/lib/auth'
import { ProjectsClient } from '@/components/dashboard/projects-client'

export default async function ProjectsPage() {
  const [session, projects] = await Promise.all([
    requireAuth(),
    getProjectsWithFinancials(),
  ])

  return <ProjectsClient projects={projects} userRole={session.role} />
}
