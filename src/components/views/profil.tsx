'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useSession } from '@/hooks/use-session'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/nav'
import { Mail, Phone, Home, User, Lock, Save, Shield } from 'lucide-react'
import { toast } from 'sonner'

export function ProfilView() {
  const { data: sessionData } = useSession()
  const qc = useQueryClient()
  const user = sessionData?.user
  const warga = sessionData?.warga

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [password, setPassword] = useState('')

  const saveMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      // Untuk warga: update via /api/warga PUT dengan id warga
      // Untuk lainnya: update via /api/users PUT (admin-only tapi user bisa update diri sendiri via profil)
      // Karena batasan API: warga bisa update warga, admin/bendahara/ketua update via users tapi perlu admin
      // Kita gunakan endpoint profil khusus - kita akan POST ke /api/auth/profil
      const res = await fetch('/api/auth/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal update profil')
      return d
    },
    onSuccess: () => {
      toast.success('Profil diperbarui')
      qc.invalidateQueries({ queryKey: ['session'] })
      setPassword('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const body: Record<string, unknown> = { name, phone }
    if (password) body.password = password
    saveMut.mutate(body)
  }

  if (!user) return null

  const initials = user.name.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()

  return (
    <div className="space-y-5">
      <PageHeader title="Profil Saya" description="Kelola informasi akun Anda" />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Profile card */}
        <Card>
          <CardContent className="p-6 text-center">
            <Avatar className="w-24 h-24 mx-auto mb-3 border-4 border-primary/20">
              <AvatarFallback className={`text-2xl font-bold ${ROLE_COLORS[user.role]}`}>{initials}</AvatarFallback>
            </Avatar>
            <h3 className="font-bold text-lg">{user.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{user.email}</p>
            <Badge className={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role]}</Badge>

            <div className="mt-5 pt-5 border-t space-y-2 text-left">
              {user.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{user.email}</span>
              </div>
              {warga && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{warga.nik}</span>
                  </div>
                  {warga.rumah && (
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span>Blok {warga.rumah.blok} / No. {warga.rumah.nomor}</span>
                    </div>
                  )}
                  {warga.alamat && (
                    <div className="text-xs text-muted-foreground pt-2 border-t mt-2">{warga.alamat}</div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Edit Profil
            </h3>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email (tidak bisa diubah)</Label>
                  <Input value={user.email} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Nomor Telepon / WhatsApp</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="62812..." />
                </div>
                {warga && (
                  <div className="space-y-2">
                    <Label>NIK (tidak bisa diubah)</Label>
                    <Input value={warga.nik} disabled className="bg-muted/50 font-mono" />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Ubah Password
                </h4>
                <div className="space-y-2">
                  <Label>Password Baru</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin mengubah"
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">Min. 6 karakter</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saveMut.isPending}>
                  <Save className="w-4 h-4 mr-2" /> {saveMut.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-900/10">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-sky-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-sky-900 dark:text-sky-300">Keamanan Akun</p>
            <p className="text-sky-700 dark:text-sky-400 mt-1">
              Jangan bagikan password Anda kepada siapapun. Logout dari perangkat umum setelah selesai menggunakan aplikasi.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
