export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
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
