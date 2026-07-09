import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }

  // Untuk WARGA, sertakan data warga (rumah, profil)
  let warga = null
  if (session.role === 'WARGA') {
    warga = await db.warga.findUnique({
      where: { userId: session.id },
      include: { rumah: true },
    })
  }

  return NextResponse.json({
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      phone: session.phone,
    },
    warga: warga
      ? {
          id: warga.id,
          nama: warga.nama,
          nik: warga.nik,
          telepon: warga.telepon,
          alamat: warga.alamat,
          rumah: warga.rumah,
        }
      : null,
  })
}
