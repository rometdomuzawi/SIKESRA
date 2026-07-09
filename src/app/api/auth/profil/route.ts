import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { hashPassword } from '@/lib/auth'

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, phone, password } = body

  // Update user
  const updated = await db.user.update({
    where: { id: session.id },
    data: {
      ...(name ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(password ? { password: await hashPassword(password) } : {}),
    },
    select: { id: true, email: true, name: true, role: true, phone: true },
  })

  return NextResponse.json({ data: updated })
}
