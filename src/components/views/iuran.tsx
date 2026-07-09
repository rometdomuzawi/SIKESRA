'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Check, X, Trash2, Coins, Zap, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/hooks/use-session'
import { formatRupiah, formatTanggal, namaBulan, NAMA_BULAN } from '@/lib/format'
import type { LucideIcon } from 'lucide-react'

interface IuranItem {
  id: string
  wargaId: string
  bulan: number
  tahun: number
  jumlah: number
  status: 'LUNAS' | 'BELUM_BAYAR'
  tanggalBayar: string | null
  metode: string | null
  keterangan: string | null
  warga: { id: string; nama: string; nik: string; telepon: string | null; rumah: { blok: string; nomor: string } | null }
}

interface IuranViewProps {
  apiPath: string
  queryKey: string
  title: string
  description: string
  icon: LucideIcon
  defaultAmount: number
  accentColor: 'emerald' | 'amber' | 'violet'
}

export function IuranView({
  apiPath,
  queryKey,
  title,
  description,
  icon: Icon,
  defaultAmount,
  accentColor,
}: IuranViewProps) {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const isWarga = session?.user?.role === 'WARGA'
  const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'BENDAHARA'

  const now = new Date()
  const [bulanFilter, setBulanFilter] = useState(String(now.getMonth() + 1))
  const [tahunFilter, setTahunFilter] = useState(String(now.getFullYear()))
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<IuranItem | null>(null)
  const [payItem, setPayItem] = useState<IuranItem | null>(null)
  const [payMethod, setPayMethod] = useState<string>('TUNAI')

  const { data, isLoading } = useQuery<{ data: IuranItem[] }>({
    queryKey: [queryKey, bulanFilter, tahunFilter, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({ bulan: bulanFilter, tahun: tahunFilter })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`${apiPath}?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      return res.json()
    },
  })

  const { data: wargaData } = useQuery<{ data: Array<{ id: string; nama: string; nik: string; rumah: { blok: string; nomor: string } | null }> }>({
    queryKey: ['warga-minimal'],
    enabled: canManage,
    queryFn: async () => {
      const res = await fetch('/api/warga')
      if (!res.ok) throw new Error('Gagal memuat warga')
      const d = await res.json()
      return { data: d.data.map((w: IuranItem['warga'] & { id: string }) => ({ id: w.id, nama: w.nama, nik: w.nik, rumah: w.rumah })) }
    },
  })

  const createMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(apiPath, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal menambah')
      return d
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.bulk ? `${vars.bulk ? 'Bulk generate selesai' : 'Iuran dibuat'}` : 'Iuran dibuat')
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['riwayat'] })
      qc.invalidateQueries({ queryKey: ['laporan'] })
      if (vars.bulk) setBulkOpen(false)
      else setOpenForm(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(apiPath, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal update')
      return d
    },
    onSuccess: () => {
      toast.success('Status pembayaran diperbarui')
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['riwayat'] })
      qc.invalidateQueries({ queryKey: ['laporan'] })
      setPayItem(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${apiPath}?id=${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal hapus')
      return d
    },
    onSuccess: () => {
      toast.success('Data iuran dihapus')
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setConfirmDelete(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Stats
  const stats = useMemo(() => {
    const items = data?.data || []
    const lunas = items.filter((i) => i.status === 'LUNAS')
    return {
      total: items.length,
      lunas: lunas.length,
      belum: items.length - lunas.length,
      totalDana: lunas.reduce((s, i) => s + i.jumlah, 0),
    }
  }, [data])

  const onSubmit = (form: HTMLFormElement) => {
    const fd = new FormData(form)
    createMut.mutate({
      wargaId: fd.get('wargaId'),
      bulan: Number(fd.get('bulan')),
      tahun: Number(fd.get('tahun')),
      jumlah: Number(fd.get('jumlah')),
      status: fd.get('status'),
      metode: fd.get('metode'),
      keterangan: fd.get('keterangan'),
    })
  }

  const onBulkSubmit = (form: HTMLFormElement) => {
    const fd = new FormData(form)
    createMut.mutate({
      bulk: true,
      bulan: Number(fd.get('bulan')),
      tahun: Number(fd.get('tahun')),
      jumlah: Number(fd.get('jumlah')),
    })
  }

  const onPay = (item: IuranItem, metode: string) => {
    updateMut.mutate({ id: item.id, status: 'LUNAS', metode })
  }

  const onUnpay = (item: IuranItem) => {
    updateMut.mutate({ id: item.id, status: 'BELUM_BAYAR' })
  }

  const accentMap = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
  }

  const tahunOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() + 1]

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                <Zap className="w-4 h-4 mr-2" /> Generate Massal
              </Button>
              <Button onClick={() => setOpenForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Input Manual
              </Button>
            </div>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Warga</p>
            <p className="text-xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sudah Bayar</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{stats.lunas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Belum Bayar</p>
            <p className="text-xl font-bold text-rose-600 mt-1">{stats.belum}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Terkumpul</p>
            <p className="text-xl font-bold mt-1">{formatRupiah(stats.totalDana)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Bulan</Label>
              <Select value={bulanFilter} onValueChange={setBulanFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NAMA_BULAN.map((n, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tahun</Label>
              <Select value={tahunFilter} onValueChange={setTahunFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tahunOptions.map((t) => (
                    <SelectItem key={t} value={String(t)}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="LUNAS">Lunas</SelectItem>
                  <SelectItem value="BELUM_BAYAR">Belum Bayar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isWarga && (
              <div className="space-y-1.5">
                <Label className="text-xs">Cari Warga</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Nama/NIK" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data?.data?.length ? (
            <EmptyState
              title="Belum ada data iuran"
              description={canManage ? `Gunakan "Generate Massal" untuk membuat tagihan otomatis untuk ${namaBulan(Number(bulanFilter))} ${tahunFilter}.` : 'Anda tidak memiliki tagihan iuran untuk periode ini.'}
              icon={Icon}
            />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warga</TableHead>
                    <TableHead className="hidden md:table-cell">Rumah</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Tgl Bayar</TableHead>
                    {canManage && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.warga.nama}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.warga.nik}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {item.warga.rumah ? (
                          <Badge variant="outline">Blok {item.warga.rumah.blok} / {item.warga.rumah.nomor}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">{formatRupiah(item.jumlah)}</TableCell>
                      <TableCell>
                        {item.status === 'LUNAS' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Lunas</Badge>
                        ) : (
                          <Badge variant="destructive">Belum Bayar</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {item.tanggalBayar ? formatTanggal(item.tanggalBayar) : '-'}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.status === 'BELUM_BAYAR' ? (
                              <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setPayItem(item)}>
                                <Check className="w-3.5 h-3.5 mr-1" /> Bayar
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-8 text-amber-600" onClick={() => onUnpay(item)}>
                                <X className="w-3.5 h-3.5 mr-1" /> Batal
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(item)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Tambah Manual */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input {title} Manual</DialogTitle>
            <DialogDescription>Tambahkan tagihan iuran untuk satu warga</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(e.currentTarget) }} className="space-y-4">
            <div className="space-y-2">
              <Label>Warga *</Label>
              <Select name="wargaId" required>
                <SelectTrigger><SelectValue placeholder="Pilih warga" /></SelectTrigger>
                <SelectContent>
                  {wargaData?.data?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.nama} — {w.rumah ? `Blok ${w.rumah.blok}/${w.rumah.nomor}` : 'No rumah'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <Label>Jumlah *</Label>
                <Input name="jumlah" type="number" defaultValue={defaultAmount} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue="BELUM_BAYAR">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BELUM_BAYAR">Belum Bayar</SelectItem>
                    <SelectItem value="LUNAS">Lunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metode</Label>
                <Select name="metode" defaultValue="TUNAI">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TUNAI">Tunai</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input name="keterangan" placeholder="Catatan tambahan..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Generate */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Massal {title}</DialogTitle>
            <DialogDescription>Buat tagihan iuran untuk semua warga aktif sekaligus</DialogDescription>
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
                <Label>Jumlah *</Label>
                <Input name="jumlah" type="number" defaultValue={defaultAmount} required />
              </div>
            </div>
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Sistem akan membuat tagihan untuk semua warga yang belum punya tagihan di periode tersebut. Warga yang sudah punya tagihan akan dilewati.
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createMut.isPending}>
                <Zap className="w-4 h-4 mr-2" />
                {createMut.isPending ? 'Generating...' : 'Generate Sekarang'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={!!payItem} onOpenChange={(o) => !o && setPayItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
            <DialogDescription>
              Tandai iuran {payItem?.warga.nama} sebagai LUNAS
            </DialogDescription>
          </DialogHeader>
          {payItem && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Periode</span><span className="font-medium">{namaBulan(payItem.bulan)} {payItem.tahun}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Jumlah</span><span className="font-bold">{formatRupiah(payItem.jumlah)}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Select
                  value={payMethod}
                  onValueChange={setPayMethod}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TUNAI">Tunai</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayItem(null)}>Batal</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={updateMut.isPending}
              onClick={() => payItem && onPay(payItem, payMethod)}
            >
              {updateMut.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" /> Konfirmasi Lunas</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Data Iuran</DialogTitle>
            <DialogDescription>
              Hapus tagihan {confirmDelete?.warga.nama} periode {confirmDelete && namaBulan(confirmDelete.bulan)} {confirmDelete?.tahun}? Riwayat pembayaran terkait juga akan dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}>
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
