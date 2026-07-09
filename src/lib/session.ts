import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { verifySessionToken } from '@/lib/auth'
import { Role } from '@prisma/client'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  phone: string | null
}

const SESSION_COOKIE = 'sisos-session'

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = verifySessionToken(token)
  if (!payload || !payload.id) return null

  const user = await db.user.findUnique({
    where: { id: payload.id as string },
    select: { id: true, email: true, name: true, role: true, phone: true, isActive: true },
  })

  if (!user || !user.isActive) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE

export function roleLabels(role: Role): string {
  const map: Record<Role, string> = {
    ADMIN: 'Administrator',
    BENDAHARA: 'Bendahara',
    KETUA: 'Ketua',
    WARGA: 'Warga',
  }
  return map[role]
}

export function canManageFinances(role: Role): boolean {
  return role === Role.ADMIN || role === Role.BENDAHARA
}

export function canManageUsers(role: Role): boolean {
  return role === Role.ADMIN
}

export function canViewReports(role: Role): boolean {
  return role === Role.ADMIN || role === Role.BENDAHARA || role === Role.KETUA
}
