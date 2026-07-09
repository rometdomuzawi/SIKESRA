'use client'

import { useState } from 'react'
import { useLogin } from '@/hooks/use-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Home, Lock, Mail, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

const DEMO_ACCOUNTS = [
  { label: 'Administrator', email: 'admin@perumahan.id', password: 'admin123', role: 'ADMIN' },
  { label: 'Bendahara', email: 'bendahara@perumahan.id', password: 'bendahara123', role: 'BENDAHARA' },
  { label: 'Ketua', email: 'ketua@perumahan.id', password: 'ketua123', role: 'KETUA' },
  { label: 'Warga', email: 'warga1@perumahan.id', password: 'warga123', role: 'WARGA' },
]

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Email dan password wajib diisi')
      return
    }
    try {
      await login.mutateAsync({ email, password })
      toast.success('Login berhasil')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login gagal')
    }
  }

  const fillDemo = (acc: { email: string; password: string }) => {
    setEmail(acc.email)
    setPassword(acc.password)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <div className="lg:w-1/2 bg-gradient-to-br from-primary via-primary to-emerald-700 text-primary-foreground p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-emerald-300 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Home className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SIKESRA</h1>
              <p className="text-sm text-primary-foreground/80">Sistem Informasi Keuangan & Sosial Perumahan</p>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
              Kelola Keuangan & Sosial Perumahan Jadi Lebih Mudah
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              Pantau iuran sampah, sosial, tabungan kurban, dan kas perumahan dalam satu dashboard.
              Notifikasi WhatsApp otomatis, laporan bulanan, dan cetak PDF siap pakai.
            </p>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-8">
          {[
            { label: 'Modul Keuangan', value: '4' },
            { label: 'Role Pengguna', value: '4' },
            { label: 'Notifikasi WA', value: 'Auto' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-primary-foreground/70">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Card className="border-2 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Selamat Datang</CardTitle>
              <CardDescription>Masuk ke akun Anda untuk melanjutkan</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@perumahan.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
                  Akun Demo (klik untuk mengisi otomatis)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillDemo(acc)}
                      className="text-left text-xs px-3 py-2 rounded-md border hover:bg-accent transition-colors"
                    >
                      <div className="font-semibold">{acc.label}</div>
                      <div className="text-muted-foreground truncate">{acc.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2026 SIKESRA — Perumahan Griya Asri. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
