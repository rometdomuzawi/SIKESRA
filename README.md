# SIKESRA — Sistem Informasi Keuangan & Sosial Perumahan

Aplikasi fullstack untuk manajemen keuangan dan sosial perumahan: iuran sampah, iuran sosial, tabungan kurban, kas masuk/keluar, laporan bulanan, riwayat pembayaran, dashboard grafik, **notifikasi WhatsApp otomatis**, dan **cetak PDF**.

## Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 🔐 Multi-Role Login | Admin, Bendahara, Ketua, Warga — masing-masing dengan menu & izin berbeda |
| 🔒 bcrypt Password | Password di-hash dengan bcrypt (12 rounds) — production-grade |
| 🏘️ Data Warga & Rumah | CRUD warga + rumah, search & filter per blok |
| 🗑️ Uang Sampah | Tagihan bulanan, generate massal, tandai lunas |
| ❤️ Uang Sosial | Tagihan bulanan, generate massal, tandai lunas |
| 🐐 Tabungan Kurban | Tabungan rutin, akumulasi per warga |
| 💰 Kas Masuk/Keluar | Transaksi, kategori, validasi, saldo real-time |
| 📊 Dashboard Grafik | Tren 6 bulan, status pembayaran, distribusi iuran |
| 📄 Laporan Bulanan | Ringkasan + detail per warga, **cetak PDF** (print-friendly) |
| 📜 Riwayat Pembayaran | Filter by jenis, tanggal, warga |
| 💬 Notifikasi WhatsApp | Generate massal pengingat iuran + **kirim otomatis via Fonnte/Twilio** + cron Vercel |
| ⚙️ Pengaturan | Konfigurasi nama perumahan, nilai default iuran |

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, shadcn/ui, Recharts (chart)
- **State**: Zustand (client), TanStack Query (server)
- **Database**: Prisma ORM (SQLite dev → **Supabase PostgreSQL** production)
- **Auth**: Cookie-based session dengan HMAC token signing + **bcrypt password**
- **WhatsApp**: Fonnte / Twilio API + Vercel Cron
- **Icons**: Lucide React

## Akun Demo (Development)

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@perumahan.id` | `admin123` |
| Bendahara | `bendahara@perumahan.id` | `bendahara123` |
| Ketua | `ketua@perumahan.id` | `ketua123` |
| Warga | `warga1@perumahan.id` | `warga123` |

## Setup Lokal

```bash
# 1. Install dependencies
bun install

# 2. Setup database (SQLite untuk dev)
cp .env.example .env
bun run db:push
bun run scripts/seed.ts

# 3. Run dev server
bun run dev
# Buka http://localhost:3000
```

## Deploy ke Vercel + Supabase PostgreSQL

### Langkah 1 — Buat Project Supabase

1. Buka https://supabase.com → buat project baru
2. Pilih region terdekat (Southeast Asia / Singapore)
3. Tunggu provisioning selesai
4. Buka **Settings → Database → Connection string → URI**
5. Copy connection string (format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)

### Langkah 2 — Switch Prisma ke PostgreSQL

```bash
# Switch otomatis via script (ganti provider di schema.prisma)
bun run scripts/switch-db.ts postgresql

# Atau manual: edit prisma/schema.prisma, ganti provider dari "sqlite" ke "postgresql"
```

### Langkah 3 — Push Schema ke Supabase

```bash
# Set DATABASE_URL di .env ke connection string Supabase
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Generate Prisma Client untuk PostgreSQL
bun run db:generate

# Push schema (create tabel)
bun run db:push

# Jalankan seed (opsional, untuk data demo)
bun run scripts/seed.ts
```

### Langkah 4 — Deploy ke Vercel

1. Push project ke GitHub/GitLab
2. Buka https://vercel.com → **New Project** → import repository
3. Tambahkan **Environment Variables** (lihat tabel di bawah)
4. Klik **Deploy**
5. Setelah deploy sukses, jalankan database migration dari local dengan `DATABASE_URL` Supabase:
   ```bash
   bun run db:push
   bun run scripts/seed.ts  # untuk data demo
   ```

### Environment Variables untuk Vercel

| Variable | Wajib | Deskripsi |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string Supabase PostgreSQL |
| `AUTH_SECRET` | ✅ | Random string 32+ karakter — generate via `openssl rand -hex 32` |
| `WA_PROVIDER` | ⚠️ | `fonnte` atau `twilio` — untuk notifikasi WA otomatis |
| `FONNTE_TOKEN` | ⚠️ | Token API Fonnte (jika `WA_PROVIDER=fonnte`) |
| `TWILIO_ACCOUNT_SID` | ⚠️ | Twilio Account SID (jika `WA_PROVIDER=twilio`) |
| `TWILIO_AUTH_TOKEN` | ⚠️ | Twilio Auth Token |
| `TWILIO_WHATSAPP_FROM` | ⚠️ | Nomor Twilio WhatsApp (`whatsapp:+14155238886`) |
| `CRON_SECRET` | ⚠️ | Secret untuk protect cron endpoint — generate via `openssl rand -hex 32` |

Jika `WA_PROVIDER` tidak diset, aplikasi fallback ke **mode manual** — pengguna klik tombol "Buka WhatsApp" yang membuka wa.me dengan pesan pre-filled.

## Konfigurasi WhatsApp Otomatis

### Opsi 1: Fonnte (Recommended, Indonesia)

1. Daftar di https://fonnte.com
2. Top-up credit (mulai dari Rp 10.000)
3. Dapatkan token API di dashboard
4. Set env vars:
   ```
   WA_PROVIDER=fonnte
   FONNTE_TOKEN=xxx
   ```
5. (Opsional) Scan QR untuk connect WhatsApp device di dashboard Fonnte

### Opsi 2: Twilio WhatsApp API

1. Daftar di https://twilio.com
2. Aktifkan WhatsApp Business API
3. Dapatkan Account SID & Auth Token
4. Set env vars:
   ```
   WA_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=ACxxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

