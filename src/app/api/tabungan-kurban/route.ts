import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageFinances } from '@/lib/session'
import { PaymentStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bulan = searchParams.get('bulan')
  const tahun = searchParams.get('tahun')
  const status = searchParams.get('status')
  const search = searchParams.get('search') || ''
  const wargaId = searchParams.get('wargaId')

  const where: Record<string, unknown> = {}
  if (bulan) where.bulan = Number(bulan)
  if (tahun) where.tahun = Number(tahun)
  if (status) where.status = status as PaymentStatus

  if (session.role === 'WARGA') {
    const warga = await db.warga.findUnique({ where: { userId: session.id } })
    if (!warga) return NextResponse.json({ data: [] })
    where.wargaId = warga.id
  } else if (wargaId) {
    where.wargaId = wargaId
  }

  if (search) {
    where.warga = {
      OR: [
        { nama: { contains: search } },
        { nik: { contains: search } },
      ],
    }
  }

  const data = await db.tabunganKurban.findMany({
    where,
    include: { warga: { include: { rumah: true } } },
    orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }, { warga: { nama: 'asc' } }],
  })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()

  if (body.bulk) {
    const { bulan, tahun, jumlah } = body
    if (!bulan || !tahun || !jumlah) {
      return NextResponse.json({ error: 'bulan, tahun, jumlah wajib diisi' }, { status: 400 })
    }
    const semuaWarga = await db.warga.findMany()
    const result = []
    for (const w of semuaWarga) {
      const existing = await db.tabunganKurban.findUnique({
        where: { wargaId_bulan_tahun: { wargaId: w.id, bulan: Number(bulan), tahun: Number(tahun) } },
      })
      if (!existing) {
        const rec = await db.tabunganKurban.create({
          data: { wargaId: w.id, bulan: Number(bulan), tahun: Number(tahun), jumlah: Number(jumlah) },
        })
        result.push(rec)
      }
    }
    return NextResponse.json({ data: result, created: result.length }, { status: 201 })
  }

  const { wargaId, bulan, tahun, jumlah, status, metode, keterangan } = body
  if (!wargaId || !bulan || !tahun || !jumlah) {
    return NextResponse.json({ error: 'wargaId, bulan, tahun, jumlah wajib diisi' }, { status: 400 })
  }

  const existing = await db.tabunganKurban.findUnique({
    where: { wargaId_bulan_tahun: { wargaId, bulan: Number(bulan), tahun: Number(tahun) } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Data tabungan untuk bulan/warga ini sudah ada' }, { status: 400 })
  }

  const isLunas = status === 'LUNAS'
  const rec = await db.tabunganKurban.create({
    data: {
      wargaId,
      bulan: Number(bulan),
      tahun: Number(tahun),
      jumlah: Number(jumlah),
      status: status || PaymentStatus.BELUM_BAYAR,
      tanggalBayar: isLunas ? new Date() : null,
      metode: isLunas ? metode || 'TUNAI' : null,
      keterangan,
    },
  })

  if (isLunas) {
    await db.riwayatPembayaran.create({
      data: {
        wargaId, jenis: 'KURBAN', bulan: Number(bulan), tahun: Number(tahun),
        jumlah: Number(jumlah), metode: metode || 'TUNAI', keterangan,
      },
    })
  }

  return NextResponse.json({ data: rec }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { id, status, metode, keterangan, jumlah, tanggalBayar } = body
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const existing = await db.tabunganKurban.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })

  const isLunas = status === 'LUNAS'
  const updated = await db.tabunganKurban.update({
    where: { id },
    data: {
      ...(status ? { status: status as PaymentStatus } : {}),
      ...(metode !== undefined ? { metode } : {}),
      ...(keterangan !== undefined ? { keterangan } : {}),
      ...(jumlah !== undefined ? { jumlah: Number(jumlah) } : {}),
      ...(tanggalBayar !== undefined ? { tanggalBayar: new Date(tanggalBayar) } : {}),
      ...(isLunas && !existing.tanggalBayar ? { tanggalBayar: new Date() } : {}),
    },
  })

  if (status && status !== existing.status) {
    if (isLunas) {
      const existingRiwayat = await db.riwayatPembayaran.findFirst({
        where: { wargaId: existing.wargaId, jenis: 'KURBAN', bulan: existing.bulan, tahun: existing.tahun },
      })
      if (!existingRiwayat) {
        await db.riwayatPembayaran.create({
          data: {
            wargaId: existing.wargaId, jenis: 'KURBAN', bulan: existing.bulan, tahun: existing.tahun,
            jumlah: Number(jumlah || existing.jumlah), metode: metode || 'TUNAI', keterangan,
          },
        })
      }
    } else {
      await db.riwayatPembayaran.deleteMany({
        where: { wargaId: existing.wargaId, jenis: 'KURBAN', bulan: existing.bulan, tahun: existing.tahun },
      })
    }
  }

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

  const existing = await db.tabunganKurban.findUnique({ where: { id } })
  if (existing) {
    await db.riwayatPembayaran.deleteMany({
      where: { wargaId: existing.wargaId, jenis: 'KURBAN', bulan: existing.bulan, tahun: existing.tahun },
    })
    await db.tabunganKurban.delete({ where: { id } })
  }

  return NextResponse.json({ ok: true })
}
