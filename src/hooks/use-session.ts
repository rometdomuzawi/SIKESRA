'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { safeResJson } from '@/lib/format'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'BENDAHARA' | 'KETUA' | 'WARGA'
  phone: string | null
}

export interface SessionData {
  user: SessionUser | null
  warga: {
    id: string
    nama: string
    nik: string
    telepon: string | null
    alamat: string | null
    rumah: { id: string; blok: string; nomor: string; alamat: string } | null
  } | null
}

export function useSession() {
  return useQuery<SessionData>({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      const { ok, data, error } = await safeResJson<SessionData>(res)
      if (!ok) throw new Error(error || 'Failed to fetch session')
      return data ?? { user: null, warga: null }
    },
    staleTime: 60_000,
    retry: 1,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const { ok, data, error } = await safeResJson(res)
      if (!ok) throw new Error(error || 'Login gagal')
      return data
    },
    onSuccess: () => {
      // Force re-fetch session, ignore staleTime
      qc.invalidateQueries({ queryKey: ['session'], refetchType: 'active' })
      qc.refetchQueries({ queryKey: ['session'] })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
    },
    onSuccess: () => {
      qc.setQueryData(['session'], { user: null, warga: null })
      qc.clear()
    },
  })
}
