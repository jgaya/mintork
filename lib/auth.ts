import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  SESSION_COOKIE_NAME,
  SessionPayload,
  signSessionToken,
  verifySessionToken,
} from '@/lib/jwt'

export type { SessionPayload }

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_SECONDS,
  })
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
}

export async function requireApiAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('No autorizado. Debes iniciar sesión.')
  }
  return session
}
