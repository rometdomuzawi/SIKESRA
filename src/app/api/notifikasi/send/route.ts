import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageFinances } from '@/lib/session'
import { sendWhatsApp, isWhatsAppConfigured, getProviderName } from '@/lib/wa-provider'

/**
 * Kirim SATU notifikasi via WhatsApp provider (manual trigger dari UI).
 * Body: { id: notifikasiId }
 *
 * Setelah terkirim, status notifikasi diupdate jadi TERKIRIM.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({
      error: `WhatsApp provider tidak terkonfigurasi. Set WA_PROVIDER=fonnte atau twilio di environment variable. Saat ini: ${getProviderName()}`,
    }, { status: 400 })
  }

  const body = await req.json()
  const { id } = body
  if (!id) {
    return NextResponse.json({ error: 'ID notifikasi wajib diisi' }, { status: 400 })
  }

  const notif = await db.notifikasi.findUnique({
    where: { id },
    include: { warga: { select: { nama: true, telepon: true } } },
  })

  if (!notif) {
    return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 })
  }

  if (!notif.warga.telepon) {
    return NextResponse.json({ error: 'Warga tidak punya nomor telepon' }, { status: 400 })
  }

  const result = await sendWhatsApp(notif.warga.telepon, notif.pesan)

  if (result.ok) {
    await db.notifikasi.update({
      where: { id },
      data: { status: 'TERKIRIM', tanggalKirim: new Date() },
    })
    return NextResponse.json({ ok: true, messageId: result.messageId })
  } else {
    await db.notifikasi.update({
      where: { id },
      data: { status: 'GAGAL' },
    })
    return NextResponse.json({
      ok: false,
      error: result.error,
      waLink: (result.raw as { waLink?: string })?.waLink,
    }, { status: 500 })
  }
}
