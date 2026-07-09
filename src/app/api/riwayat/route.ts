import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const wargaId = searchParams.get('wargaId')
  const jenis = searchParams.get('jenis')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = searchParams.get('limit')

  const where: Record<string, unknown> = {}
  if (jenis) where.jenis = jenis
  if (from || to) {
    where.tanggal = {}
    if (from) (where.tanggal as Record<string, unknown>).gte = new Date(from)
    if (to) (where.tanggal as Record<string, unknown>).lte = new Date(to)
  }

  if (session.role === 'WARGA') {
    const warga = await db.warga.findUnique({ where: { userId: session.id } })
    if (!warga) return NextResponse.json({ data: [] })
    where.wargaId = warga.id
  } else if (wargaId) {
    where.wargaId = wargaId
  }

  const data = await db.riwayatPembayaran.findMany({
    where,
    include: { warga: { select: { nama: true, nik: true, rumah: { select: { blok: true, nomor: true } } } } },
    orderBy: { tanggal: 'desc' },
    ...(limit ? { take: Number(limit) } : {}),
  })

  const total = data.reduce((s, r) => s + r.jumlah, 0)
  return NextResponse.json({ data, total })
}
