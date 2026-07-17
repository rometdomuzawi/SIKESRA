export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Safely parse JSON from a fetch Response.
 * Returns { ok, data, error } — never throws "Unexpected end of JSON input".
 *
 * Use this instead of `await res.json()` in mutation/query handlers
 * to handle edge cases where the server returns:
 * - empty body (e.g. 500 from OOM/crash)
 * - non-JSON response (e.g. HTML error page)
 * - network errors
 */
export async function safeResJson<T = Record<string, unknown>>(
  res: Response
): Promise<{ ok: boolean; data: T | null; error: string | null; status: number }> {
  const status = res.status
  if (!res.ok) {
    // Try to parse error body, but don't throw if it fails
    try {
      const text = await res.text()
      if (!text) {
        return { ok: false, data: null, error: `Server error (${status})`, status }
      }
      try {
        const data = JSON.parse(text) as T
        const errMsg = (data as { error?: string })?.error || `Server error (${status})`
        return { ok: false, data, error: errMsg, status }
      } catch {
        // Body is not JSON (e.g. HTML error page)
        return { ok: false, data: null, error: `Server error (${status}): ${text.substring(0, 100)}`, status }
      }
    } catch {
      return { ok: false, data: null, error: `Server error (${status})`, status }
    }
  }
  // Success — parse JSON
  try {
    const text = await res.text()
    if (!text) {
      return { ok: true, data: null, error: null, status }
    }
    const data = JSON.parse(text) as T
    return { ok: true, data, error: null, status }
  } catch {
    // Response was OK but body wasn't valid JSON
    return { ok: true, data: null, error: null, status }
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatTanggal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatTanggalSingkat(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export const NAMA_BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
]

export function namaBulan(bulan: number): string {
  return NAMA_BULAN[bulan - 1] || ''
}

export function namaBulanSingkat(bulan: number): string {
  return NAMA_BULAN_SINGKAT[bulan - 1] || ''
}

// Sanitize phone number to wa.me format (62xxx)
export function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d]/g, '')
  if (p.startsWith('0')) p = '62' + p.slice(1)
  if (!p.startsWith('62')) p = '62' + p
  return p
}

export function waLink(phone: string, message: string): string {
  const p = normalizePhone(phone)
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`
}

export function getStatusBadge(status: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  switch (status) {
    case 'LUNAS':
      return { label: 'Lunas', variant: 'default' }
    case 'BELUM_BAYAR':
      return { label: 'Belum Bayar', variant: 'destructive' }
    case 'PENDING':
      return { label: 'Pending', variant: 'secondary' }
    case 'TERKIRIM':
      return { label: 'Terkirim', variant: 'default' }
    case 'GAGAL':
      return { label: 'Gagal', variant: 'destructive' }
    default:
      return { label: status, variant: 'outline' }
  }
}
