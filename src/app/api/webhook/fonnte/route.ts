import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Webhook receiver untuk callback status delivery dari Fonnte.
 *
 * Konfigurasi di dashboard Fonnte:
 *   Webhook URL: https://yourdomain.com/api/webhook/fonnte
 *
 * Fonnte mengirim POST dengan body:
 *   {
 *     "id": "msg_id",
 *     "status": "sent" | "delivered" | "read" | "failed",
 *     "reason": "error reason (jika failed)",
 *     "phone": "628xxx"
 *   }
 *
 * Endpoint ini akan update status Notifikasi di DB berdasarkan providerId.
 *
 * Security: jika WEBHOOK_SECRET diset, Fonnte harus mengirim header
 *   Authorization: Bearer <WEBHOOK_SECRET>
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WEBHOOK_SECRET
    if (secret) {
      const auth = req.headers.get('authorization')
      const url = new URL(req.url)
      const querySecret = url.searchParams.get('secret')
      if (auth !== `Bearer ${secret}` && querySecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()
    const { id, status, reason, phone } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    // Update notifikasi dengan providerId yang cocok
    const notif = await db.notifikasi.findFirst({
      where: { providerId: id },
    })

    if (!notif) {
      // Mungkin pesan test atau dari sistem lain — log saja
      console.log('[Webhook Fonnte] Notifikasi tidak ditemukan untuk id:', id)
      return NextResponse.json({ ok: true, message: 'Not found, ignored' })
    }

    // Mapping status Fonnte ke status internal
    // Fonnte status: sent, delivered, read, failed, pending
    let newStatus = notif.status
    switch (status.toLowerCase()) {
      case 'sent':
        newStatus = 'TERKIRIM'
        break
      case 'delivered':
        newStatus = 'DELIVERED'
        break
      case 'read':
        newStatus = 'READ'
        break
      case 'failed':
        newStatus = 'GAGAL'
        break
      case 'pending':
        newStatus = 'PENDING'
        break
    }

    await db.notifikasi.update({
      where: { id: notif.id },
      data: {
        status: newStatus,
        errorMessage: reason || null,
      },
    })

    console.log(`[Webhook Fonnte] Notif ${notif.id} status: ${status} → ${newStatus}`)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[Webhook Fonnte] Error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * GET — untuk verifikasi webhook URL di dashboard Fonnte.
 */
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Fonnte webhook endpoint ready' })
}
