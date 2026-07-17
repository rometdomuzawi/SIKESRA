import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageFinances } from '@/lib/session'
import { waLink } from '@/lib/format'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const jenis = searchParams.get('jenis')
  const wargaId = searchParams.get('wargaId')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (jenis) where.jenis = jenis

  if (session.role === 'WARGA') {
    const warga = await db.warga.findUnique({ where: { userId: session.id } })
    if (!warga) return NextResponse.json({ data: [] })
    where.wargaId = warga.id
  } else if (wargaId) {
    where.wargaId = wargaId
  }

  const data = await db.notifikasi.findMany({
    where,
    include: {
      warga: { select: { nama: true, telepon: true, nik: true } },
      sender: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Tambahkan waLink untuk PENDING
  const dataWithLink = data.map((n) => ({
    ...n,
    waLink: n.warga?.telepon ? waLink(n.warga.telepon, n.pesan) : null,
  }))

  return NextResponse.json({ data: dataWithLink })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()

  // Bulk: kirim pengingat ke semua yang BELUM_BAYAR untuk bulan/tahun/jenis tertentu
  if (body.bulk) {
    const { bulan, tahun, jenis } = body
    if (!bulan || !tahun || !jenis) {
      return NextResponse.json({ error: 'bulan, tahun, jenis wajib diisi' }, { status: 400 })
    }

    let belumbayar: { wargaId: string; jumlah: number }[] = []
    if (jenis === 'SAMPAH') {
      belumbayar = await db.uangSampah.findMany({
        where: { bulan: Number(bulan), tahun: Number(tahun), status: 'BELUM_BAYAR' },
        select: { wargaId: true, jumlah: true },
      })
    } else if (jenis === 'SOSIAL') {
      belumbayar = await db.uangSosial.findMany({
        where: { bulan: Number(bulan), tahun: Number(tahun), status: 'BELUM_BAYAR' },
        select: { wargaId: true, jumlah: true },
      })
    }

    const namaJenis = jenis === 'SAMPAH' ? 'Iuran Sampah' : jenis === 'SOSIAL' ? 'Iuran Sosial' : 'Notifikasi'
    const result = []
    for (const b of belumbayar) {
      const warga = await db.warga.findUnique({ where: { id: b.wargaId } })
      if (!warga || !warga.telepon) continue
      const pesan = `Yth. ${warga.nama},\n\nPengingat pembayaran ${namaJenis} periode ${bulan}/${tahun} sebesar Rp ${b.jumlah.toLocaleString('id-ID')}.\n\nMohon segera lakukan pembayaran ke Bendahara.\n\nTerima kasih.\n- Pengurus Perumahan`
      const n = await db.notifikasi.create({
        data: {
          wargaId: b.wargaId,
          senderId: session.id,
          jenis,
          pesan,
          status: 'PENDING',
        },
      })
      result.push(n)
    }

    return NextResponse.json({ data: result, created: result.length }, { status: 201 })
  }

  // Single notification
  const { wargaId, jenis, pesan } = body
  if (!wargaId || !pesan) {
    return NextResponse.json({ error: 'wargaId dan pesan wajib diisi' }, { status: 400 })
  }

  const n = await db.notifikasi.create({
    data: {
      wargaId,
      senderId: session.id,
      jenis: jenis || 'UMUM',
      pesan,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ data: n }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { id, status } = body
  if (!id || !status) return NextResponse.json({ error: 'ID dan status wajib diisi' }, { status: 400 })

  const updated = await db.notifikasi.update({
    where: { id },
    data: { status, tanggalKirim: status === 'TERKIRIM' ? new Date() : undefined },
  })

  return NextResponse.json({ data: updated })
}
