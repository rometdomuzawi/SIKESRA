/**
 * WhatsApp Provider abstraction
 *
 * Mendukung 2 provider:
 * 1. Fonnte (https://fonnte.com) — Indonesia, murah, mudah
 * 2. Twilio WhatsApp API (https://twilio.com/whatsapp) — international
 *
 * Konfigurasi dibaca dengan urutan:
 * 1. Database (tabel Pengaturan) — via UI Pengaturan
 * 2. Environment variable — fallback untuk deployment
 *
 * Jika tidak ada yang ter-set, return mode "manual" — wa.me link saja.
 */

import { db } from '@/lib/db'

export interface SendResult {
  ok: boolean
  messageId?: string
  error?: string
  raw?: unknown
}

export interface WaConfig {
  provider: string // 'fonnte' | 'twilio' | 'manual'
  fonnteToken?: string
  twilioSid?: string
  twilioToken?: string
  twilioFrom?: string
  // Template pesan (disimpan di DB)
  templateSampah?: string
  templateSosial?: string
  templateUmum?: string
}

let cachedConfig: WaConfig | null = null
let cacheExpiry = 0
const CACHE_TTL = 30_000 // 30 detik

/**
 * Ambil konfigurasi WhatsApp dari DB + env.
 * Cache 30 detik untuk performa.
 */
export async function getWaConfig(): Promise<WaConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig
  }

  // Baca dari DB
  const settings = await db.pengaturan.findMany({
    where: {
      key: {
        in: [
          'WA_PROVIDER',
          'FONNTE_TOKEN',
          'TWILIO_SID',
          'TWILIO_TOKEN',
          'TWILIO_FROM',
          'TPL_SAMPAH',
          'TPL_SOSIAL',
          'TPL_UMUM',
        ],
      },
    },
  })
  const map: Record<string, string> = {}
  for (const s of settings) map[s.key] = s.value

  const config: WaConfig = {
    provider:
      map.WA_PROVIDER ||
      process.env.WA_PROVIDER?.toLowerCase() ||
      'manual',
    fonnteToken: map.FONNTE_TOKEN || process.env.FONNTE_TOKEN,
    twilioSid: map.TWILIO_SID || process.env.TWILIO_ACCOUNT_SID,
    twilioToken: map.TWILIO_TOKEN || process.env.TWILIO_AUTH_TOKEN,
    twilioFrom: map.TWILIO_FROM || process.env.TWILIO_WHATSAPP_FROM,
    templateSampah: map.TPL_SAMPAH || DEFAULT_TEMPLATES.SAMPAH,
    templateSosial: map.TPL_SOSIAL || DEFAULT_TEMPLATES.SOSIAL,
    templateUmum: map.TPL_UMUM || DEFAULT_TEMPLATES.UMUM,
  }

  cachedConfig = config
  cacheExpiry = Date.now() + CACHE_TTL
  return config
}

/**
 * Invalidate cache config (setelah update pengaturan).
 */
export function invalidateWaConfigCache() {
  cachedConfig = null
  cacheExpiry = 0
}

/**
 * Cek apakah WhatsApp terkonfigurasi.
 */
export async function isWhatsAppConfigured(): Promise<boolean> {
  const cfg = await getWaConfig()
  if (cfg.provider === 'fonnte' && cfg.fonnteToken) return true
  if (cfg.provider === 'twilio' && cfg.twilioSid && cfg.twilioToken) return true
  return false
}

/**
 * Kirim pesan WhatsApp.
 */
export async function sendWhatsApp(phone: string, message: string): Promise<SendResult> {
  const cfg = await getWaConfig()
  const normalizedPhone = normalizePhone(phone)

  if (cfg.provider === 'fonnte' && cfg.fonnteToken) {
    return sendFonnte(normalizedPhone, message, cfg.fonnteToken)
  }

  if (cfg.provider === 'twilio' && cfg.twilioSid && cfg.twilioToken) {
    return sendTwilio(normalizedPhone, message, cfg.twilioSid, cfg.twilioToken, cfg.twilioFrom || 'whatsapp:+14155238886')
  }

  return {
    ok: false,
    error: 'WA_PROVIDER not configured. Set via UI Pengaturan or env vars.',
    raw: { waLink: `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}` },
  }
}

