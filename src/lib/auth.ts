import bcrypt from 'bcryptjs'
import { createHmac, randomBytes } from 'crypto'

const AUTH_SECRET = process.env.AUTH_SECRET || 'sisos-secret-key'

const BCRYPT_ROUNDS = 12

/**
 * Hash password menggunakan bcrypt (production-grade).
 * Async karena bcrypt memang demikian.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verifikasi password terhadap hash bcrypt.
 */
export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashed)
  } catch {
    return false
  }
}

/**
 * Buat session token sign dengan HMAC.
 * Payload berisi { id, email, role, iat }.
 */
export function createSessionToken(payload: Record<string, unknown>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', AUTH_SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

/**
 * Verifikasi signature session token.
 */
export function verifySessionToken(token: string): Record<string, unknown> | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    const expectedSig = createHmac('sha256', AUTH_SECRET).update(data).digest('base64url')
    if (sig !== expectedSig) return null
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'))
  } catch {
    return null
  }
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}
