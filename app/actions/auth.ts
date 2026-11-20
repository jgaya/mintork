'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSessionCookie, deleteSessionCookie, getSession } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

export async function loginAction(input: { email: string; password: string }) {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos inválidos',
    }
  }

  const email = parsed.data.email.toLowerCase().trim()

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return { success: false, error: 'Credenciales incorrectas.' }
  }

  const validPassword = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!validPassword) {
    return { success: false, error: 'Credenciales incorrectas.' }
  }

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  return { success: true }
}

export async function logoutAction() {
  await deleteSessionCookie()
  redirect('/login')
}

export async function getCurrentSessionAction() {
  return getSession()
}
