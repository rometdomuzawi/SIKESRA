/**
 * WhatsApp Provider abstraction
 *
 * Mendukung 2 provider:
 * 1. Fonnte (https://fonnte.com) — Indonesia, murah, mudah
 * 2. Twilio WhatsApp API (https://twilio.com/whatsapp) — international
 *
 * Set environment variable:
 *   WA_PROVIDER=fonnte
 *   FONNTE_TOKEN=xxxx
 *   # atau
 *   WA_PROVIDER=twilio
 *   TWILIO_ACCOUNT_SID=ACxxxx
 *   TWILIO_AUTH_TOKEN=xxxx
 *   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
 *
 * Jika WA_PROVIDER tidak diset, fallback ke "manual" —
 *   return link wa.me saja (mode demo).
 */

export interface SendResult {
  ok: boolean
  messageId?: string
  error?: string
  raw?: unknown
}

export async function sendWhatsApp(phone: string, message: string): Promise<SendResult> {
  const provider = process.env.WA_PROVIDER?.toLowerCase() || 'manual'
  const normalizedPhone = normalizePhone(phone)

  if (provider === 'fonnte' && process.env.FONNTE_TOKEN) {
    return sendFonnte(normalizedPhone, message)
  }

  if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return sendTwilio(normalizedPhone, message)
  }

  // Manual / demo mode: return wa.me link
  return {
    ok: false,
    error: 'WA_PROVIDER not configured. Set WA_PROVIDER=fonnte or twilio with credentials. Fallback to manual wa.me link.',
    raw: { waLink: `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}` },
  }
}

/**
 * Fonnte API — https://docs.fonnte.com
 */
async function sendFonnte(phone: string, message: string): Promise<SendResult> {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: process.env.FONNTE_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phone,
        message,
        countryCode: '62',
      }),
    })
    const data = await res.json()
    if (data.status === true || data.status === 'success') {
      return { ok: true, messageId: data.id || data.message_id, raw: data }
    }
    return { ok: false, error: data.reason || data.message || 'Fonnte error', raw: data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

/**
 * Twilio WhatsApp API
 */
async function sendTwilio(phone: string, message: string): Promise<SendResult> {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!
    const token = process.env.TWILIO_AUTH_TOKEN!
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
    const to = `whatsapp:+${phone}`

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: message,
      }),
    })
    const data = await res.json()
    if (res.ok && data.sid) {
      return { ok: true, messageId: data.sid, raw: data }
    }
    return { ok: false, error: data.message || 'Twilio error', raw: data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d]/g, '')
  if (p.startsWith('0')) p = '62' + p.slice(1)
  if (!p.startsWith('62')) p = '62' + p
  return p
}

export function waLink(phone: string, message: string): string {
  const p = normalizePhone(phone)
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`
}

/**
 * Cek apakah provider WhatsApp terkonfigurasi
 */
export function isWhatsAppConfigured(): boolean {
  const provider = process.env.WA_PROVIDER?.toLowerCase()
  if (provider === 'fonnte' && process.env.FONNTE_TOKEN) return true
  if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return true
  return false
}

export function getProviderName(): string {
  return process.env.WA_PROVIDER?.toLowerCase() || 'manual'
}
