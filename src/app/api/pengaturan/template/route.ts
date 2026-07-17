import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageUsers } from '@/lib/session'
import {
  getWaConfig,
  invalidateWaConfigCache,
  DEFAULT_TEMPLATES,
} from '@/lib/wa-provider'

/**
 * GET — ambil template pesan saat ini.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = await getWaConfig()
  return NextResponse.json({
    templates: {
      SAMPAH: cfg.templateSampah || DEFAULT_TEMPLATES.SAMPAH,
      SOSIAL: cfg.templateSosial || DEFAULT_TEMPLATES.SOSIAL,
      UMUM: cfg.templateUmum || DEFAULT_TEMPLATES.UMUM,
    },
    defaults: DEFAULT_TEMPLATES,
    variables: [
      { key: '{{nama}}', desc: 'Nama lengkap warga' },
      { key: '{{bulan}}', desc: 'Nama bulan (Januari, Februari, ...)' },
      { key: '{{tahun}}', desc: 'Tahun (4 digit)' },
      { key: '{{jenis}}', desc: 'Nama jenis iuran (Iuran Sampah, dst)' },
      { key: '{{jumlah}}', desc: 'Jumlah iuran format Rupiah (Rp 30.000)' },
      { key: '{{pesan}}', desc: 'Isi pesan kustom (khusus template Umum)' },
    ],
  })
}

/**
 * PUT — simpan template pesan.
 * Body: { SAMPAH?: string, SOSIAL?: string, UMUM?: string }
 */
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized — hanya Admin' }, { status: 403 })
  }

  const body = await req.json()
  const map: Record<string, string> = {
    SAMPAH: 'TPL_SAMPAH',
    SOSIAL: 'TPL_SOSIAL',
    UMUM: 'TPL_UMUM',
  }

  const updates: Array<{ key: string; value: string }> = []
  for (const [jenis, dbKey] of Object.entries(map)) {
    if (body[jenis] !== undefined) {
      updates.push({ key: dbKey, value: body[jenis] })
    }
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
