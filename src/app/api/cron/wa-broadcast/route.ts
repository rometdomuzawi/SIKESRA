import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendWhatsApp, isWhatsAppConfigured } from '@/lib/wa-provider'
import { PaymentStatus } from '@prisma/client'

/**
 * Vercel Cron — kirim pengingat WhatsApp otomatis untuk iuran BELUM_BAYAR
 *
 * Schedule (di vercel.json): setiap hari jam 8 pagi WIB (UTC 01:00)
 *   "0 1 * * *"
 *
 * Cron ini akan:
 * 1. Cari semua notifikasi berstatus PENDING
 * 2. Kirim via WhatsApp provider (Fonnte/Twilio)
 * 3. Update status jadi TERKIRIM atau GAGAL
 * 4. Auto-generate notifikasi untuk warga yang belum bayar di bulan berjalan
 *    jika belum ada notifikasi untuk mereka
 *
 * Security: gunakan CRON_SECRET env var untuk auth
 */

const NAMA_JENIS: Record<string, string> = {
  SAMPAH: 'Iuran Sampah',
  SOSIAL: 'Iuran Sosial',
  KURBAN: 'Tabungan Kurban',
  UMUM: 'Notifikasi',
}

export async function GET(req: NextRequest) {
  // Auth via secret header atau query
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret')

  if (secret && authHeader !== `Bearer ${secret}` && querySecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({
      ok: false,
      error: 'WhatsApp provider tidak terkonfigurasi. Set WA_PROVIDER=fonnte atau twilio dengan credential.',
    }, { status: 400 })
  }

  const now = new Date()
  const bulan = now.getMonth() + 1
  const tahun = now.getFullYear()

  console.log(`[CRON] Memulai broadcast WA untuk ${bulan}/${tahun}`)

  // 1. Auto-generate notifikasi PENDING untuk warga yang belum bayar bulan ini
  //    jika belum ada notifikasi untuk jenis/bulan/tahun tersebut
  const jenisList = ['SAMPAH', 'SOSIAL', 'KURBAN'] as const
  let autoCreated = 0

  for (const jenis of jenisList) {
    let belumbayar: Array<{ wargaId: string; jumlah: number }> = []

    if (jenis === 'SAMPAH') {
      belumbayar = await db.uangSampah.findMany({
        where: { bulan, tahun, status: PaymentStatus.BELUM_BAYAR },
        select: { wargaId: true, jumlah: true },
      })
    } else if (jenis === 'SOSIAL') {
      belumbayar = await db.uangSosial.findMany({
        where: { bulan, tahun, status: PaymentStatus.BELUM_BAYAR },
        select: { wargaId: true, jumlah: true },
      })
    } else if (jenis === 'KURBAN') {
      belumbayar = await db.tabunganKurban.findMany({
        where: { bulan, tahun, status: PaymentStatus.BELUM_BAYAR },
        select: { wargaId: true, jumlah: true },
      })
    }

    for (const b of belumbayar) {
      const warga = await db.warga.findUnique({ where: { id: b.wargaId } })
      if (!warga || !warga.telepon) continue

      // Skip jika sudah ada notifikasi PENDING/TERKIRIM untuk kombinasi yang sama hari ini
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const existing = await db.notifikasi.findFirst({
        where: {
          wargaId: b.wargaId,
          jenis,
          createdAt: { gte: todayStart },
        },
      })
      if (existing) continue

      const pesan = `Yth. ${warga.nama},\n\nPengingat pembayaran ${NAMA_JENIS[jenis]} periode ${bulan}/${tahun} sebesar Rp ${b.jumlah.toLocaleString('id-ID')}.\n\nMohon segera lakukan pembayaran ke Bendahara. Terima kasih.\n- Pengurus Perumahan Griya Asri`

      await db.notifikasi.create({
        data: {
          wargaId: b.wargaId,
          jenis,
          pesan,
          status: 'PENDING',
        },
      })
      autoCreated++
    }
  }

  console.log(`[CRON] Auto-created ${autoCreated} notifikasi baru`)

  // 2. Kirim semua notifikasi PENDING (limit 50 per run untuk avoid timeout)
  const pendingNotifs = await db.notifikasi.findMany({
    where: { status: 'PENDING' },
    include: { warga: { select: { nama: true, telepon: true } } },
    take: 50,
    orderBy: { createdAt: 'asc' },
  })

  let terkirim = 0
  let gagal = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const n of pendingNotifs) {
    if (!n.warga.telepon) {
      await db.notifikasi.update({
        where: { id: n.id },
        data: { status: 'GAGAL' },
      })
      gagal++
      errors.push({ id: n.id, error: 'No telepon warga kosong' })
      continue
    }

    const result = await sendWhatsApp(n.warga.telepon, n.pesan)

    if (result.ok) {
      await db.notifikasi.update({
        where: { id: n.id },
        data: { status: 'TERKIRIM', tanggalKirim: new Date() },
      })
      terkirim++
    } else {
      await db.notifikasi.update({
        where: { id: n.id },
        data: { status: 'GAGAL' },
      })
      gagal++
      errors.push({ id: n.id, error: result.error || 'Unknown error' })
    }

    // Rate limit: tunggu 500ms antar pengiriman
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`[CRON] Selesai. Terkirim: ${terkirim}, Gagal: ${gagal}`)

  return NextResponse.json({
    ok: true,
    periode: { bulan, tahun },
    autoCreated,
    processed: pendingNotifs.length,
    terkirim,
    gagal,
    errors: errors.slice(0, 10), // limit error log
  })
}