### Cron Schedule (Otomatis)

Aplikasi sudah dikonfigurasi dengan Vercel Cron di `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/wa-broadcast",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**Schedule**: `0 1 * * *` = setiap hari jam 01:00 UTC = **08:00 WIB**

Cron akan otomatis:
1. Generate notifikasi pengingat untuk warga yang BELUM_BAYAR iuran di bulan berjalan
2. Kirim semua notifikasi PENDING via WhatsApp provider
3. Update status ke TERKIRIM / GAGAL

Untuk trigger manual dari UI: buka menu **Notifikasi WhatsApp** → klik tombol **"Kirim Semua (Auto)"** (hanya muncul jika provider terkonfigurasi).

## Switch Database Provider

```bash
# Switch ke SQLite (dev)
bun run scripts/switch-db.ts sqlite

# Switch ke PostgreSQL (Supabase production)
bun run scripts/switch-db.ts postgresql

# Setelah switch, selalu jalankan:
bun run db:generate
bun run db:push
```

## Cetak PDF Laporan

1. Buka menu **Laporan Bulanan**
2. Pilih bulan & tahun
3. Klik tombol **Cetak PDF**
4. Browser akan membuka dialog print (Ctrl+P / Cmd+P)
5. Pilih "Save as PDF" sebagai destination
6. Layout sudah dioptimasi untuk A4 dengan CSS `@media print`

CSS print-friendly menyembunyikan sidebar, header, dan tombol aksi (`no-print` class), serta menambahkan page break antara ringkasan dan detail per warga.

## Keamanan Produksi

✅ **Password hashing**: bcrypt 12 rounds (sudah diimplementasi)

⚠️ **Untuk produksi yang sesungguhnya, tambahkan:**
- HTTPS only (sudah otomatis di Vercel)
- Rate limiting di endpoint login (gunakan Vercel Edge Middleware atau Upstash Ratelimit)
- Audit log untuk transaksi keuangan
- Backup database Supabase harian (sudah otomatis di Supabase Free tier)

## Struktur Project

```
src/
├── app/
│   ├── api/                    # 16 API routes
│   │   ├── auth/               # login, logout, me, profil
│   │   ├── cron/               # wa-broadcast (Vercel Cron)
│   │   ├── warga/              # CRUD warga
│   │   ├── rumah/              # CRUD rumah
│   │   ├── uang-sampah/        # CRUD iuran sampah
│   │   ├── uang-sosial/        # CRUD iuran sosial
│   │   ├── tabungan-kurban/    # CRUD tabungan kurban
│   │   ├── kas/                # CRUD transaksi kas
│   │   ├── notifikasi/         # CRUD + send + status
│   │   ├── laporan/            # GET laporan bulanan
│   │   ├── dashboard/          # GET stats dashboard
│   │   ├── riwayat/            # GET riwayat pembayaran
│   │   ├── users/              # CRUD user (admin)
│   │   └── pengaturan/         # CRUD pengaturan
│   ├── layout.tsx
│   └── page.tsx                # Single-page app dengan client routing
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── views/                  # 9 view komponen
│   ├── app-shell.tsx           # Sidebar + header layout
│   ├── login-page.tsx
│   └── providers.tsx           # TanStack Query provider
├── lib/
│   ├── auth.ts                 # bcrypt + HMAC session
│   ├── session.ts              # getSession + role helpers
│   ├── wa-provider.ts          # Fonnte/Twilio abstraction
│   ├── format.ts               # formatRupiah, formatTanggal, waLink
│   ├── store.ts                # Zustand page state
│   ├── nav.ts                  # Nav config per role
│   └── db.ts                   # Prisma client
prisma/
└── schema.prisma               # 9 model + 3 enum
scripts/
├── seed.ts                     # Data demo
└── switch-db.ts                # Switch SQLite ↔ PostgreSQL
vercel.json                     # Cron schedule
.env.example                    # Template env vars
```

## Lisensi

MIT License — bebas digunakan untuk komunitas perumahan.
