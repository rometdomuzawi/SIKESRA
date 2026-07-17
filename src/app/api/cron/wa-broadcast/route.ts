import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  sendWhatsApp,
  isWhatsAppConfigured,
  getWaConfig,
  renderTemplate,
  NAMA_JENIS,
  DEFAULT_TEMPLATES,
} from '@/lib/wa-provider'
import { PaymentStatus } from '@prisma/client'
import { namaBulan, formatRupiah } from '@/lib/format'

/**
 * Vercel Cron — kirim pengingat WhatsApp otomatis untuk iuran BELUM_BAYAR
 *
 * Schedule (di vercel.json): setiap hari jam 8 pagi WIB (UTC 01:00)
 *   "0 1 * * *"
 *
 * Cron ini akan:
 * 1. Auto-generate notifikasi untuk warga yang belum bayar di bulan berjalan
 *    (gunakan template pesan dari Pengaturan)
 * 2. Kirim semua notifikasi PENDING via WhatsApp provider (Fonnte/Twilio)
 * 3. Update status jadi TERKIRIM atau GAGAL dengan error message
 * 4. Simpan providerId untuk webhook matching
 *
 * Security: gunakan CRON_SECRET env var untuk auth
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret')

  if (secret && authHeader !== `Bearer ${secret}` && querySecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const configured = await isWhatsAppConfigured()
  if (!configured) {
    return NextResponse.json({
      ok: false,
      error: 'WhatsApp provider tidak terkonfigurasi. Set di menu Pengaturan → WhatsApp.',
    }, { status: 400 })
  }

  const cfg = await getWaConfig()
  const now = new Date()
  const bulan = now.getMonth() + 1
  const tahun = now.getFullYear()

  console.log(`[CRON] Memulai broadcast WA (${cfg.provider}) untuk ${bulan}/${tahun}`)

  // 1. Auto-generate notifikasi PENDING untuk warga yang belum bayar
  const jenisList = ['SAMPAH', 'SOSIAL'] as const
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
    }

    // Pilih template sesuai jenis
    const template =
      jenis === 'SAMPAH' ? (cfg.templateSampah || DEFAULT_TEMPLATES.SAMPAH)
      : (cfg.templateSosial || DEFAULT_TEMPLATES.SOSIAL)

    for (const b of belumbayar) {
      const warga = await db.warga.findUnique({ where: { id: b.wargaId } })
      if (!warga || !warga.telepon) continue

      // Skip jika sudah ada notifikasi hari ini untuk kombinasi yang sama
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const existing = await db.notifikasi.findFirst({
        where: {
          wargaId: b.wargaId,
          jenis,
          createdAt: { gte: todayStart },
        },
      })
      if (existing) continue

      const pesan = renderTemplate(template, {
        nama: warga.nama,
        bulan: namaBulan(bulan),
        tahun: tahun.toString(),
        jenis: NAMA_JENIS[jenis],
        jumlah: formatRupiah(b.jumlah),
      })

      await db.notifikasi.create({
        data: {
          wargaId: b.wargaId,
          jenis,
          pesan,
          status: 'PENDING',
          provider: cfg.provider,
        },
      })
      autoCreated++
    }
  }

  console.log(`[CRON] Auto-created ${autoCreated} notifikasi baru`)

  // 2. Kirim semua notifikasi PENDING (limit 50 per run)
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
        data: { status: 'GAGAL', errorMessage: 'No telepon warga kosong', attempts: { increment: 1 } },
      })
      gagal++
      errors.push({ id: n.id, error: 'No telepon kosong' })
      continue
    }

    const result = await sendWhatsApp(n.warga.telepon, n.pesan)

    if (result.ok) {
      await db.notifikasi.update({
        where: { id: n.id },
        data: {
          status: 'TERKIRIM',
          tanggalKirim: new Date(),
          providerId: result.messageId || null,
          provider: cfg.provider,
          attempts: { increment: 1 },
        },
      })
      terkirim++
    } else {
      await db.notifikasi.update({
        where: { id: n.id },
        data: {
          status: 'GAGAL',
          errorMessage: result.error,
          attempts: { increment: 1 },
        },
      })
      gagal++
      errors.push({ id: n.id, error: result.error || 'Unknown error' })
    }

    // Rate limit: 500ms antar pengiriman
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`[CRON] Selesai. Terkirim: ${terkirim}, Gagal: ${gagal}`)

  return NextResponse.json({
    ok: true,
    provider: cfg.provider,
    periode: { bulan, tahun },
    autoCreated,
    processed: pendingNotifs.length,
    terkirim,
    gagal,
    errors: errors.slice(0, 10),
  })
}
