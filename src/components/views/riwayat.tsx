'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { History, Search, ArrowUpRight, Calendar, Wallet } from 'lucide-react'
import { useSession } from '@/hooks/use-session'
import { formatRupiah, formatTanggal, NAMA_BULAN, namaBulan, NAMA_BULAN_SINGKAT } from '@/lib/format'

export function RiwayatView() {
  const { data: session } = useSession()
  const isWarga = session?.user?.role === 'WARGA'
  const [jenisFilter, setJenisFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const params = new URLSearchParams()
  if (jenisFilter !== 'all') params.set('jenis', jenisFilter)
  if (search) params.set('wargaId', search) // for admin: filter by warga id search
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  const { data, isLoading } = useQuery({
    queryKey: ['riwayat', jenisFilter, search, from, to],
    queryFn: async () => {
      const res = await fetch(`/api/riwayat?${params}`)
      if (!res.ok) throw new Error('Gagal memuat riwayat')
      return res.json()
    },
  })

  const total = data?.total || 0
  const items = data?.data || []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Riwayat Pembayaran"
        description={isWarga ? 'Histori pembayaran iuran Anda' : 'Semua transaksi pembayaran iuran warga'}
      />

      <Card>
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Jenis Iuran</Label>
              <Select value={jenisFilter} onValueChange={setJenisFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="SAMPAH">Iuran Sampah</SelectItem>
                  <SelectItem value="SOSIAL">Iuran Sosial</SelectItem>
                  <SelectItem value="KURBAN">Tabungan Kurban</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            {!isWarga && (
              <div className="space-y-1.5">
                <Label className="text-xs">Cari Warga</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="ID warga (cek di Data Warga)" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 bg-emerald-50/50 dark:bg-emerald-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Pembayaran (sesuai filter)</div>
              <div className="text-xl font-bold text-emerald-700">{formatRupiah(total)}</div>
            </div>
          </div>
          <Badge variant="outline">{items.length} transaksi</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !items.length ? (
            <EmptyState title="Belum ada riwayat" description="Riwayat pembayaran akan muncul di sini setelah ada iuran yang ditandai lunas." icon={History} />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    {!isWarga && <TableHead>Warga</TableHead>}
                    <TableHead>Jenis</TableHead>
                    <TableHead className="hidden md:table-cell">Periode</TableHead>
                    <TableHead className="hidden lg:table-cell">Metode</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r: { id: string; tanggal: string; warga: { nama: string; nik: string; rumah: { blok: string; nomor: string } | null }; jenis: string; bulan: number; tahun: number; jumlah: number; metode: string | null }) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {formatTanggal(r.tanggal)}
                        </div>
                      </TableCell>
                      {!isWarga && (
                        <TableCell>
                          <div className="font-medium text-sm">{r.warga.nama}</div>
                          {r.warga.rumah && (
                            <div className="text-xs text-muted-foreground">Blok {r.warga.rumah.blok} / {r.warga.rumah.nomor}</div>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {r.jenis === 'SAMPAH' ? 'Sampah' : r.jenis === 'SOSIAL' ? 'Sosial' : 'Kurban'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{NAMA_BULAN_SINGKAT[r.bulan - 1]} {r.tahun}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{r.metode || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {formatRupiah(r.jumlah)}
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
    </div>
  )
}
