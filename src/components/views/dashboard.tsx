'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/hooks/use-session'
import { StatCard, PageHeader, SectionCard, EmptyState } from '@/components/ui-bits'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Users, Home, Wallet, TrendingUp, Bell, Trash2, Heart,
  ArrowUpRight, ArrowDownRight, MessageCircle, FileText,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'
import { formatRupiah, formatTanggal, namaBulan, NAMA_BULAN_SINGKAT } from '@/lib/format'
import { useApp } from '@/lib/store'

export function DashboardView() {
  const { data: sessionData } = useSession()
  const user = sessionData?.user
  const { setPage } = useApp()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Gagal memuat dashboard')
      return res.json()
    },
  })

  if (!user) return null

  if (user.role === 'WARGA') {
    return <WargaDashboard />
  }

  const stats = data?.stats
  const periode = data?.periode

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={periode ? `Periode ${namaBulan(periode.bulan)} ${periode.tahun}` : 'Memuat...'}
        actions={
          <Button onClick={() => setPage('laporan')} variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" /> Lihat Laporan
          </Button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Warga" value={stats?.totalWarga?.toString() || '0'} description="Warga terdaftar" icon={Users} color="emerald" loading={isLoading} />
        <StatCard title="Total Rumah" value={stats?.totalRumah?.toString() || '0'} description="Unit rumah" icon={Home} color="sky" loading={isLoading} />
        <StatCard title="Saldo Kas" value={stats ? formatRupiah(stats.saldoKas) : '...'} description="Saldo keseluruhan" icon={Wallet} color="violet" loading={isLoading} />
        <StatCard title="Pemasukan Bulan Ini" value={stats ? formatRupiah(stats.pemasukanBulan) : '...'} description={periode ? namaBulan(periode.bulan) : ''} icon={TrendingUp} color="amber" loading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tren Pemasukan vs Pengeluaran</CardTitle>
            <CardDescription>6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data?.trendData || []}>
                  <defs>
                    <linearGradient id="gMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gKeluar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="pemasukan" name="Pemasukan" stroke="#10b981" strokeWidth={2} fill="url(#gMasuk)" />
                  <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#f43f5e" strokeWidth={2} fill="url(#gKeluar)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Pembayaran</CardTitle>
            <CardDescription>{periode ? `${namaBulan(periode.bulan)} ${periode.tahun}` : ''}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={data?.distribusi?.map((d: { name: string; value: number; total: number }) => ({ name: d.name, value: d.value, total: d.total })) || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip
                      formatter={(v: number, _n, p) => {
                        const total = (p?.payload as { total: number })?.total || 0
                        return [`${v} dari ${total} warga`, '']
                      }}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {data?.distribusi?.map((d: { name: string; value: number; total: number }, i: number) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: ['#10b981', '#f59e0b', '#8b5cf6'][i] }} />
                        <span>{d.name}</span>
                      </div>
                      <span className="font-medium">{d.value}/{d.total}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Pembayaran Bulan Ini</CardTitle>
            <CardDescription>Status iuran warga</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <>
                <PembayaranRow icon={Trash2} label="Iuran Sampah" data={data?.pembayaranBulan?.sampah} color="emerald" onClick={() => setPage('sampah')} />
                <PembayaranRow icon={Heart} label="Iuran Sosial" data={data?.pembayaranBulan?.sosial} color="rose" onClick={() => setPage('sosial')} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Transaksi Kas Terbaru</CardTitle>
              <CardDescription>5 transaksi terakhir</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPage('kas')}>Lihat</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.kasTerbaru?.length === 0 ? (
              <EmptyState title="Belum ada transaksi" icon={Wallet} />
            ) : (
              data?.kasTerbaru?.map((k: { id: string; jenis: string; kategori: string; jumlah: number; tanggal: string }) => (
                <div key={k.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${k.jenis === 'MASUK' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {k.jenis === 'MASUK' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{k.kategori}</div>
                    <div className="text-xs text-muted-foreground">{formatTanggal(k.tanggal)}</div>
                  </div>
                  <div className={`text-sm font-semibold whitespace-nowrap ${k.jenis === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {k.jenis === 'MASUK' ? '+' : '-'}{formatRupiah(k.jumlah)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {stats?.notifPending > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">{stats.notifPending} notifikasi WhatsApp menunggu dikirim</div>
                <div className="text-xs text-muted-foreground">Pengingat pembayaran iuran untuk warga</div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPage('notifikasi')}>
              <MessageCircle className="w-4 h-4 mr-2" /> Kelola Notifikasi
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PembayaranRow({ icon: Icon, label, data, color, onClick }: { icon: typeof Trash2; label: string; data?: { lunas: number; total: number }; color: 'emerald' | 'rose'; onClick: () => void }) {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  }
  const pct = data && data.total > 0 ? (data.lunas / data.total) * 100 : 0
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-md border hover:bg-accent/50 transition-colors text-left">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{data ? `${data.lunas}/${data.total} warga` : '...'}</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>
      <Badge variant={pct === 100 ? 'default' : 'secondary'} className="text-xs">{Math.round(pct)}%</Badge>
    </button>
  )
}

function WargaDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-warga'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Gagal memuat')
      return res.json()
    },
  })
  const { setPage } = useApp()

  const warga = data?.warga
  const periode = data?.periode
  const bulanIni = data?.bulanIni

  return (
    <div className="space-y-5">
      <PageHeader title={`Halo, ${warga?.nama?.split(' ')[0] || 'Warga'} 👋`} description={periode ? `Periode ${namaBulan(periode.bulan)} ${periode.tahun}` : 'Memuat...'} />

      <div>
        <h3 className="font-semibold mb-3">Status Iuran Bulan Ini</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <IuranCard icon={Trash2} label="Iuran Sampah" data={bulanIni?.sampah} defaultAmount={30000} onClick={() => setPage('sampah')} />
          <IuranCard icon={Heart} label="Iuran Sosial" data={bulanIni?.sosial} defaultAmount={50000} onClick={() => setPage('sosial')} />
        </div>
      </div>

      {/* Saldo Kas + Statistik */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-primary-foreground/80">Saldo Kas Perumahan</p>
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : formatRupiah(data?.kas?.saldo ?? 0)}
            </p>
            <p className="text-xs text-primary-foreground/70 mt-1">Total saldo keseluruhan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Kas Masuk</p>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {isLoading ? '...' : formatRupiah(data?.kas?.totalMasuk ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Akumulasi pemasukan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Kas Keluar</p>
              <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-600">
              {isLoading ? '...' : formatRupiah(data?.kas?.totalKeluar ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Akumulasi pengeluaran</p>
          </CardContent>
        </Card>
      </div>

      {/* List Transaksi Kas Terbaru */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaksi Kas Terbaru</CardTitle>
          <CardDescription>5 transaksi terakhir perumahan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.kas?.transaksiTerbaru?.length ? (
            <EmptyState title="Belum ada transaksi" description="Transaksi kas perumahan akan muncul di sini." icon={Wallet} />
          ) : (
            data?.kas?.transaksiTerbaru?.map((k: { id: string; jenis: string; kategori: string; jumlah: number; keterangan: string | null; tanggal: string }) => (
              <div key={k.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                  k.jenis === 'MASUK' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {k.jenis === 'MASUK' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{k.kategori}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTanggal(k.tanggal)}
                    {k.keterangan && <span className="hidden sm:inline"> · {k.keterangan}</span>}
                  </div>
                </div>
                <div className={`text-sm font-semibold whitespace-nowrap ${
                  k.jenis === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {k.jenis === 'MASUK' ? '+' : '-'}{formatRupiah(k.jumlah)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Riwayat Pembayaran Terbaru</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setPage('riwayat')}>Lihat Semua</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.riwayatTerbaru?.length === 0 ? (
            <EmptyState title="Belum ada pembayaran" description="Riwayat pembayaran Anda akan muncul di sini." icon={Wallet} />
          ) : (
            data?.riwayatTerbaru?.map((r: { id: string; jenis: string; bulan: number; tahun: number; jumlah: number; tanggal: string }) => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50">
                <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {r.jenis === 'SAMPAH' ? 'Iuran Sampah' : 'Iuran Sosial'} — {NAMA_BULAN_SINGKAT[r.bulan - 1]} {r.tahun}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatTanggal(r.tanggal)}</div>
                </div>
                <div className="text-sm font-semibold text-emerald-600 whitespace-nowrap">+{formatRupiah(r.jumlah)}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function IuranCard({ icon: Icon, label, data, defaultAmount, onClick }: { icon: typeof Trash2; label: string; data?: { jumlah: number; status: string; tanggalBayar: string | null }; defaultAmount: number; onClick: () => void }) {
  const isLunas = data?.status === 'LUNAS'
  const jumlah = data?.jumlah || defaultAmount
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Icon className="w-5 h-5 text-accent-foreground" />
          </div>
          <Badge variant={isLunas ? 'default' : 'destructive'} className="text-[10px]">{isLunas ? 'Lunas' : 'Belum Bayar'}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{formatRupiah(jumlah)}</p>
        {data?.tanggalBayar && <p className="text-[10px] text-muted-foreground mt-1">Dibayar {formatTanggal(data.tanggalBayar)}</p>}
      </CardContent>
    </Card>
  )
}
