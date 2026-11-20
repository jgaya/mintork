import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@/generated/prisma/client'

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

const CONNECTION_LIMIT = parsePositiveInt(process.env.DB_CONNECTION_LIMIT, 8)
const MINIMUM_IDLE = parsePositiveInt(process.env.DB_MIN_IDLE, 2)

function buildPooledUrl(): string {
  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const url = new URL(rawUrl)
  url.searchParams.set('connectionLimit', String(CONNECTION_LIMIT))
  url.searchParams.set('minimumIdle', String(Math.min(MINIMUM_IDLE, CONNECTION_LIMIT)))
  return url.toString()
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(buildPooledUrl()),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
