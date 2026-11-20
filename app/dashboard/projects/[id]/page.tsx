import { notFound } from 'next/navigation'
import { getProjectById, getProjectsWithFinancials } from '@/app/actions/projects'
import { getCategories } from '@/app/actions/categories'
import { requireAuth } from '@/lib/auth'
import { ProjectDetailClient } from '@/components/dashboard/project-detail-client'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = Number(id)
  if (!Number.isInteger(projectId) || projectId <= 0) {
    notFound()
  }

  const [session, detail, allProjects, categories] = await Promise.all([
    requireAuth(),
    getProjectById(projectId),
    getProjectsWithFinancials(),
    getCategories(false),
  ])

  if (!detail) {
    notFound()
  }

  return (
    <ProjectDetailClient
      project={detail.project}
      transactions={detail.transactions}
      allProjects={allProjects}
      categories={categories}
      userRole={session.role}
    />
  )
}
