'use client'

import { create } from 'zustand'

export type PageKey =
  | 'dashboard'
  | 'warga'
  | 'rumah'
  | 'sampah'
  | 'sosial'
  | 'kas'
  | 'laporan'
  | 'riwayat'
  | 'notifikasi'
  | 'users'
  | 'pengaturan'
  | 'profil'

interface AppState {
  currentPage: PageKey
  setPage: (p: PageKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
}

export const useApp = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setPage: (p) => set({ currentPage: p, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}))
