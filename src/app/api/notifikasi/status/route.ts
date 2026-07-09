import { NextResponse } from 'next/server'
import { isWhatsAppConfigured, getProviderName } from '@/lib/wa-provider'
import { getSession } from '@/lib/session'

/**
 * Cek status konfigurasi WhatsApp provider.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    configured: isWhatsAppConfigured(),
    provider: getProviderName(),
  })
}
