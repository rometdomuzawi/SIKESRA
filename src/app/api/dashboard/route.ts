import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { KasJenis, PaymentStatus } from '@prisma/client'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const tahun = now.getFullYear()
  const bulan = now.getMonth() + 1

  // WARGA: dashboard sederhana untuk dirinya sendiri
  if (session.role === 'WARGA') {
    const warga = await db.warga.findUnique({ where: { userId: session.id } })
    if (!warga) return NextResponse.json({ error: 'Data warga tidak ditemukan' }, { status: 404 })

    const [sampah, sosial, riwayat, kasMasukAgg, kasKeluarAgg, kasTerbaru] = await Promise.all([
      db.uangSampah.findMany({ where: { wargaId: warga.id }, orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }] }),
      db.uangSosial.findMany({ where: { wargaId: warga.id }, orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }] }),
      db.riwayatPembayaran.findMany({
        where: { wargaId: warga.id },
        orderBy: { tanggal: 'desc' },
        take: 5,
      }),
      // Saldo kas perumahan (keseluruhan)
      db.kas.aggregate({ where: { jenis: KasJenis.MASUK }, _sum: { jumlah: true } }),
      db.kas.aggregate({ where: { jenis: KasJenis.KELUAR }, _sum: { jumlah: true } }),
      // 5 transaksi kas terbaru (untuk warga lihat transparansi keuangan)
      db.kas.findMany({
        orderBy: { tanggal: 'desc' },
        take: 5,
      }),
    ])

    const saldoKas = (kasMasukAgg._sum.jumlah || 0) - (kasKeluarAgg._sum.jumlah || 0)
    const totalKasMasuk = kasMasukAgg._sum.jumlah || 0
    const totalKasKeluar = kasKeluarAgg._sum.jumlah || 0

    const sampahBulan = sampah.find((s) => s.bulan === bulan && s.tahun === tahun)
    const sosialBulan = sosial.find((s) => s.bulan === bulan && s.tahun === tahun)

    return NextResponse.json({
      warga,
      periode: { bulan, tahun },
      bulanIni: {
        sampah: sampahBulan,
        sosial: sosialBulan,
      },
      riwayatTerbaru: riwayat,
      totalRiwayat: await db.riwayatPembayaran.count({ where: { wargaId: warga.id } }),
      // Data kas untuk transparansi keuangan
      kas: {
        saldo: saldoKas,
        totalMasuk: totalKasMasuk,
        totalKeluar: totalKasKeluar,
        transaksiTerbaru: kasTerbaru,
      },
    })
  }

  // ADMIN/BENDAHARA/KETUA: dashboard lengkap
  const [totalWarga, totalRumah, kasMasukAgg, kasKeluarAgg] = await Promise.all([
    db.warga.count(),
    db.rumah.count(),
    db.kas.aggregate({ where: { jenis: KasJenis.MASUK }, _sum: { jumlah: true } }),
    db.kas.aggregate({ where: { jenis: KasJenis.KELUAR }, _sum: { jumlah: true } }),
  ])

  const saldoKas = (kasMasukAgg._sum.jumlah || 0) - (kasKeluarAgg._sum.jumlah || 0)

  // Status pembayaran bulan ini
  const [sampahBulan, sosialBulan] = await Promise.all([
    db.uangSampah.findMany({ where: { bulan, tahun } }),
    db.uangSosial.findMany({ where: { bulan, tahun } }),
  ])

  const pemasukanBulan =
    sampahBulan.filter((s) => s.status === PaymentStatus.LUNAS).reduce((s, x) => s + x.jumlah, 0) +
    sosialBulan.filter((s) => s.status === PaymentStatus.LUNAS).reduce((s, x) => s + x.jumlah, 0)

  // Grafik 6 bulan terakhir
  const trendData: Array<{ bulan: string; pemasukan: number; pengeluaran: number }> = []
  for (let i = 5; i >= 0; i--) {
    const b = bulan - i <= 0 ? bulan - i + 12 : bulan - i
    const t = bulan - i <= 0 ? tahun - 1 : tahun
    const namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][b - 1]

    const [smp, sos] = await Promise.all([
      db.uangSampah.findMany({ where: { bulan: b, tahun: t, status: PaymentStatus.LUNAS } }),
      db.uangSosial.findMany({ where: { bulan: b, tahun: t, status: PaymentStatus.LUNAS } }),
    ])
    const pemasukan = smp.reduce((s, x) => s + x.jumlah, 0) + sos.reduce((s, x) => s + x.jumlah, 0)

    const kasBulan = await db.kas.findMany({ where: { tanggal: { gte: new Date(t, b - 1, 1), lt: new Date(t, b, 1) } } })
    const pengeluaran = kasBulan.filter((k) => k.jenis === KasJenis.KELUAR).reduce((s, k) => s + k.jumlah, 0)

    trendData.push({ bulan: `${namaBulan} ${t}`, pemasukan, pengeluaran })
  }

  // Distribusi pembayaran by jenis
  const distribusi = [
    { name: 'Iuran Sampah', value: sampahBulan.filter((s) => s.status === PaymentStatus.LUNAS).length, total: sampahBulan.length },
    { name: 'Iuran Sosial', value: sosialBulan.filter((s) => s.status === PaymentStatus.LUNAS).length, total: sosialBulan.length },
  ]

  // Transaksi kas terbaru
  const kasTerbaru = await db.kas.findMany({
    include: { bendahara: { select: { name: true } } },
    orderBy: { tanggal: 'desc' },
    take: 5,
  })

  // Notifikasi pending
  const notifPending = await db.notifikasi.count({ where: { status: 'PENDING' } })

  return NextResponse.json({
    periode: { bulan, tahun },
    stats: {
      totalWarga,
      totalRumah,
      saldoKas,
      pemasukanBulan,
      notifPending,
    },
    pembayaranBulan: {
      sampah: { lunas: sampahBulan.filter((s) => s.status === PaymentStatus.LUNAS).length, total: sampahBulan.length },
      sosial: { lunas: sosialBulan.filter((s) => s.status === PaymentStatus.LUNAS).length, total: sosialBulan.length },
    },
    trendData,
    distribusi,
    kasTerbaru,
  })
}
