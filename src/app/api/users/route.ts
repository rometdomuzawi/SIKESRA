import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageUsers } from '@/lib/session'
import { hashPassword } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function GET() {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const data = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, phone: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { email, password, name, role, phone } = body

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: 'Email, password, nama, dan role wajib diisi' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
  }

  const user = await db.user.create({
    data: {
      email: email.toLowerCase().trim(),
      password: await hashPassword(password),
      name,
      role: role as Role,
      phone,
    },
    select: { id: true, email: true, name: true, role: true, phone: true, isActive: true },
  })

  return NextResponse.json({ data: user }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { id, email, password, name, role, phone, isActive } = body
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  if (email) {
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Email sudah dipakai user lain' }, { status: 400 })
    }
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(email ? { email: email.toLowerCase().trim() } : {}),
      ...(password ? { password: await hashPassword(password) } : {}),
      ...(name ? { name } : {}),
      ...(role ? { role: role as Role } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    select: { id: true, email: true, name: true, role: true, phone: true, isActive: true },
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

  if (id === session.id) {
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
  }

  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
