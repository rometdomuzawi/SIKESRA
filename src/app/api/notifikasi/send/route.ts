import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageFinances } from '@/lib/session'
import {
  sendWhatsApp,
  isWhatsAppConfigured,
  getWaConfig,
  getProviderName,
} from '@/lib/wa-provider'

/**
 * Kirim SATU notifikasi via WhatsApp provider (manual trigger dari UI).
 * Body: { id: notifikasiId }
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const configured = await isWhatsAppConfigured()
  if (!configured) {
    return NextResponse.json({
      error: 'WhatsApp provider belum dikonfigurasi. Set di menu Pengaturan → WhatsApp.',
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

  const cfg = await getWaConfig()
  const result = await sendWhatsApp(notif.warga.telepon, notif.pesan)

  if (result.ok) {
    await db.notifikasi.update({
      where: { id },
      data: {
        status: 'TERKIRIM',
        tanggalKirim: new Date(),
        providerId: result.messageId || null,
        provider: cfg.provider,
        attempts: { increment: 1 },
        errorMessage: null,
      },
    })
    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      provider: getProviderName(cfg),
    })
  } else {
    await db.notifikasi.update({
      where: { id },
      data: {
        status: 'GAGAL',
        errorMessage: result.error,
        attempts: { increment: 1 },
      },
    })
    return NextResponse.json({
      ok: false,
      error: result.error,
      waLink: (result.raw as { waLink?: string })?.waLink,
    }, { status: 500 })
  }
}
