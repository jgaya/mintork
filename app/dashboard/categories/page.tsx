import { getCategories } from '@/app/actions/categories'
import { requireAuth } from '@/lib/auth'
import { CategoriesClient } from '@/components/dashboard/categories-client'

export default async function CategoriesPage() {
  const [session, categories] = await Promise.all([
    requireAuth(),
    getCategories(false),
  ])

  return <CategoriesClient categories={categories} userRole={session.role} />
}
