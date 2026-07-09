'use client'

import { useEffect } from 'react'
import { useSession } from '@/hooks/use-session'
import { LoginPage } from '@/components/login-page'
import { AppShell } from '@/components/app-shell'
import { useApp, type PageKey } from '@/lib/store'
import { getNavForRole } from '@/lib/nav'
import { DashboardView } from '@/components/views/dashboard'
import { WargaView, RumahView } from '@/components/views/warga'
import { IuranView } from '@/components/views/iuran'
import { KasView } from '@/components/views/kas'
import { LaporanView } from '@/components/views/laporan'
import { RiwayatView } from '@/components/views/riwayat'
import { NotifikasiView } from '@/components/views/notifikasi'
import { UsersView, PengaturanView } from '@/components/views/users-pengaturan'
import { ProfilView } from '@/components/views/profil'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, Heart, Coins, type LucideIcon } from 'lucide-react'

export default function Home() {
  const { data: session, isLoading } = useSession()
  const { currentPage, setPage } = useApp()

  // Auto-redirect ke dashboard jika currentPage tidak diizinkan untuk role user
  useEffect(() => {
    if (!session?.user) return
    const allowed = getNavForRole(session.user.role).map((i) => i.key)
    if (!allowed.includes(currentPage)) {
      setPage('dashboard')
    }
  }, [session?.user, currentPage, setPage])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-16 w-16 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
          <div className="space-y-2 mt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return <LoginPage />
  }

  return (
    <AppShell>
      {renderPage(currentPage, session.user.role)}
    </AppShell>
  )
}

function renderPage(page: PageKey, role: string) {
  switch (page) {
    case 'dashboard':
      return <DashboardView />
    case 'warga':
      return <WargaView />
    case 'rumah':
      return <RumahView />
    case 'sampah':
      return (
        <IuranView
          apiPath="/api/uang-sampah"
          queryKey="uang-sampah"
          title="Uang Sampah"
          description="Iuran bulanan untuk pengelolaan sampah perumahan"
          icon={Trash2 as LucideIcon}
          defaultAmount={30000}
          accentColor="emerald"
        />
      )
    case 'sosial':
      return (
        <IuranView
          apiPath="/api/uang-sosial"
          queryKey="uang-sosial"
          title="Uang Sosial"
          description="Iuran bulanan untuk kegiatan sosial perumahan"
          icon={Heart as LucideIcon}
          defaultAmount={50000}
          accentColor="rose"
        />
      )
    case 'kurban':
      return (
        <IuranView
          apiPath="/api/tabungan-kurban"
          queryKey="tabungan-kurban"
          title="Tabungan Kurban"
          description="Tabungan rutin untuk ibadah kurban"
          icon={Coins as LucideIcon}
          defaultAmount={100000}
          accentColor="amber"
        />
      )
    case 'kas':
      return <KasView />
    case 'laporan':
      return <LaporanView />
    case 'riwayat':
      return <RiwayatView />
    case 'notifikasi':
      return <NotifikasiView />
    case 'users':
      return role === 'ADMIN' ? <UsersView /> : <DashboardView />
    case 'pengaturan':
      return role === 'ADMIN' ? <PengaturanView /> : <DashboardView />
    case 'profil':
      return <ProfilView />
    default:
      return <DashboardView />
  }
}
