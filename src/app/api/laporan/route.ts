import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewReports } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bulan = Number(searchParams.get('bulan')) || new Date().getMonth() + 1
  const tahun = Number(searchParams.get('tahun')) || new Date().getFullYear()

  // WARGA hanya bisa lihat laporannya sendiri (1 warga)
  if (session.role === 'WARGA') {
    const warga = await db.warga.findUnique({ where: { userId: session.id } })
    if (!warga) return NextResponse.json({ error: 'Data warga tidak ditemukan' }, { status: 404 })

    const [sampah, sosial, kurban] = await Promise.all([
      db.uangSampah.findFirst({ where: { wargaId: warga.id, bulan, tahun } }),
      db.uangSosial.findFirst({ where: { wargaId: warga.id, bulan, tahun } }),
      db.tabunganKurban.findFirst({ where: { wargaId: warga.id, bulan, tahun } }),
    ])

    const riwayat = await db.riwayatPembayaran.findMany({
      where: { wargaId: warga.id, bulan, tahun },
      orderBy: { tanggal: 'desc' },
    })

    const totalBayar = riwayat.reduce((s, r) => s + r.jumlah, 0)

    return NextResponse.json({
      periode: { bulan, tahun },
      warga,
      items: {
        sampah: sampah ? { jumlah: sampah.jumlah, status: sampah.status, tanggalBayar: sampah.tanggalBayar } : null,
        sosial: sosial ? { jumlah: sosial.jumlah, status: sosial.status, tanggalBayar: sosial.tanggalBayar } : null,
        kurban: kurban ? { jumlah: kurban.jumlah, status: kurban.status, tanggalBayar: kurban.tanggalBayar } : null,
      },
      riwayat,
      totalBayar,
    })
  }

  if (!canViewReports(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Laporan lengkap untuk bendahara/ketua/admin
  const [allSampah, allSosial, allKurban, kasBulan] = await Promise.all([
    db.uangSampah.findMany({
      where: { bulan, tahun },
      include: { warga: { select: { nama: true, nik: true, telepon: true, rumah: { select: { blok: true, nomor: true } } } } },
      orderBy: { warga: { nama: 'asc' } },
    }),
    db.uangSosial.findMany({
      where: { bulan, tahun },
      include: { warga: { select: { nama: true, nik: true, telepon: true, rumah: { select: { blok: true, nomor: true } } } } },
      orderBy: { warga: { nama: 'asc' } },
    }),
    db.tabunganKurban.findMany({
      where: { bulan, tahun },
      include: { warga: { select: { nama: true, nik: true, telepon: true, rumah: { select: { blok: true, nomor: true } } } } },
      orderBy: { warga: { nama: 'asc' } },
    }),
    db.kas.findMany({
      where: {
        tanggal: {
          gte: new Date(tahun, bulan - 1, 1),
          lt: new Date(tahun, bulan, 1),
        },
      },
      include: { bendahara: { select: { name: true } } },
      orderBy: { tanggal: 'desc' },
    }),
  ])

  const sampahLunas = allSampah.filter((s) => s.status === 'LUNAS')
  const sosialLunas = allSosial.filter((s) => s.status === 'LUNAS')
  const kurbanLunas = allKurban.filter((s) => s.status === 'LUNAS')

  const totalSampah = sampahLunas.reduce((s, x) => s + x.jumlah, 0)
  const totalSosial = sosialLunas.reduce((s, x) => s + x.jumlah, 0)
  const totalKurban = kurbanLunas.reduce((s, x) => s + x.jumlah, 0)

  const kasMasuk = kasBulan.filter((k) => k.jenis === 'MASUK').reduce((s, k) => s + k.jumlah, 0)
  const kasKeluar = kasBulan.filter((k) => k.jenis === 'KELUAR').reduce((s, k) => s + k.jumlah, 0)

  // Total saldo keseluruhan
  const [totalKasMasuk, totalKasKeluar] = await Promise.all([
    db.kas.aggregate({ where: { jenis: 'MASUK' }, _sum: { jumlah: true } }),
    db.kas.aggregate({ where: { jenis: 'KELUAR' }, _sum: { jumlah: true } }),
  ])
  const saldoKas = (totalKasMasuk._sum.jumlah || 0) - (totalKasKeluar._sum.jumlah || 0)

  const totalWarga = await db.warga.count()

  return NextResponse.json({
    periode: { bulan, tahun },
    totalWarga,
    sampah: {
      items: allSampah,
      total: totalSampah,
      lunas: sampahLunas.length,
      belumBayar: allSampah.length - sampahLunas.length,
    },
    sosial: {
      items: allSosial,
      total: totalSosial,
      lunas: sosialLunas.length,
      belumBayar: allSosial.length - sosialLunas.length,
    },
    kurban: {
      items: allKurban,
      total: totalKurban,
      lunas: kurbanLunas.length,
      belumBayar: allKurban.length - kurbanLunas.length,
    },
    kas: {
      items: kasBulan,
      masuk: kasMasuk,
      keluar: kasKeluar,
      saldoBulan: kasMasuk - kasKeluar,
      saldoTotal: saldoKas,
    },
    totalPemasukan: totalSampah + totalSosial + totalKurban + kasMasuk,
    totalPengeluaran: kasKeluar,
  })
}
