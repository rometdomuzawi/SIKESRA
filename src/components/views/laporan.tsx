'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Printer, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useSession } from '@/hooks/use-session'
import { formatRupiah, formatTanggal, namaBulan, NAMA_BULAN, safeResJson } from '@/lib/format'

export function LaporanView() {
  const { data: session } = useSession()
  const isWarga = session?.user?.role === 'WARGA'
  const now = new Date()
  const [bulan, setBulan] = useState(String(now.getMonth() + 1))
  const [tahun, setTahun] = useState(String(now.getFullYear()))

  const { data, isLoading } = useQuery({
    queryKey: ['laporan', bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/laporan?bulan=${bulan}&tahun=${tahun}`)
      const { ok, data, error } = await safeResJson(res)
      if (!ok) throw new Error(error || 'Gagal memuat laporan')
      return data ?? {}
    },
  })

  const handlePrint = () => {
    window.print()
  }

  const tahunOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader
          title="Laporan Bulanan"
          description={isWarga ? 'Laporan iuran dan pembayaran Anda' : 'Laporan keuangan & iuran perumahan'}
          actions={
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Cetak PDF
            </Button>
          }
        />
      </div>

      {/* Filter - hidden on print */}
      <Card className="no-print">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Bulan</Label>
              <Select value={bulan} onValueChange={setBulan}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NAMA_BULAN.map((n, i) => <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tahun</Label>
              <Select value={tahun} onValueChange={setTahun}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tahunOptions.map((t) => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : isWarga ? (
        <WargaLaporan data={data} />
      ) : (
        <FullLaporan data={data} bulan={Number(bulan)} tahun={Number(tahun)} />
      )}
    </div>
  )
}

function WargaLaporan({ data }: { data: { periode: { bulan: number; tahun: number }; warga: { nama: string; nik: string; alamat: string | null; rumah: { blok: string; nomor: string } | null }; items: { sampah: { jumlah: number; status: string } | null; sosial: { jumlah: number; status: string } | null }; riwayat: Array<{ id: string; jenis: string; bulan: number; tahun: number; jumlah: number; tanggal: string; metode: string | null }>; totalBayar: number } }) {
  const p = data.periode
  const w = data.warga
  const i = data.items

  return (
    <Card className="print-page">
      <CardContent className="p-6 lg:p-8">
        <div className="text-center mb-6 pb-4 border-b">
          <h1 className="text-xl font-bold">LAPORAN IURAN BULANAN</h1>
          <p className="text-sm text-muted-foreground">Perumahan Griya Asri</p>
          <p className="text-sm">Periode: {namaBulan(p.bulan)} {p.tahun}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Nama Warga</div>
            <div className="font-semibold">{w.nama}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">NIK</div>
            <div className="font-mono">{w.nik}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Rumah</div>
            <div>{w.rumah ? `Blok ${w.rumah.blok} / No. ${w.rumah.nomor}` : '-'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Alamat</div>
            <div>{w.alamat || '-'}</div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jenis Iuran</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Iuran Sampah</TableCell>
              <TableCell className="text-right">{i.sampah ? formatRupiah(i.sampah.jumlah) : '-'}</TableCell>
              <TableCell className="text-center">
                {i.sampah ? (
                  <Badge variant={i.sampah.status === 'LUNAS' ? 'default' : 'destructive'}>{i.sampah.status === 'LUNAS' ? 'Lunas' : 'Belum Bayar'}</Badge>
                ) : <span className="text-muted-foreground">-</span>}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Iuran Sosial</TableCell>
              <TableCell className="text-right">{i.sosial ? formatRupiah(i.sosial.jumlah) : '-'}</TableCell>
              <TableCell className="text-center">
                {i.sosial ? (
                  <Badge variant={i.sosial.status === 'LUNAS' ? 'default' : 'destructive'}>{i.sosial.status === 'LUNAS' ? 'Lunas' : 'Belum Bayar'}</Badge>
                ) : <span className="text-muted-foreground">-</span>}
              </TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-bold">Total Dibayar</TableCell>
              <TableCell className="text-right font-bold text-emerald-600">{formatRupiah(data.totalBayar)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>

        {data.riwayat.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2 text-sm">Detail Riwayat Pembayaran</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.riwayat.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{formatTanggal(r.tanggal)}</TableCell>
                    <TableCell className="text-sm">{r.jenis === 'SAMPAH' ? 'Iuran Sampah' : 'Iuran Sosial'}</TableCell>
                    <TableCell className="text-sm">{r.metode || '-'}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatRupiah(r.jumlah)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-muted-foreground mb-12">Dibuat oleh,</p>
            <div className="border-t pt-1">Sistem SIKESRA</div>
          </div>
          <div>
            <p className="text-muted-foreground mb-12">Mengetahui,</p>
            <div className="border-t pt-1">Ketua RW / Pengurus</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FullLaporan({ data, bulan, tahun }: { data: { periode: { bulan: number; tahun: number }; totalWarga: number; sampah: { items: Array<{ jumlah: number; status: string; warga: { nama: string; nik: string; rumah: { blok: string; nomor: string } | null } }>; total: number; lunas: number; belumBayar: number }; sosial: { items: Array<{ jumlah: number; status: string; warga: { nama: string; nik: string; rumah: { blok: string; nomor: string } | null } }>; total: number; lunas: number; belumBayar: number }; kas: { items: Array<{ id: string; jenis: string; kategori: string; jumlah: number; keterangan: string | null; tanggal: string; bendahara: { name: string } }>; masuk: number; keluar: number; saldoBulan: number; saldoTotal: number }; totalPemasukan: number; totalPengeluaran: number }; bulan: number; tahun: number }) {
  return (
    <div className="space-y-4 print-page">
      <Card>
        <CardContent className="p-6 lg:p-8">
          <div className="text-center mb-6 pb-4 border-b">
            <h1 className="text-2xl font-bold">LAPORAN KEUANGAN & SOSIAL BULANAN</h1>
            <p className="text-sm text-muted-foreground mt-1">Perumahan Griya Asri</p>
            <p className="text-base mt-1">Periode: {namaBulan(bulan)} {tahun}</p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <SummaryBox label="Total Warga" value={String(data.totalWarga)} />
            <SummaryBox label="Pemasukan" value={formatRupiah(data.totalPemasukan)} color="emerald" />
            <SummaryBox label="Pengeluaran" value={formatRupiah(data.totalPengeluaran)} color="rose" />
            <SummaryBox label="Saldo Kas" value={formatRupiah(data.kas.saldoTotal)} color="violet" />
          </div>

          {/* Iuran Summary */}
          <h2 className="font-bold text-base mb-2 mt-6">A. Ringkasan Iuran Warga</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jenis Iuran</TableHead>
                <TableHead className="text-center">Lunas</TableHead>
                <TableHead className="text-center">Belum Bayar</TableHead>
                <TableHead className="text-right">Total Terkumpul</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Iuran Sampah</TableCell>
                <TableCell className="text-center text-emerald-600 font-medium">{data.sampah.lunas}</TableCell>
                <TableCell className="text-center text-rose-600 font-medium">{data.sampah.belumBayar}</TableCell>
                <TableCell className="text-right font-bold">{formatRupiah(data.sampah.total)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Iuran Sosial</TableCell>
                <TableCell className="text-center text-emerald-600 font-medium">{data.sosial.lunas}</TableCell>
                <TableCell className="text-center text-rose-600 font-medium">{data.sosial.belumBayar}</TableCell>
                <TableCell className="text-right font-bold">{formatRupiah(data.sosial.total)}</TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-bold" colSpan={3}>Total Iuran</TableCell>
                <TableCell className="text-right font-bold text-emerald-700">{formatRupiah(data.sampah.total + data.sosial.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Kas */}
          <h2 className="font-bold text-base mb-2 mt-6">B. Ringkasan Kas Bulan Ini</h2>
          <div className="grid grid-cols-3 gap-3">
            <SummaryBox label="Kas Masuk" value={formatRupiah(data.kas.masuk)} color="emerald" />
            <SummaryBox label="Kas Keluar" value={formatRupiah(data.kas.keluar)} color="rose" />
            <SummaryBox label="Selisih Bulan Ini" value={formatRupiah(data.kas.saldoBulan)} color="violet" />
          </div>

          {/* Detail Kas */}
          {data.kas.items.length > 0 && (
            <>
              <h2 className="font-bold text-base mb-2 mt-6">C. Detail Transaksi Kas</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="hidden md:table-cell">Keterangan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.kas.items.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="text-sm whitespace-nowrap">{formatTanggal(k.tanggal)}</TableCell>
                      <TableCell>
                        <Badge variant={k.jenis === 'MASUK' ? 'default' : 'destructive'} className="text-xs">
                          {k.jenis === 'MASUK' ? 'Masuk' : 'Keluar'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{k.kategori}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{k.keterangan || '-'}</TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${k.jenis === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {k.jenis === 'MASUK' ? '+' : '-'}{formatRupiah(k.jumlah)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail per warga - separate page */}
      <Card className="break-before-page">
        <CardContent className="p-6 lg:p-8">
          <h2 className="font-bold text-base mb-3">D. Detail Iuran per Warga — {namaBulan(bulan)} {tahun}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Rumah</TableHead>
                <TableHead className="text-center">Sampah</TableHead>
                <TableHead className="text-center">Sosial</TableHead>
                <TableHead className="text-right">Total Bayar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sampah.items.map((s, idx) => {
                const sos = data.sosial.items.find((x) => x.warga.nik === s.warga.nik)
                const total = (s.status === 'LUNAS' ? s.jumlah : 0) + (sos?.status === 'LUNAS' ? sos.jumlah : 0)
                return (
                  <TableRow key={s.warga.nik}>
                    <TableCell className="text-sm">{idx + 1}</TableCell>
                    <TableCell className="text-sm font-medium">{s.warga.nama}</TableCell>
                    <TableCell className="text-sm">{s.warga.rumah ? `${s.warga.rumah.blok}/${s.warga.rumah.nomor}` : '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.status === 'LUNAS' ? 'default' : 'destructive'} className="text-xs">
                        {s.status === 'LUNAS' ? '✓' : '✗'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {sos ? <Badge variant={sos.status === 'LUNAS' ? 'default' : 'destructive'} className="text-xs">{sos.status === 'LUNAS' ? '✓' : '✗'}</Badge> : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatRupiah(total)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground mb-12">Bendahara,</p>
              <div className="border-t pt-1 font-medium">______________________</div>
            </div>
            <div>
              <p className="text-muted-foreground mb-12">Mengetahui, Ketua RW</p>
              <div className="border-t pt-1 font-medium">______________________</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryBox({ label, value, color }: { label: string; value: string; color?: 'emerald' | 'rose' | 'violet' }) {
  const colorMap = {
    emerald: 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700',
    rose: 'border-rose-200 bg-rose-50/50 dark:bg-rose-900/10 text-rose-700',
    violet: 'border-violet-200 bg-violet-50/50 dark:bg-violet-900/10 text-violet-700',
  }
  return (
    <div className={`rounded-lg border p-3 ${color ? colorMap[color] : ''}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  )
}
