'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  FolderKanban,
  Trophy,
  Tags,
  Users,
  LogOut,
  Menu,
  ExternalLink,
} from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import type { SessionPayload } from '@/lib/jwt'
import { ROLE_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Resumen Económico', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/transactions', label: 'Ingresos y Gastos', icon: ArrowLeftRight, exact: false },
  { href: '/dashboard/tournaments', label: 'Cobros de Torneos', icon: Trophy, exact: false },
  { href: '/dashboard/projects', label: 'Proyectos', icon: FolderKanban, exact: false },
  { href: '/dashboard/categories', label: 'Categorías', icon: Tags, exact: false },
  { href: '/dashboard/users', label: 'Usuarios', icon: Users, exact: false },
]

export function DashboardShell({
  user,
  children,
}: {
  user: SessionPayload
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <Image
            src="/logo.jpg"
            alt="Mintork Soft"
            width={532}
            height={178}
            className="h-8 w-auto rounded-sm"
            priority
          />
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            ARS
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="rounded-lg bg-sidebar-accent/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Button variant="ghost" size="sm" asChild className="justify-start text-muted-foreground">
            <Link href="/" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Sitio Público
            </Link>
          </Button>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menú de Navegación</SheetTitle>
                </SheetHeader>
                {sidebarContent}
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-sm">Mintork Finance (ARS)</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {user.name}
          </Badge>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
