'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Mail, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { loginAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')
  const redirectTo = fromParam && fromParam.startsWith('/dashboard') ? fromParam : '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await loginAction({ email, password })
      if (!res.success) {
        setError(res.error ?? 'Error al iniciar sesión')
        setLoading(false)
        return
      }
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Ocurrió un error inesperado al iniciar sesión.')
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex items-center justify-center">
          <Image
            src="/logo.jpg"
            alt="Mintork Soft"
            width={532}
            height={178}
            className="h-11 w-auto rounded-md"
            priority
          />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Panel Económico
          </CardTitle>
          <CardDescription>
            Inicia sesión para gestionar ingresos, gastos y proyectos en ARS
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@mintork.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              'Ingresar al Dashboard'
            )}
          </Button>
        </form>

        <div className="mt-6 border-t border-border/50 pt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al sitio principal
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
