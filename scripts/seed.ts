// Seed script - mengisi database awal dengan data demo
import { PrismaClient, Role, PaymentStatus, KasJenis } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Hapus data lama
  await prisma.notifikasi.deleteMany()
  await prisma.riwayatPembayaran.deleteMany()
  await prisma.kas.deleteMany()
  await prisma.uangSampah.deleteMany()
  await prisma.uangSosial.deleteMany()
  await prisma.warga.deleteMany()
  await prisma.rumah.deleteMany()
  await prisma.user.deleteMany()
  await prisma.pengaturan.deleteMany()

  // === USERS ===
  const admin = await prisma.user.create({
    data: {
      email: 'admin@perumahan.id',
      password: await hashPassword('admin123'),
      name: 'Administrator',
      role: Role.ADMIN,
      phone: '6281111111111',
    },
  })

  const bendahara = await prisma.user.create({
    data: {
      email: 'bendahara@perumahan.id',
      password: await hashPassword('bendahara123'),
      name: 'Siti Aminah',
      role: Role.BENDAHARA,
      phone: '6281111111122',
    },
  })

  const ketua = await prisma.user.create({
    data: {
      email: 'ketua@perumahan.id',
      password: await hashPassword('ketua123'),
      name: 'Budi Santoso',
      role: Role.KETUA,
      phone: '6281111111133',
    },
  })

  // === WARGA (8 KK) ===
  const wargaData = [
    { nama: 'Ahmad Fauzi', nik: '3201010101900001', telepon: '6281234567001', pekerjaan: 'PNS', blok: 'A', nomor: 'A1' },
    { nama: 'Dewi Lestari', nik: '3201010202900002', telepon: '6281234567002', pekerjaan: 'Guru', blok: 'A', nomor: 'A2' },
    { nama: 'Hendra Wijaya', nik: '3201010303900003', telepon: '6281234567003', pekerjaan: 'Wiraswasta', blok: 'A', nomor: 'A3' },
    { nama: 'Maya Sari', nik: '3201010404900004', telepon: '6281234567004', pekerjaan: 'Karyawan Swasta', blok: 'A', nomor: 'A4' },
    { nama: 'Rizki Ramadhan', nik: '3201010505900005', telepon: '6281234567005', pekerjaan: 'Dokter', blok: 'B', nomor: 'B1' },
    { nama: 'Nurul Hidayah', nik: '3201010606900006', telepon: '6281234567006', pekerjaan: 'Perawat', blok: 'B', nomor: 'B2' },
    { nama: 'Eko Prasetyo', nik: '3201010707900007', telepon: '6281234567007', pekerjaan: 'Pengusaha', blok: 'B', nomor: 'B3' },
    { nama: 'Wati Susanti', nik: '3201010808900008', telepon: '6281234567008', pekerjaan: 'Ibu Rumah Tangga', blok: 'B', nomor: 'B4' },
  ]

  const now = new Date()
  const tahun = now.getFullYear()
  const bulan = now.getMonth() + 1 // 1-12

  // Buat user login untuk warga pertama (demo)
  const wargaUsers = []
  for (let i = 0; i < wargaData.length; i++) {
    const u = wargaData[i]
    const user = await prisma.user.create({
      data: {
        email: `warga${i + 1}@perumahan.id`,
        password: await hashPassword('warga123'),
        name: u.nama,
        role: Role.WARGA,
        phone: u.telepon,
      },
    })
    wargaUsers.push({ ...u, userId: user.id })
  }

  // Buat rumah dan warga
  const wargaList = []
  for (const w of wargaUsers) {
    const rumah = await prisma.rumah.create({
      data: {
        nomor: w.nomor,
        blok: w.blok,
        alamat: `Perumahan Griya Asri Blok ${w.blok} No. ${w.nomor}`,
        tipe: '36/90',
      },
    })

    const warga = await prisma.warga.create({
      data: {
        userId: w.userId,
        nik: w.nik,
        nama: w.nama,
        telepon: w.telepon,
        alamat: rumah.alamat,
        pekerjaan: w.pekerjaan,
        rumahId: rumah.id,
      },
    })
    wargaList.push(warga)
  }

  console.log(`✓ Created ${wargaList.length} warga`)

  // === UANG SAMPAH (3 bulan terakhir) ===
  const jumlahSampah = 30000
  for (const warga of wargaList) {
    for (let i = 0; i < 3; i++) {
      const b = bulan - i <= 0 ? bulan - i + 12 : bulan - i
      const t = bulan - i <= 0 ? tahun - 1 : tahun
      const isLunas = i > 0 || Math.random() > 0.4
      await prisma.uangSampah.create({
        data: {
          wargaId: warga.id,
          bulan: b,
          tahun: t,
          jumlah: jumlahSampah,
          status: isLunas ? PaymentStatus.LUNAS : PaymentStatus.BELUM_BAYAR,
          tanggalBayar: isLunas ? new Date(t, b - 1, Math.floor(Math.random() * 28) + 1) : null,
          metode: isLunas ? 'TUNAI' : null,
        },
      })
    }
  }

  // === UANG SOSIAL ===
  const jumlahSosial = 50000
  for (const warga of wargaList) {
    for (let i = 0; i < 3; i++) {
      const b = bulan - i <= 0 ? bulan - i + 12 : bulan - i
      const t = bulan - i <= 0 ? tahun - 1 : tahun
      const isLunas = i > 0 || Math.random() > 0.5
      await prisma.uangSosial.create({
        data: {
          wargaId: warga.id,
          bulan: b,
          tahun: t,
          jumlah: jumlahSosial,
          status: isLunas ? PaymentStatus.LUNAS : PaymentStatus.BELUM_BAYAR,
          tanggalBayar: isLunas ? new Date(t, b - 1, Math.floor(Math.random() * 28) + 1) : null,
          metode: isLunas ? 'TUNAI' : null,
        },
      })
    }
  }

  // === KAS ===
  const kategoriMasuk = ['Iuran Warga', 'Donasi', 'Lain-lain']
  const kategoriKeluar = ['Pembelian', 'Perbaikan', 'Honor', 'Konsumsi', 'Lain-lain']

  for (let i = 0; i < 30; i++) {
    const isMasuk = Math.random() > 0.45
    const tanggal = new Date(tahun, Math.max(0, bulan - 1 - Math.floor(i / 10)), Math.floor(Math.random() * 28) + 1)
    const jumlah = isMasuk
      ? Math.floor(Math.random() * 8 + 2) * 50000
      : Math.floor(Math.random() * 6 + 1) * 50000

    await prisma.kas.create({
      data: {
        jenis: isMasuk ? KasJenis.MASUK : KasJenis.KELUAR,
        kategori: isMasuk ? kategoriMasuk[Math.floor(Math.random() * kategoriMasuk.length)] : kategoriKeluar[Math.floor(Math.random() * kategoriKeluar.length)],
        jumlah,
        keterangan: `Transaksi ${isMasuk ? 'pemasukan' : 'pengeluaran'} untuk ${kategoriMasuk[0].toLowerCase()}`,
        tanggal,
        bendaharaId: bendahara.id,
      },
    })
  }

  console.log('✓ Created 30 kas transactions')

  // === RIWAYAT PEMBAYARAN (dari pembayaran lunas) ===
  const lunasSampah = await prisma.uangSampah.findMany({ where: { status: PaymentStatus.LUNAS } })
  for (const p of lunasSampah) {
    await prisma.riwayatPembayaran.create({
      data: {
        wargaId: p.wargaId,
        jenis: 'SAMPAH',
        bulan: p.bulan,
        tahun: p.tahun,
        jumlah: p.jumlah,
        tanggal: p.tanggalBayar || new Date(),
        metode: p.metode,
      },
    })
  }
  const lunasSosial = await prisma.uangSosial.findMany({ where: { status: PaymentStatus.LUNAS } })
  for (const p of lunasSosial) {
    await prisma.riwayatPembayaran.create({
      data: {
        wargaId: p.wargaId,
        jenis: 'SOSIAL',
        bulan: p.bulan,
        tahun: p.tahun,
        jumlah: p.jumlah,
        tanggal: p.tanggalBayar || new Date(),
        metode: p.metode,
      },
    })
  }
  console.log('✓ Synced riwayat pembayaran')

  // === PENGATURAN ===
  await prisma.pengaturan.createMany({
    data: [
      { key: 'NAMA_PERUMAHAN', value: 'Perumahan Griya Asri' },
      { key: 'ALAMAT_PERUMAHAN', value: 'Jl. Melati No. 1, Kota Sentosa' },
      { key: 'IURAN_SAMPAH', value: '30000' },
      { key: 'IURAN_SOSIAL', value: '50000' },
      { key: 'KETUA_KETUA', value: ketua.name },
      { key: 'KETUA_BENDAHARA', value: bendahara.name },
    ],
  })

  // === NOTIFIKASI CONTOH ===
  await prisma.notifikasi.createMany({
    data: [
      {
        wargaId: wargaList[0].id,
        senderId: bendahara.id,
        jenis: 'SAMPAH',
        pesan: `Pengingat: Iuran sampah bulan ${bulan}/${tahun} sebesar Rp 30.000 belum dibayarkan. Mohon segera lakukan pembayaran ke Bendahara.`,
        status: 'PENDING',
      },
      {
        wargaId: wargaList[1].id,
        senderId: bendahara.id,
        jenis: 'SOSIAL',
        pesan: `Pengingat: Iuran sosial bulan ${bulan}/${tahun} sebesar Rp 50.000 belum dibayarkan.`,
        status: 'PENDING',
      },
    ],
  })

  console.log('\n🎉 Seeding selesai!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Login Demo:')
  console.log(`  Admin      : admin@perumahan.id / admin123`)
  console.log(`  Bendahara  : bendahara@perumahan.id / bendahara123`)
  console.log(`  Ketua      : ketua@perumahan.id / ketua123`)
  console.log(`  Warga      : warga1@perumahan.id / warga123`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
