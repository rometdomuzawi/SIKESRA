#!/usr/bin/env bun
/**
 * Switch Prisma provider antara sqlite (dev) dan postgresql (Supabase production).
 *
 * Cara pakai:
 *   bun run scripts/switch-db.ts sqlite       # untuk development
 *   bun run scripts/switch-db.ts postgresql   # untuk produksi (Supabase)
 *
 * Setelah switch, jalankan:
 *   bun run db:generate
 *   bun run db:push
 *   bun run scripts/seed.ts   # opsional, untuk data demo
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const schemaPath = resolve(import.meta.dir, '../prisma/schema.prisma')
const target = process.argv[2]

if (!target || !['sqlite', 'postgresql'].includes(target)) {
  console.error('Usage: bun run scripts/switch-db.ts <sqlite|postgresql>')
  process.exit(1)
}

let schema = readFileSync(schemaPath, 'utf-8')
schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${target}"`)
writeFileSync(schemaPath, schema)

console.log(`✓ Prisma provider switched to "${target}"`)
console.log('')
console.log('Next steps:')
console.log('  1. Set DATABASE_URL in .env to your connection string')
console.log('  2. bun run db:generate')
console.log('  3. bun run db:push')
console.log('  4. bun run scripts/seed.ts  (optional, for demo data)')
