'use client'

import { useState, type ReactNode } from 'react'
import { useApp, type PageKey } from '@/lib/store'
import { useLogout, useSession } from '@/hooks/use-session'
import { getNavForRole, GROUP_LABELS, ROLE_LABELS, ROLE_COLORS } from '@/lib/nav'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  Home, LogOut, Menu, Bell, ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { currentPage, setPage, sidebarOpen, setSidebarOpen } = useApp()
  const { data: sessionData } = useSession()
  const logout = useLogout()
  const user = sessionData?.user

  const navItems = user ? getNavForRole(user.role) : []
  const groupedNav = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    const g = item.group || 'lain'
    if (!acc[g]) acc[g] = []
    acc[g].push(item)
    return acc
  }, {})

  const handleLogout = async () => {
    await logout.mutateAsync()
    toast.success('Berhasil logout')
  }

  const initials = (user?.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  const SidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Home className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base leading-tight">SIKESRA</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">Keuangan & Sosial Perumahan</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-5">
        {Object.entries(groupedNav).map(([group, items]) => (
          <div key={group}>
            <div className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-3 mb-2">
              {GROUP_LABELS[group] || group}
            </div>
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => setPage(item.key as PageKey)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent/50">
          <Avatar className="w-9 h-9 border-2 border-sidebar-primary">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{user?.name}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 fixed inset-y-0 left-0 z-30">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-6 gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-base lg:text-lg font-semibold truncate">
                {navItems.find((i) => i.key === currentPage)?.label || 'SIKESRA'}
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Selamat datang, {user?.name?.split(' ')[0]} 👋
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setPage('notifikasi')}
              title="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={`text-xs font-semibold ${ROLE_COLORS[user?.role || 'WARGA']}`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium leading-tight">{user?.name}</div>
                    <div className="text-xs text-muted-foreground">{user && ROLE_LABELS[user.role]}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{user?.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                    {user && (
                      <Badge className={`w-fit text-[10px] ${ROLE_COLORS[user.role]}`} variant="secondary">
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPage('profil')}>
                  <Home className="w-4 h-4 mr-2" /> Profil Saya
                </DropdownMenuItem>
                {user?.role === 'ADMIN' && (
                  <DropdownMenuItem onClick={() => setPage('pengaturan')}>
                    <Home className="w-4 h-4 mr-2" /> Pengaturan
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-full overflow-x-hidden">
          {children}
        </main>

        <footer className="mt-auto border-t py-4 px-6 text-center text-xs text-muted-foreground">
          © 2026 SIKESRA — Sistem Informasi Keuangan & Sosial Perumahan Griya Asri
        </footer>
      </div>
    </div>
  )
}
