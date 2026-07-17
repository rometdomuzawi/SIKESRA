'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  MessageCircle, Send, Plus, ExternalLink, Check, Clock, X, Zap, Loader2, Bot, RotateCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime, NAMA_BULAN } from '@/lib/format'

interface NotifItem {
  id: string
  wargaId: string
  jenis: string
  pesan: string
  status: string
  providerId?: string | null
  provider?: string | null
  attempts?: number
  errorMessage?: string | null
  tanggalKirim: string
  createdAt: string
  waLink: string | null
  warga: { nama: string; telepon: string | null; nik: string }
  sender: { name: string } | null
}

export function NotifikasiView() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [openForm, setOpenForm] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  const { data, isLoading } = useQuery<{ data: NotifItem[] }>({
    queryKey: ['notifikasi', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/notifikasi?${params}`)
      if (!res.ok) throw new Error('Gagal memuat notifikasi')
      return res.json()
    },
  })

  // Cek status konfigurasi WA provider
  const { data: waStatus } = useQuery<{ configured: boolean; provider: string }>({
    queryKey: ['wa-status'],
    queryFn: async () => {
      const res = await fetch('/api/notifikasi/status')
      if (!res.ok) throw new Error('Gagal cek status WA')
      return res.json()
    },
  })

  const { data: wargaData } = useQuery({
    queryKey: ['warga-min'],
    queryFn: async () => {
      const res = await fetch('/api/warga')
      if (!res.ok) throw new Error('Gagal memuat warga')
      const d = await res.json()
      return d.data
    },
  })

  const createMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/notifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal membuat')
      return d
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.bulk ? `${_d.created || 0} notifikasi dibuat` : 'Notifikasi dibuat')
      qc.invalidateQueries({ queryKey: ['notifikasi'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (vars.bulk) setBulkOpen(false)
      else setOpenForm(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch('/api/notifikasi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal update')
      return d
    },
    onSuccess: () => {
      toast.success('Status diperbarui')
      qc.invalidateQueries({ queryKey: ['notifikasi'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Kirim 1 notifikasi via API provider
  const sendApiMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/notifikasi/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal kirim WA')
      return d
    },
    onSuccess: () => {
      toast.success('Notifikasi terkirim via WhatsApp')
      qc.invalidateQueries({ queryKey: ['notifikasi'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Trigger cron broadcast manual
  const broadcastMut = useMutation({
    mutationFn: async () => {
      const headers: Record<string, string> = {}
      if (process.env.NEXT_PUBLIC_CRON_SECRET) {
        headers.Authorization = `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`
      }
      const res = await fetch('/api/cron/wa-broadcast', { headers })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal trigger broadcast')
      return d
    },
    onSuccess: (d) => {
      toast.success(`Broadcast selesai: ${d.terkirim || 0} terkirim, ${d.gagal || 0} gagal`)
      qc.invalidateQueries({ queryKey: ['notifikasi'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSubmit = (form: HTMLFormElement) => {
    const fd = new FormData(form)
    createMut.mutate({
      wargaId: fd.get('wargaId'),
      jenis: fd.get('jenis'),
      pesan: fd.get('pesan'),
    })
  }

  const onBulkSubmit = (form: HTMLFormElement) => {
    const fd = new FormData(form)
    createMut.mutate({
      bulk: true,
      bulan: Number(fd.get('bulan')),
      tahun: Number(fd.get('tahun')),
      jenis: fd.get('jenis'),
    })
  }

  const now = new Date()
  const stats = {
    total: data?.data?.length || 0,
    pending: data?.data?.filter((n) => n.status === 'PENDING').length || 0,
    terkirim: data?.data?.filter((n) => n.status === 'TERKIRIM').length || 0,
    gagal: data?.data?.filter((n) => n.status === 'GAGAL').length || 0,
  }

  const waConfigured = waStatus?.configured

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifikasi WhatsApp"
        description="Kirim pengingat pembayaran iuran ke warga via WhatsApp"
        actions={
          <div className="flex gap-2 flex-wrap">
            {waConfigured && (
              <Button
                variant="outline"
                onClick={() => broadcastMut.mutate()}
                disabled={broadcastMut.isPending}
              >
                {broadcastMut.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4 mr-2" />
                )}
                {broadcastMut.isPending ? 'Memproses...' : 'Kirim Semua (Auto)'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Zap className="w-4 h-4 mr-2" /> Kirim Massal
            </Button>
            <Button onClick={() => setOpenForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Buat Notifikasi
            </Button>
          </div>
        }
      />

      {/* WA Provider Status Banner */}
      <Card className={waConfigured ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10'}>
        <CardContent className="p-4 flex items-start gap-3 flex-wrap">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${waConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {waConfigured ? <Bot className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">
              {waConfigured
                ? `WhatsApp Otomatis Aktif (${waStatus?.provider?.toUpperCase()})`
                : 'Mode Manual — Klik "Buka WhatsApp" untuk kirim'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {waConfigured
                ? 'Notifikasi akan dikirim otomatis via API provider. Cron Vercel berjalan setiap hari jam 08:00 WIB.'
                : 'Set WA_PROVIDER, FONNTE_TOKEN atau TWILIO_ACCOUNT_SID di env untuk mengaktifkan kirim otomatis. Lihat README.md.'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox label="Total Notifikasi" value={stats.total} color="bg-sky-100 text-sky-700" />
        <StatBox label="Menunggu" value={stats.pending} color="bg-amber-100 text-amber-700" />
        <StatBox label="Terkirim" value={stats.terkirim} color="bg-emerald-100 text-emerald-700" />
        <StatBox label="Gagal" value={stats.gagal} color="bg-rose-100 text-rose-700" />
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="TERKIRIM">Terkirim</SelectItem>
              <SelectItem value="GAGAL">Gagal</SelectItem>
              <SelectItem value="DELIVERED">Sampai</SelectItem>
              <SelectItem value="READ">Dibaca</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : !data?.data?.length ? (
            <EmptyState title="Belum ada notifikasi" description="Buat notifikasi pertama Anda atau gunakan 'Kirim Massal' untuk pengingat iuran." icon={MessageCircle} />
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto scroll-thin">
              {data?.data?.map((n) => (
                <div key={n.id} className="p-4 hover:bg-accent/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="font-medium text-sm">{n.warga.nama}</div>
                        <StatusBadge status={n.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
                        <span>{n.warga.telepon || 'No telepon'}</span>
                        <span>·</span>
                        <span>{formatDateTime(n.createdAt)}</span>
                        {n.provider && n.provider !== 'manual' && (
                          <Badge variant="outline" className="text-[10px] py-0">{n.provider.toUpperCase()}</Badge>
                        )}
                        {n.attempts && n.attempts > 0 && (
                          <span className="text-[10px]">· {n.attempts}x kirim</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-2 whitespace-pre-line">{n.pesan}</p>
                      {n.errorMessage && n.status === 'GAGAL' && (
                        <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded p-2 mb-2">
                          ⚠️ {n.errorMessage}
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {n.waLink && (
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                            <a href={n.waLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" /> Buka WhatsApp
                            </a>
                          </Button>
                        )}
                        {n.status === 'PENDING' && (
                          <>
                            {waConfigured && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                disabled={sendApiMut.isPending}
                                onClick={() => sendApiMut.mutate(n.id)}
                              >
                                {sendApiMut.isPending && sendApiMut.variables === n.id ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                Kirim Otomatis
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => updateMut.mutate({ id: n.id, status: 'TERKIRIM' })}>
                              <Check className="w-3 h-3 mr-1" /> Tandai Terkirim
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600" onClick={() => updateMut.mutate({ id: n.id, status: 'GAGAL' })}>
                              <X className="w-3 h-3 mr-1" /> Gagal
                            </Button>
                          </>
                        )}
                        {n.status === 'GAGAL' && waConfigured && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                            disabled={sendApiMut.isPending}
                            onClick={() => {
                              // Reset ke PENDING dulu, lalu kirim
                              updateMut.mutate(
                                { id: n.id, status: 'PENDING' },
                                { onSuccess: () => sendApiMut.mutate(n.id) }
                              )
                            }}
                          >
                            {sendApiMut.isPending && sendApiMut.variables === n.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <RotateCw className="w-3 h-3 mr-1" />
                            )}
                            Kirim Ulang
                          </Button>
                        )}
                        <Badge variant="outline" className="text-[10px]">{n.jenis}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single notif form */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Notifikasi WhatsApp</DialogTitle>
            <DialogDescription>Kirim pesan ke satu warga</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(e.currentTarget) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Warga *</Label>
                <Select name="wargaId" required>
                  <SelectTrigger><SelectValue placeholder="Pilih warga" /></SelectTrigger>
                  <SelectContent>
                    {wargaData?.map((w: { id: string; nama: string; telepon: string | null }) => (
                      <SelectItem key={w.id} value={w.id}>{w.nama}{w.telepon ? ` (${w.telepon})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select name="jenis" defaultValue="UMUM">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UMUM">Umum</SelectItem>
                    <SelectItem value="SAMPAH">Iuran Sampah</SelectItem>
                    <SelectItem value="SOSIAL">Iuran Sosial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pesan *</Label>
              <Textarea name="pesan" rows={5} required placeholder="Yth. [Nama], pengingat pembayaran iuran..." />
              <p className="text-xs text-muted-foreground">Pesan akan dikirim via WhatsApp. Klik "Buka WhatsApp" setelah notifikasi dibuat.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
              <Button type="submit" disabled={createMut.isPending}>
                <Send className="w-4 h-4 mr-2" /> {createMut.isPending ? 'Membuat...' : 'Buat Notifikasi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk form */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Pengingat Massal</DialogTitle>
            <DialogDescription>Buat pengingat otomatis untuk semua warga yang BELUM BAYAR pada periode tertentu</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); onBulkSubmit(e.currentTarget) }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Bulan *</Label>
                <Select name="bulan" defaultValue={String(now.getMonth() + 1)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NAMA_BULAN.map((n, i) => <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tahun *</Label>
                <Input name="tahun" type="number" defaultValue={now.getFullYear()} required />
              </div>
              <div className="space-y-2">
                <Label>Jenis Iuran *</Label>
                <Select name="jenis" defaultValue="SAMPAH">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAMPAH">Iuran Sampah</SelectItem>
                    <SelectItem value="SOSIAL">Iuran Sosial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Zap className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Sistem akan otomatis membuat notifikasi untuk semua warga yang berstatus <strong>BELUM BAYAR</strong> di periode tersebut. Anda bisa kirim satu per satu via WhatsApp.
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createMut.isPending}>
                <Zap className="w-4 h-4 mr-2" /> {createMut.isPending ? 'Generating...' : 'Generate Notifikasi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${color}`}>
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-lg font-bold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'READ') return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100"><Check className="w-3 h-3 mr-1" /> Dibaca</Badge>
  if (status === 'DELIVERED') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Check className="w-3 h-3 mr-1" /> Sampai</Badge>
  if (status === 'TERKIRIM') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Check className="w-3 h-3 mr-1" /> Terkirim</Badge>
  if (status === 'PENDING') return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
  if (status === 'GAGAL') return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Gagal</Badge>
  return <Badge variant="outline">{status}</Badge>
}
