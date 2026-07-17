import {
  LayoutDashboard, Users, Home, Trash2, Heart,
  Wallet, FileText, History, MessageCircle, UserCog, Settings, User,
  type LucideIcon,
} from 'lucide-react'
import type { PageKey } from '@/lib/store'

export interface NavItem {
  key: PageKey
  label: string
  icon: LucideIcon
  roles: Array<'ADMIN' | 'BENDAHARA' | 'KETUA' | 'WARGA'>
  group?: 'utama' | 'iuran' | 'manajemen' | 'sistem'
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'BENDAHARA', 'KETUA', 'WARGA'],
    group: 'utama',
  },
  {
    key: 'warga',
    label: 'Data Warga',
    icon: Users,
    roles: ['ADMIN', 'BENDAHARA', 'KETUA'],
    group: 'manajemen',
  },
  {
    key: 'rumah',
    label: 'Data Rumah',
    icon: Home,
    roles: ['ADMIN', 'BENDAHARA', 'KETUA'],
    group: 'manajemen',
  },
  {
    key: 'sampah',
    label: 'Uang Sampah',
    icon: Trash2,
    roles: ['ADMIN', 'BENDAHARA', 'KETUA', 'WARGA'],
    group: 'iuran',
  },
  {
    key: 'sosial',
    label: 'Uang Sosial',
    icon: Heart,
    roles: ['ADMIN', 'BENDAHARA', 'KETUA', 'WARGA'],
    group: 'iuran',
  },
  {
    key: 'kas',
    label: 'Kas Masuk/Keluar',
    icon: Wallet,
    roles: ['ADMIN', 'BENDAHARA', 'KETUA'],
    group: 'iuran',
  },
  {
    key: 'laporan',
    label: 'Laporan Bulanan',
    icon: FileText,
    roles: ['ADMIN', 'BENDAHARA', 'KETUA', 'WARGA'],
    group: 'manajemen',
  },
  {
    key: 'riwayat',
    label: 'Riwayat Pembayaran',
    icon: History,
    roles: ['ADMIN', 'BENDAHARA', 'KETUA', 'WARGA'],
    group: 'manajemen',
  },
  {
    key: 'notifikasi',
    label: 'Notifikasi WhatsApp',
    icon: MessageCircle,
    roles: ['ADMIN', 'BENDAHARA'],
    group: 'manajemen',
  },
  {
    key: 'users',
    label: 'Manajemen User',
    icon: UserCog,
    roles: ['ADMIN'],
    group: 'sistem',
  },
  {
    key: 'pengaturan',
    label: 'Pengaturan',
    icon: Settings,
    roles: ['ADMIN'],
    group: 'sistem',
  },
  {
    key: 'profil',
    label: 'Profil Saya',
    icon: User,
    roles: ['ADMIN', 'BENDAHARA', 'KETUA', 'WARGA'],
    group: 'sistem',
  },
]

export const GROUP_LABELS: Record<string, string> = {
  utama: 'Menu Utama',
  iuran: 'Keuangan & Iuran',
  manajemen: 'Manajemen',
  sistem: 'Sistem',
}

export function getNavForRole(role: 'ADMIN' | 'BENDAHARA' | 'KETUA' | 'WARGA') {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  BENDAHARA: 'Bendahara',
  KETUA: 'Ketua',
  WARGA: 'Warga',
}

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  BENDAHARA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  KETUA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  WARGA: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
}
