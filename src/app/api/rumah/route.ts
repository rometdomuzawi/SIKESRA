import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageUsers } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await db.rumah.findMany({
    include: {
      warga: { select: { id: true, nama: true, nik: true, telepon: true } },
    },
    orderBy: [{ blok: 'asc' }, { nomor: 'asc' }],
  })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { nomor, blok, alamat, tipe } = body

  if (!nomor || !blok) {
    return NextResponse.json({ error: 'Nomor dan blok wajib diisi' }, { status: 400 })
  }

  const existing = await db.rumah.findUnique({ where: { nomor } })
  if (existing) {
    return NextResponse.json({ error: 'Nomor rumah sudah ada' }, { status: 400 })
  }

  const rumah = await db.rumah.create({
    data: { nomor, blok, alamat: alamat || '', tipe },
  })

  return NextResponse.json({ data: rumah }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { id, nomor, blok, alamat, tipe } = body
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const updated = await db.rumah.update({
    where: { id },
    data: { nomor, blok, alamat, tipe },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const wargaCount = await db.warga.count({ where: { rumahId: id } })
  if (wargaCount > 0) {
    return NextResponse.json({ error: 'Rumah masih dihuni warga, tidak bisa dihapus' }, { status: 400 })
  }

  await db.rumah.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
