import { NextResponse } from 'next/server'
import {
  isWhatsAppConfigured,
  getWaConfig,
  getProviderName,
} from '@/lib/wa-provider'
import { getSession } from '@/lib/session'

/**
 * Cek status konfigurasi WhatsApp provider.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const configured = await isWhatsAppConfigured()
  const cfg = await getWaConfig()

  return NextResponse.json({
    configured,
    provider: getProviderName(cfg),
    fonnteTokenSet: !!cfg.fonnteToken,
    twilioConfigured: !!(cfg.twilioSid && cfg.twilioToken),
  })
}
