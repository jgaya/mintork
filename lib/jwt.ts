import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE_NAME = 'mintork_session'

export interface SessionPayload {
  userId: number
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'VIEWER'
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || 'mintork-fallback-dev-secret-2026'
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (
      typeof payload.userId !== 'number' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null
    }
    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role as SessionPayload['role'],
    }
  } catch {
    return null
  }
}
