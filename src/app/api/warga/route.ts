import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageUsers, canManageFinances } from '@/lib/session'
import { hashPassword } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const blok = searchParams.get('blok') || ''

  // WARGA hanya bisa lihat dirinya sendiri
  if (session.role === Role.WARGA) {
    const warga = await db.warga.findUnique({
      where: { userId: session.id },
      include: { rumah: true, user: { select: { email: true, phone: true, isActive: true } } },
    })
    return NextResponse.json({ data: warga ? [warga] : [] })
  }

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { nama: { contains: search } },
      { nik: { contains: search } },
      { telepon: { contains: search } },
    ]
  }
  if (blok) {
    where.rumah = { blok }
  }

  const data = await db.warga.findMany({
    where,
    include: {
      rumah: true,
      user: { select: { email: true, phone: true, isActive: true, role: true } },
    },
    orderBy: { nama: 'asc' },
  })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { nama, nik, email, telepon, alamat, pekerjaan, password, blok, nomor, rumahId } = body

  if (!nama || !nik || !email || !password) {
    return NextResponse.json({ error: 'Nama, NIK, email, dan password wajib diisi' }, { status: 400 })
  }

  // Cek duplikasi
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
  }
  const existingNik = await db.warga.findUnique({ where: { nik } })
  if (existingNik) {
    return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 })
  }

  // Buat rumah baru jika tidak ada rumahId
  let rumahActual = rumahId
  if (!rumahActual && blok && nomor) {
    const rumah = await db.rumah.create({
      data: { blok, nomor, alamat: alamat || `Perumahan Blok ${blok} No. ${nomor}` },
    })
    rumahActual = rumah.id
  } else if (rumahActual) {
    // Pastikan rumah ada
    const rumah = await db.rumah.findUnique({ where: { id: rumahActual } })
    if (!rumah) return NextResponse.json({ error: 'Rumah tidak ditemukan' }, { status: 400 })
  }

  const user = await db.user.create({
    data: {
      email: email.toLowerCase().trim(),
      password: await hashPassword(password),
      name: nama,
      role: Role.WARGA,
      phone: telepon,
    },
  })

  const warga = await db.warga.create({
    data: {
      userId: user.id,
      nik,
      nama,
      telepon,
      alamat,
      pekerjaan,
      rumahId: rumahActual,
    },
    include: { rumah: true },
  })

  return NextResponse.json({ data: warga }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, nama, nik, telepon, alamat, pekerjaan, blok, nomor, rumahId, isActive, email, phone } = body

  // WARGA hanya bisa update dirinya sendiri
  if (session.role === Role.WARGA) {
    const warga = await db.warga.findUnique({ where: { userId: session.id } })
    if (!warga || warga.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const updated = await db.warga.update({
      where: { id },
      data: { nama, telepon, alamat, pekerjaan },
      include: { rumah: true },
    })
    return NextResponse.json({ data: updated })
  }

  if (!canManageUsers(session.role) && !canManageFinances(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await db.warga.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Warga tidak ditemukan' }, { status: 404 })

  // Cek NIK unik
  if (nik && nik !== existing.nik) {
    const nikExist = await db.warga.findUnique({ where: { nik } })
    if (nikExist && nikExist.id !== id) {
      return NextResponse.json({ error: 'NIK sudah dipakai warga lain' }, { status: 400 })
    }
  }

  // Update rumah
  let rumahActual = rumahId
  if (blok && nomor && !rumahId) {
    const rumah = await db.rumah.create({
      data: { blok, nomor, alamat: alamat || `Perumahan Blok ${blok} No. ${nomor}` },
    })
    rumahActual = rumah.id
  }

  const updated = await db.warga.update({
    where: { id },
    data: {
      nama, nik, telepon, alamat, pekerjaan, rumahId: rumahActual,
    },
    include: { rumah: true, user: { select: { email: true, phone: true, isActive: true } } },
  })

  // Update user (email, phone, isActive) jika admin
  if (canManageUsers(session.role) && (email || phone || isActive !== undefined)) {
    await db.user.update({
      where: { id: existing.userId },
      data: {
        ...(email ? { email: email.toLowerCase().trim() } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })
  }

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

  const warga = await db.warga.findUnique({ where: { id } })
  if (!warga) return NextResponse.json({ error: 'Warga tidak ditemukan' }, { status: 404 })

  // Hapus user terkait
  await db.user.delete({ where: { id: warga.userId } })

  return NextResponse.json({ ok: true })
}
