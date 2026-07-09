import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageFinances, canViewReports } from '@/lib/session'
import { KasJenis } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jenis = searchParams.get('jenis')
  const kategori = searchParams.get('kategori')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = searchParams.get('limit')

  // WARGA tidak boleh lihat detail kas
  if (session.role === 'WARGA') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const where: Record<string, unknown> = {}
  if (jenis) where.jenis = jenis as KasJenis
  if (kategori) where.kategori = kategori
  if (from || to) {
    where.tanggal = {}
    if (from) (where.tanggal as Record<string, unknown>).gte = new Date(from)
    if (to) (where.tanggal as Record<string, unknown>).lte = new Date(to)
  }

  const data = await db.kas.findMany({
    where,
    include: { bendahara: { select: { name: true } } },
    orderBy: { tanggal: 'desc' },
    ...(limit ? { take: Number(limit) } : {}),
  })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { jenis, kategori, jumlah, keterangan, tanggal } = body

  if (!jenis || !kategori || !jumlah) {
    return NextResponse.json({ error: 'Jenis, kategori, dan jumlah wajib diisi' }, { status: 400 })
  }

  if (!['MASUK', 'KELUAR'].includes(jenis)) {
    return NextResponse.json({ error: 'Jenis harus MASUK atau KELUAR' }, { status: 400 })
  }

  const rec = await db.kas.create({
    data: {
      jenis: jenis as KasJenis,
      kategori,
      jumlah: Number(jumlah),
      keterangan,
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      bendaharaId: session.id,
    },
    include: { bendahara: { select: { name: true } } },
  })

  return NextResponse.json({ data: rec }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { id, jenis, kategori, jumlah, keterangan, tanggal } = body
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const updated = await db.kas.update({
    where: { id },
    data: {
      ...(jenis ? { jenis: jenis as KasJenis } : {}),
      ...(kategori ? { kategori } : {}),
      ...(jumlah !== undefined ? { jumlah: Number(jumlah) } : {}),
      ...(keterangan !== undefined ? { keterangan } : {}),
      ...(tanggal ? { tanggal: new Date(tanggal) } : {}),
    },
    include: { bendahara: { select: { name: true } } },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  await db.kas.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// Helper untuk menghitung saldo kas
export async function getSaldoKas(): Promise<number> {
  const masuk = await db.kas.aggregate({
    where: { jenis: KasJenis.MASUK },
    _sum: { jumlah: true },
  })
  const keluar = await db.kas.aggregate({
    where: { jenis: KasJenis.KELUAR },
    _sum: { jumlah: true },
  })
  return (masuk._sum.jumlah || 0) - (keluar._sum.jumlah || 0)
}