/**
 * Fonnte API — https://docs.fonnte.com
 */
async function sendFonnte(phone: string, message: string, token: string): Promise<SendResult> {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phone,
        message,
        countryCode: '62',
      }),
    })
    const data = await res.json()
    // Fonnte response: { status: true, id: 'xxx', ... } on success
    if (data.status === true || data.status === 'success') {
      return {
        ok: true,
        messageId: data.id || data.message_id || data.msgid,
        raw: data,
      }
    }
    return {
      ok: false,
      error: data.reason || data.message || 'Fonnte error',
      raw: data,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

/**
 * Twilio WhatsApp API
 */
async function sendTwilio(
  phone: string,
  message: string,
  sid: string,
  token: string,
  from: string
): Promise<SendResult> {
  try {
    const to = `whatsapp:+${phone}`
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: message }),
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

/**
 * Test koneksi Fonnte — cek device & saldo.
 * GET https://api.fonnte.com/get-device
 */
export async function testFonnteConnection(token: string): Promise<{
  ok: boolean
  device?: {
    name: string
    status: string // connected | disconnected | connecting
    quota?: string
    expired?: string
  }
  error?: string
}> {
  try {
    const res = await fetch('https://api.fonnte.com/get-device', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    })
    const data = await res.json()
    if (data.status === true || data.status === 'success') {
      return {
        ok: true,
        device: {
          name: data.name || data.device_name || 'Device',
          status: data.status_device || data.connection || 'unknown',
          quota: data.quota?.toString(),
          expired: data.expired,
        },
      }
    }
    return { ok: false, error: data.reason || data.message || 'Token tidak valid' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

/**
 * Kirim pesan test ke nomor tertentu.
 */
export async function sendTestMessage(phone: string): Promise<SendResult> {
  const testMsg = `🔔 *Test Notifikasi SIKESRA*\n\nIni adalah pesan test dari Sistem Informasi Keuangan & Sosial Perumahan.\n\nJika Anda menerima pesan ini, berarti konfigurasi WhatsApp otomatis berfungsi dengan baik.\n\nWaktu: ${new Date().toLocaleString('id-ID')}`
  return sendWhatsApp(phone, testMsg)
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

export function getProviderName(cfg: WaConfig): string {
  return cfg.provider
}

/**
 * Render template pesan dengan variabel.
 * Variabel yang didukung:
 *   {{nama}} - nama warga
 *   {{bulan}} - nama bulan (Januari, Februari, ...)
 *   {{tahun}} - tahun
 *   {{jenis}} - jenis iuran (Iuran Sampah, Iuran Sosial)
 *   {{jumlah}} - jumlah iuran (formatted Rupiah)
 */
export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{{${k}}}`, String(v))
  }
  return result
}

/**
 * Template default untuk masing-masing jenis iuran.
 */
export const DEFAULT_TEMPLATES = {
  SAMPAH: `Yth. {{nama}},\n\nPengingat pembayaran *Iuran Sampah* periode {{bulan}} {{tahun}} sebesar *{{jumlah}}*.\n\nMohon segera lakukan pembayaran ke Bendahara. Terima kasih.\n- Pengurus Perumahan Griya Asri`,
  SOSIAL: `Yth. {{nama}},\n\nPengingat pembayaran *Iuran Sosial* periode {{bulan}} {{tahun}} sebesar *{{jumlah}}*.\n\nMohon segera lakukan pembayaran ke Bendahara. Terima kasih.\n- Pengurus Perumahan Griya Asri`,
  UMUM: `Yth. {{nama}},\n\n{{pesan}}\n\n- Pengurus Perumahan Griya Asri`,
}

export const NAMA_JENIS: Record<string, string> = {
  SAMPAH: 'Iuran Sampah',
  SOSIAL: 'Iuran Sosial',
  UMUM: 'Notifikasi',
}
