import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canManageUsers } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await db.pengaturan.findMany()
  const map: Record<string, string> = {}
  for (const s of settings) map[s.key] = s.value

  return NextResponse.json({ data: map })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  for (const [key, value] of Object.entries(body)) {
    const existing = await db.pengaturan.findUnique({ where: { key } })
    if (existing) {
      await db.pengaturan.update({ where: { key }, data: { value: String(value) } })
    } else {
      await db.pengaturan.create({ data: { key, value: String(value) } })
    }
  }

  return NextResponse.json({ ok: true })
}
