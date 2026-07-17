'use client'

import { useState } from 'react'
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
import {
  ArrowUpRight, ArrowDownRight, Plus, Pencil, Trash2, Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRupiah, formatTanggal, safeResJson } from '@/lib/format'

interface KasItem {
  id: string
  jenis: 'MASUK' | 'KELUAR'
  kategori: string
  jumlah: number
  keterangan: string | null
  tanggal: string
  bendahara: { name: string }
}

const KATEGORI_MASUK = ['Iuran Warga', 'Donasi', 'Bunga Bank', 'Lain-lain']
const KATEGORI_KELUAR = ['Pembelian', 'Perbaikan', 'Honor', 'Konsumsi', 'Kebersihan', 'Lain-lain']

export function KasView() {
  const qc = useQueryClient()
  const [jenisFilter, setJenisFilter] = useState('all')
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<KasItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<KasItem | null>(null)

  const { data, isLoading } = useQuery<{ data: KasItem[] }>({
    queryKey: ['kas', jenisFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (jenisFilter !== 'all') params.set('jenis', jenisFilter)
      const res = await fetch(`/api/kas?${params}`)
      const { ok, data, error } = await safeResJson(res)
      if (!ok) throw new Error(error || 'Gagal memuat kas')
      return data ?? {}
    },
  })

  const saveMut = useMutation({
    mutationFn: async (body: Record<string, unknown> & { id?: string }) => {
      const isEdit = !!body.id
      const res = await fetch('/api/kas', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const { ok, data: d, error } = await safeResJson(res)
      if (!ok) throw new Error(error || 'Gagal menyimpan')
      return d
    },
    onSuccess: () => {
      toast.success('Transaksi disimpan')
      qc.invalidateQueries({ queryKey: ['kas'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['laporan'] })
      setOpenForm(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/kas?id=${id}`, { method: 'DELETE' })
      const { ok, data: d, error } = await safeResJson(res)
      if (!ok) throw new Error(error || 'Gagal hapus')
      return d
    },
    onSuccess: () => {
      toast.success('Transaksi dihapus')
      qc.invalidateQueries({ queryKey: ['kas'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setConfirmDelete(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const stats = (data?.data || []).reduce(
    (acc, k) => {
      if (k.jenis === 'MASUK') acc.masuk += k.jumlah
      else acc.keluar += k.jumlah
      acc.saldo = acc.masuk - acc.keluar
      return acc
    },
    { masuk: 0, keluar: 0, saldo: 0 }
  )

  const onSubmit = (form: HTMLFormElement) => {
    const fd = new FormData(form)
    const body: Record<string, unknown> = {
      jenis: fd.get('jenis'),
      kategori: fd.get('kategori'),
      jumlah: Number(fd.get('jumlah')),
      keterangan: fd.get('keterangan'),
      tanggal: fd.get('tanggal'),
    }
    if (editing) body.id = editing.id
    saveMut.mutate(body)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kas Masuk & Keluar"
        description="Catat transaksi keuangan perumahan"
        actions={
          <Button onClick={() => { setEditing(null); setOpenForm(true) }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Transaksi
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pemasukan</p>
              <p className="text-xl font-bold text-emerald-700">{formatRupiah(stats.masuk)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
              <p className="text-xl font-bold text-rose-700">{formatRupiah(stats.keluar)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Kas</p>
              <p className="text-xl font-bold text-violet-700">{formatRupiah(stats.saldo)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={jenisFilter} onValueChange={setJenisFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter jenis" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Transaksi</SelectItem>
              <SelectItem value="MASUK">Kas Masuk</SelectItem>
              <SelectItem value="KELUAR">Kas Keluar</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data?.data?.length ? (
            <EmptyState title="Belum ada transaksi" description="Catat pemasukan atau pengeluaran kas." icon={Wallet} />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="hidden md:table-cell">Keterangan</TableHead>
                    <TableHead className="hidden lg:table-cell">Bendahara</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="text-sm whitespace-nowrap">{formatTanggal(k.tanggal)}</TableCell>
                      <TableCell>
                        {k.jenis === 'MASUK' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><ArrowUpRight className="w-3 h-3 mr-1" /> Masuk</Badge>
                        ) : (
                          <Badge variant="destructive"><ArrowDownRight className="w-3 h-3 mr-1" /> Keluar</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{k.kategori}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">{k.keterangan || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{k.bendahara?.name || '-'}</TableCell>
                      <TableCell className={`text-right font-bold whitespace-nowrap ${k.jenis === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {k.jenis === 'MASUK' ? '+' : '-'}{formatRupiah(k.jumlah)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(k); setOpenForm(true) }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(k)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Transaksi' : 'Tambah Transaksi Kas'}</DialogTitle>
            <DialogDescription>{editing ? 'Perbarui data transaksi' : 'Catat pemasukan atau pengeluaran baru'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(e.currentTarget) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jenis *</Label>
                <Select name="jenis" defaultValue={editing?.jenis || 'MASUK'} onValueChange={() => {}}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASUK">Kas Masuk</SelectItem>
                    <SelectItem value="KELUAR">Kas Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <KategoriSelect name="kategori" defaultValue={editing?.kategori} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jumlah (Rp) *</Label>
                <Input name="jumlah" type="number" defaultValue={editing?.jumlah} required min={1} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input name="tanggal" type="date" defaultValue={editing ? new Date(editing.tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input name="keterangan" defaultValue={editing?.keterangan || ''} placeholder="Catatan tambahan..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
              <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Transaksi</DialogTitle>
            <DialogDescription>Yakin hapus transaksi {confirmDelete?.kategori} sebesar {confirmDelete && formatRupiah(confirmDelete.jumlah)}?</DialogDescription>
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

function KategoriSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [jenis, setJenis] = useState<'MASUK' | 'KELUAR'>('MASUK')
  const list = jenis === 'MASUK' ? KATEGORI_MASUK : KATEGORI_KELUAR
  return (
    <div className="space-y-2">
      <Select onValueChange={(v) => setJenis(v as 'MASUK' | 'KELUAR')} defaultValue="MASUK">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="MASUK">Kas Masuk</SelectItem>
          <SelectItem value="KELUAR">Kas Keluar</SelectItem>
        </SelectContent>
      </Select>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
        <SelectContent>
          {list.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Pilih jenis dulu untuk filter kategori</p>
    </div>
  )
}
