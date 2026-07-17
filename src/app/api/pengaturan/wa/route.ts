import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageUsers } from '@/lib/session'
import {
  getWaConfig,
  invalidateWaConfigCache,
  testFonnteConnection,
  isWhatsAppConfigured,
} from '@/lib/wa-provider'

/**
 * GET — ambil konfigurasi WhatsApp saat ini.
 * Token disensor (hanya tampilkan indikator set/unset).
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = await getWaConfig()
  const configured = await isWhatsAppConfigured()

  return NextResponse.json({
    configured,
    provider: cfg.provider,
    fonnteTokenSet: !!cfg.fonnteToken,
    fonnteTokenMasked: cfg.fonnteToken ? maskToken(cfg.fonnteToken) : null,
    twilioSidSet: !!cfg.twilioSid,
    twilioFrom: cfg.twilioFrom || null,
  })
}

/**
 * PUT — simpan konfigurasi WhatsApp ke DB.
 * Body: { provider, fonnteToken?, twilioSid?, twilioToken?, twilioFrom? }
 */
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized — hanya Admin' }, { status: 403 })
  }

  const body = await req.json()
  const { provider, fonnteToken, twilioSid, twilioToken, twilioFrom, action } = body

  // Action: 'test' — test koneksi Fonnte tanpa menyimpan
  if (action === 'test') {
    if (provider === 'fonnte') {
      const tokenToTest = fonnteToken || (await getWaConfig()).fonnteToken
      if (!tokenToTest) {
        return NextResponse.json({ ok: false, error: 'Token Fonnte kosong' }, { status: 400 })
      }
      const result = await testFonnteConnection(tokenToTest)
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }
    return NextResponse.json({ ok: false, error: 'Test hanya untuk provider Fonnte' }, { status: 400 })
  }

  // Simpan ke DB
  const updates: Array<{ key: string; value: string }> = []
  if (provider) updates.push({ key: 'WA_PROVIDER', value: provider })
  if (fonnteToken !== undefined && fonnteToken !== '') {
    updates.push({ key: 'FONNTE_TOKEN', value: fonnteToken })
  }
  if (twilioSid !== undefined && twilioSid !== '') {
    updates.push({ key: 'TWILIO_SID', value: twilioSid })
  }
  if (twilioToken !== undefined && twilioToken !== '') {
    updates.push({ key: 'TWILIO_TOKEN', value: twilioToken })
  }
  if (twilioFrom !== undefined) {
    updates.push({ key: 'TWILIO_FROM', value: twilioFrom })
  }

  for (const u of updates) {
    const existing = await db.pengaturan.findUnique({ where: { key: u.key } })
    if (existing) {
      await db.pengaturan.update({ where: { key: u.key }, data: { value: u.value } })
    } else {
      await db.pengaturan.create({ data: { key: u.key, value: u.value } })
    }
  }

  invalidateWaConfigCache()

  return NextResponse.json({ ok: true, updated: updates.length })
}

function maskToken(token: string): string {
  if (token.length <= 8) return '****'
  return token.slice(0, 4) + '****' + token.slice(-4)
}
