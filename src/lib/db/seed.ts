import bcrypt from 'bcryptjs';
import { DEFAULT_LOW_PRICING, HIGH_PACKAGES } from '@/lib/pricing';
import { generateId, toIso } from '@/lib/utils';
import type {
  AnnouncementRecord,
  BlogCategoryRecord,
  BlogPostRecord,
  CouponRecord,
  FaqItemRecord,
  KnowledgeArticleRecord,
  LegalDocumentRecord,
  CmsPageRecord,
  PackageRecord,
  PricingRulesRecord,
  ProductRecord,
  ProfileRecord,
  Role,
  SettingsRecord,
  UserRecord,
} from '@/types';
import type { JsonCollections } from './json-store';

/**
 * Seed awal datastore lokal.
 * Semua konten adalah konten nyata WangStore, bukan placeholder.
 * Testimoni sengaja dikosongkan — WangStore tidak membuat testimoni palsu.
 */

const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin@wangstore.id';
const envAdminPassword = process.env.ADMIN_PASSWORD?.trim() || '';

/** Kredensial development default (HANYA untuk mode JSON lokal, wajib diganti). */
const DEV_ADMIN_PASSWORD = 'WangStoreDevAdmin2026!';
const DEV_STAFF_PASSWORD = 'WangStoreDevStaff2026!';

function panelUser(email: string, role: Role): Omit<UserRecord, 'passwordHash'> {
  const now = toIso();
  return {
    id: generateId('us'),
    email,
    role,
    emailVerified: true,
    emailVerificationToken: null,
    resetToken: null,
    resetTokenExpiresAt: null,
    tokenVersion: 1,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
}

const PRODUCTS: ProductRecord[] = [
  {
    id: generateId('pr'),
    slug: 'minecraft-hosting',
    name: 'Minecraft Hosting',
    description:
      'Server Minecraft dengan konfigurasi custom — tentukan CPU, RAM, dan penyimpanan sesuai kebutuhan Anda melalui Server Builder.',
    tier: 'low',
    status: 'active',
    packageId: null,
    price: null,
    visibility: 'public',
    metadata: {},
    sortOrder: 1,
    createdAt: toIso(),
    updatedAt: toIso(),
  },
  {
    id: generateId('pr'),
    slug: 'minecraft-hosting-high',
    name: 'Minecraft Hosting High',
    description:
      'Server Minecraft performa tinggi dengan paket tetap dan harga final. Cocok untuk komunitas dengan banyak pemain konkuren.',
    tier: 'high',
    status: 'active',
    packageId: null,
    price: null,
    visibility: 'public',
    metadata: {},
    sortOrder: 2,
    createdAt: toIso(),
    updatedAt: toIso(),
  },
  {
    id: generateId('pr'),
    slug: 'vps',
    name: 'VPS',
    description:
      'Virtual Private Server untuk kebutuhan developer dan aplikasi. Layanan ini sedang dipersiapkan dan belum dapat dipesan.',
    tier: 'medium',
    status: 'active',
    packageId: null,
    price: null,
    visibility: 'public',
    metadata: {},
    sortOrder: 3,
    createdAt: toIso(),
    updatedAt: toIso(),
  },
  {
    id: generateId('pr'),
    slug: 'dedicated-server',
    name: 'Dedicated Server',
    description:
      'Server fisik khusus untuk beban kerja besar. Layanan ini sedang dipersiapkan dan belum dapat dipesan.',
    tier: 'medium',
    status: 'active',
    packageId: null,
    price: null,
    visibility: 'public',
    metadata: {},
    sortOrder: 4,
    createdAt: toIso(),
    updatedAt: toIso(),
  },
  {
    id: generateId('pr'),
    slug: 'panel-hosting',
    name: 'Panel Hosting',
    description:
      'Hosting panel untuk pengelolaan server game. Layanan ini sedang dipersiapkan dan belum dapat dipesan.',
    tier: 'medium',
    status: 'active',
    packageId: null,
    price: null,
    visibility: 'public',
    metadata: {},
    sortOrder: 5,
    createdAt: toIso(),
    updatedAt: toIso(),
  },
];

function packages(): PackageRecord[] {
  return HIGH_PACKAGES.map((pkg) => ({
    id: pkg.id,
    label: pkg.label,
    tier: pkg.tier,
    cpu: pkg.cpu,
    ramGb: pkg.ramGb,
    storageGb: pkg.storageGb,
    price: pkg.price,
    popular: pkg.popular,
    active: true,
    sortOrder: pkg.sortOrder,
    createdAt: toIso(),
    updatedAt: toIso(),
  }));
}

function pricingRules(): PricingRulesRecord[] {
  return [
    {
      id: 'pricing-low',
      base: DEFAULT_LOW_PRICING.base,
      perCore: DEFAULT_LOW_PRICING.perCore,
      perGbRam: DEFAULT_LOW_PRICING.perGbRam,
      perGbStorage: DEFAULT_LOW_PRICING.perGbStorage,
      roundTo: DEFAULT_LOW_PRICING.roundTo,
      minPrice: DEFAULT_LOW_PRICING.minPrice,
      updatedBy: null,
      updatedAt: toIso(),
    },
  ];
}

function coupons(): CouponRecord[] {
  return [
    {
      id: generateId('cp'),
      code: 'WANGSTORE10',
      type: 'percentage',
      value: 10,
      minOrder: 100_000,
      maxUses: null,
      usedCount: 0,
      usesPerCustomer: 1,
      active: true,
      startsAt: null,
      expiresAt: null,
      applicableTiers: [],
      applicablePackages: [],
      createdBy: null,
      createdAt: toIso(),
      updatedAt: toIso(),
    },
  ];
}

function settings(): SettingsRecord[] {
  return [
    {
      siteName: 'WangStore',
      tagline: 'Build Your Own Server.',
      siteDescription:
        'WangStore adalah platform untuk menjual dan mengelola layanan hosting — Minecraft Hosting, VPS, Dedicated Server, dan Panel Hosting. Bangun server Anda sendiri dengan Server Builder.',
      whatsappNumber: process.env.WHATSAPP_NUMBER?.trim() ?? '',
      discordInviteUrl: process.env.DISCORD_INVITE_URL?.trim() ?? '',
      contactEmail: process.env.CONTACT_EMAIL?.trim() ?? '',
      maintenanceMode: false,
      maintenanceTitle: 'Sedang Dalam Pemeliharaan',
      maintenanceMessage:
        'WangStore sedang dalam pemeliharaan terjadwal. Kami akan segera kembali. Terima kasih atas kesabaran Anda.',
      maintenanceEstimatedRestoration: '',
      maintenanceAllowedPaths: ['/status'],
      platformStatus: 'operational',
      services: [
        { name: 'Website & API', status: 'operational', description: 'Halaman web, Server Builder, dan API pemesanan.' },
        { name: 'Sistem Pemesanan', status: 'operational', description: 'Pembuatan order dan integrasi WhatsApp.' },
        { name: 'Panel Pelanggan', status: 'operational', description: 'Dashboard pelanggan dan tiket dukungan.' },
      ],
      infrastructureNote:
        'WangStore adalah platform penjualan dan pengelolaan layanan hosting. Infrastruktur hosting pelanggan berada di luar aplikasi dan dioperasikan oleh penyedia layanan yang bekerja sama dengan WangStore.',
      locations: [],
      paymentInstructions:
        'Pembayaran dilakukan secara manual melalui konfirmasi admin. Setelah order dibuat, tim kami akan menghubungi Anda melalui WhatsApp untuk detail pembayaran dan aktivasi layanan.',
      announcementBanner: '',
    },
  ];
}

const FAQ_ITEMS: FaqItemRecord[] = [
  {
    id: generateId('fq'),
    question: 'Apa itu WangStore?',
    answer:
      'WangStore adalah platform untuk menjual dan mengelola layanan hosting, seperti Minecraft Hosting, VPS, Dedicated Server, dan Panel Hosting. Anda dapat memilih dan mengonfigurasi layanan melalui Server Builder, membuat pesanan, dan mengelola pesanan Anda melalui dashboard pelanggan.',
    category: 'Umum',
    sortOrder: 1,
    active: true,
  },
  {
    id: generateId('fq'),
    question: 'Bagaimana cara memesan layanan?',
    answer:
      'Buka halaman Server Builder, pilih tier (Low atau High), tentukan konfigurasi (CPU, RAM, penyimpanan) atau pilih paket, lalu klik "Pesan Sekarang". Isi formulir pemesanan, setujui kebijakan, dan buat pesanan. Anda akan diarahkan ke WhatsApp untuk konfirmasi dengan tim kami.',
    category: 'Pemesanan',
    sortOrder: 2,
    active: true,
  },
  {
    id: generateId('fq'),
    question: 'Apa perbedaan tier Low dan tier High?',
    answer:
      'Tier Low menggunakan konfigurasi custom: Anda menentukan sendiri jumlah CPU (2–16 vCore), RAM (4–32 GB), dan penyimpanan (20–160 GB), dengan harga dihitung otomatis. Tier High menggunakan paket tetap dengan spesifikasi dan harga final yang sudah ditentukan.',
    category: 'Umum',
    sortOrder: 3,
    active: true,
  },
  {
    id: generateId('fq'),
    question: 'Mengapa tier Medium tidak bisa dipesan?',
    answer:
      'Tier Medium sedang dipersiapkan dan belum tersedia untuk pemesanan. Kami akan mengumumkan ketersediaannya melalui halaman Status dan pengumuman resmi WangStore.',
    category: 'Pemesanan',
    sortOrder: 4,
    active: true,
  },
  {
    id: generateId('fq'),
    question: 'Apakah harga di Server Builder sudah final?',
    answer:
      'Harga yang ditampilkan Server Builder adalah estimasi real-time yang dihitung dengan mesin harga WangStore. Untuk tier High, harga paket bersifat final. Harga resmi order dihitung ulang oleh server saat pemesanan dan ditampilkan di halaman konfirmasi order.',
    category: 'Pembayaran',
    sortOrder: 5,
    active: true,
  },
  {
    id: generateId('fq'),
    question: 'Metode pembayaran apa yang tersedia?',
    answer:
      'Saat ini pembayaran diproses secara manual melalui konfirmasi admin. Setelah order dibuat, tim WangStore akan menghubungi Anda melalui WhatsApp untuk detail pembayaran. Kami tidak pernah meminta pembayaran di luar kanal resmi.',
    category: 'Pembayaran',
    sortOrder: 6,
    active: true,
  },
  {
    id: generateId('fq'),
    question: 'Apakah ada masa percobaan (trial) atau pengembalian dana?',
    answer:
      'Tidak. Semua pembelian bersifat final. WangStore tidak menyediakan trial, money-back guarantee, atau refund karena berubah pikiran. Kompensasi hanya diberikan jika kesalahan terbukti berasal dari WangStore, dalam bentuk kredit layanan. Baca Kebijakan Refund untuk detail lengkap.',
    category: 'Kebijakan',
    sortOrder: 7,
    active: true,
  },
  {
    id: generateId('fq'),
    question: 'Apakah angka estimasi performa dijamin?',
    answer:
      'Tidak. Estimasi TPS, pemain konkuren, penggunaan CPU/RAM, dan rekomendasi plugin adalah estimasi model deterministik berdasarkan konfigurasi yang Anda pilih. Angka tersebut bukan SLA atau jaminan performa. Performa aktual bergantung pada banyak faktor di luar konfigurasi.',
    category: 'Umum',
    sortOrder: 8,
    active: true,
  },
  {
    id: generateId('fq'),
    question: 'Bagaimana cara menghubungi tim WangStore?',
    answer:
      'Anda dapat menghubungi kami melalui WhatsApp (nomor tertera di halaman Kontak), Discord, email, atau dengan membuat tiket dukungan dari dashboard pelanggan. Kanal kontak yang aktif selalu ditampilkan di halaman Kontak.',
    category: 'Umum',
    sortOrder: 9,
    active: true,
  },
  {
    id: generateId('fq'),
    question: 'Apakah WangStore menjalankan server pelanggan di aplikasinya?',
    answer:
      'Tidak. WangStore adalah platform penjualan dan pengelolaan layanan hosting. Infrastruktur hosting pelanggan berada di luar aplikasi dan dioperasikan oleh penyedia layanan yang bekerja sama dengan WangStore.',
    category: 'Umum',
    sortOrder: 10,
    active: true,
  },
];

const BLOG_CATEGORIES: BlogCategoryRecord[] = [
  { id: generateId('bc'), slug: 'panduan', name: 'Panduan', description: 'Panduan praktis menggunakan layanan WangStore.' },
  { id: generateId('bc'), slug: 'minecraft', name: 'Minecraft', description: 'Artikel seputar server Minecraft dan komunitasnya.' },
  { id: generateId('bc'), slug: 'pengumuman', name: 'Pengumuman', description: 'Pengumuman resmi dari tim WangStore.' },
];

const BLOG_POSTS: BlogPostRecord[] = [
  {
    id: generateId('bp'),
    slug: 'memilih-ram-server-minecraft',
    title: 'Cara Memilih RAM yang Tepat untuk Server Minecraft',
    excerpt:
      'RAM adalah komponen yang paling sering disalahpahami saat memilih server Minecraft. Artikel ini menjelaskan cara memperkirakan kebutuhan RAM berdasarkan jumlah pemain dan jenis server Anda.',
    content: `Memilih jumlah RAM untuk server Minecraft sering kali menjadi keputusan yang membingungkan. Terlalu sedikit membuat server lag dan crash; terlalu banyak membuat Anda membayar kapasitas yang tidak terpakai.

## Apa yang menggunakan RAM di server Minecraft?

Secara garis besar, RAM server digunakan oleh tiga hal:

1. **Proses dasar server** — menjalankan server itu sendiri, biasanya sekitar 2 GB.
2. **Dunia yang dimuat** — chunk yang dimuat di sekitar pemain aktif membutuhkan memori.
3. **Plugin dan mod** — semakin banyak plugin, semakin besar konsumsi RAM.

## Perkiraan sederhana

Sebagai titik awal, anggarkan sekitar **150–250 MB per pemain konkuren** di atas kebutuhan dasar. Untuk 10 pemain konkuren, konfigurasi 4 GB biasanya cukup untuk server vanilla; 6 GB lebih nyaman jika menggunakan beberapa plugin.

## Cara memilih di Server Builder WangStore

Server Builder menampilkan estimasi penggunaan RAM berdasarkan konfigurasi yang Anda pilih. Gunakan angka tersebut sebagai panduan, lalu pertimbangkan pertumbuhan komunitas Anda:

- **Server kecil (2–8 pemain)** — mulai dari 4 GB.
- **Server komunitas (10–30 pemain)** — 8–12 GB adalah titik yang umum.
- **Server besar / banyak plugin (30+ pemain)** — pertimbangkan 16 GB atau lebih, dengan CPU yang memadai.

Ingat: estimasi di Server Builder bukan jaminan performa. Kebutuhan aktual bergantung pada versi server, jumlah plugin, dan perilaku pemain di dunia Anda.

## Kesimpulan

Pilih RAM dengan ruang kepala (headroom), bukan angka yang pas-pasan. Jika ragu antara dua pilihan, konsultasikan dengan tim kami melalui WhatsApp atau tiket sebelum memesan — pembelian bersifat final.`,
    categoryId: BLOG_CATEGORIES[1]?.id ?? null,
    tags: ['minecraft', 'ram', 'server'],
    author: 'Tim WangStore',
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 30 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 30 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 30 * 86_400_000)),
  },
  {
    id: generateId('bp'),
    slug: 'perbedaan-tier-low-dan-high',
    title: 'Perbedaan Tier Low dan Tier High di WangStore',
    excerpt:
      'WangStore menyediakan dua cara membeli server Minecraft: konfigurasi custom (tier Low) dan paket tetap (tier High). Mana yang cocok untuk Anda?',
    content: `Di WangStore Anda akan menemukan dua tier yang dapat dipesan: **Low** dan **High**. Keduanya melayani kebutuhan yang berbeda.

## Tier Low — Konfigurasi Custom

Tier Low menggunakan prosesor Intel Xeon E5-2690 v4 dan memberi Anda kebebasan menentukan:

- **CPU**: 2 hingga 16 vCore
- **RAM**: 4 hingga 32 GB
- **Penyimpanan**: 20 hingga 160 GB

Harga dihitung otomatis dari kombinasi yang Anda pilih, dengan harga minimum Rp45.000/bulan. Tier Low cocok untuk Anda yang ingin mengontrol spesifikasi secara presisi sesuai anggaran.

## Tier High — Paket Tetap

Tier High menggunakan prosesor AMD Ryzen 9 9950X dengan performa per core yang jauh lebih tinggi. Spesifikasi ditentukan dalam paket tetap, misalnya paket populer **4 core / 8 GB / 50 GB** seharga Rp600.000/bulan.

Keunggulan tier High adalah kepastian: spesifikasi dan harga sudah final sejak awal, dan faktor performa per core-nya lebih tinggi untuk komunitas dengan aktivitas padat.

## Mana yang harus dipilih?

- **Budget terbatas, komunitas kecil** → mulai dari tier Low dengan konfigurasi minimum.
- **Komunitas aktif, banyak plugin, butuh performa** → tier High, sesuaikan paket dengan jumlah pemain.
- **Tidak yakin** → gunakan estimasi di Server Builder untuk membandingkan, atau konsultasikan dengan tim kami.

Tier Medium saat ini berstatus *ongoing* dan belum dapat dipesan. Pantau halaman Status untuk informasi ketersediaannya.`,
    categoryId: BLOG_CATEGORIES[0]?.id ?? null,
    tags: ['tier', 'panduan', 'harga'],
    author: 'Tim WangStore',
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 14 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 14 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 14 * 86_400_000)),
  },
  {
    id: generateId('bp'),
    slug: 'membaca-estimasi-performa-server-builder',
    title: 'Cara Membaca Estimasi Performa di Server Builder',
    excerpt:
      'Server Builder menampilkan estimasi TPS, pemain konkuren, penggunaan CPU/RAM, dan grade build. Begini cara membaca angka-angka tersebut dengan benar.',
    content: `Saat Anda mengatur konfigurasi di Server Builder, panel estimasi menampilkan beberapa angka. Artikel ini menjelaskan arti setiap angka dan batasannya.

## TPS (Ticks Per Second)

TPS adalah ukuran seberapa cepat server memproses logika dunia. Server Minecraft berjalan pada 20 TPS; nilai di bawah 20 menandakan server mulai tertinggal. Estimasi TPS di WangStore menggambarkan kondisi beban tipikal, bukan kondisi terburuk.

## Pemain Konkuren

Angka pemain konkuren adalah perkiraan jumlah pemain yang bermain **bersamaan** dengan nyaman. Perlu diingat: komunitas dengan 50 anggota jarang memiliki 50 pemain online sekaligus.

## Penggunaan CPU dan RAM

Estimasi penggunaan menunjukkan beban tipikal server game. RAM yang tersisa (headroom) berguna untuk sistem operasi, plugin tambahan, dan lonjakan aktivitas.

## Grade Build

Grade (D hingga A+) merangkum keseimbangan konfigurasi Anda dalam satu huruf. Grade rendah biasanya berarti CPU atau RAM terlalu ketat untuk target pemain Anda.

## Batasan estimasi

Estimasi dihitung dari model deterministik yang hanya mempertimbangkan CPU, RAM, penyimpanan, dan tier yang Anda pilih. Model ini **tidak** memperhitungkan versi Minecraft, plugin tertentu, atau perilaku pemain. Semua angka adalah **estimasi**, bukan jaminan performa.

Gunakan estimasi untuk membandingkan konfigurasi, lalu lakukan uji coba nyata di server Anda setelah layanan aktif.`,
    categoryId: BLOG_CATEGORIES[0]?.id ?? null,
    tags: ['server-builder', 'estimasi', 'panduan'],
    author: 'Tim WangStore',
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 7 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 7 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 7 * 86_400_000)),
  },
];

const KB_ARTICLES: KnowledgeArticleRecord[] = [
  {
    id: generateId('ka'),
    slug: 'cara-membuat-server-pertama',
    title: 'Cara Membuat Server Pertama Anda',
    excerpt: 'Langkah demi langkah memesan layanan pertama Anda di WangStore, dari Server Builder hingga konfirmasi order.',
    content: `Memulai dengan WangStore hanya membutuhkan beberapa menit.

## 1. Buka Server Builder

Klik **Buat Server** di beranda atau menu navigasi.

## 2. Pilih tier

- **Low** — konfigurasi custom (CPU, RAM, penyimpanan Anda tentukan sendiri).
- **High** — paket tetap dengan harga final.
- **Medium** — sedang dipersiapkan, belum dapat dipesan.

## 3. Tentukan konfigurasi

Untuk tier Low, geser slider CPU, RAM, dan Penyimpanan. Harga dan estimasi performa diperbarui secara real-time. Untuk tier High, pilih paket yang sesuai.

## 4. Isi formulir pemesanan

Isi nama, nomor WhatsApp, email, nama server, catatan (opsional), dan kupon (jika ada). Centang persetujuan kebijakan, lalu klik **Buat Order**.

## 5. Konfirmasi melalui WhatsApp

Setelah order dibuat, Anda akan diarahkan ke WhatsApp untuk konfirmasi dengan tim kami. Simpan Order ID Anda.

## 6. Pantau melalui dashboard

Buat akun (jika belum) dan login ke dashboard untuk melihat status order, tiket, dan konfigurasi tersimpan.

> Pembelian bersifat final. Pastikan konfigurasi sudah benar sebelum membuat order.`,
    category: 'Memulai',
    tags: ['pemula', 'pemesanan'],
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 20 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 20 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 20 * 86_400_000)),
  },
  {
    id: generateId('ka'),
    slug: 'memahami-server-builder',
    title: 'Memahami Server Builder',
    excerpt: 'Penjelasan lengkap tentang tier, slider konfigurasi, estimasi performa, dan cara kerja harga di Server Builder.',
    content: `Server Builder adalah fitur inti WangStore untuk menentukan layanan yang ingin Anda beli.

## Tier yang tersedia

| Tier | Prosesor | Mode | Status |
| --- | --- | --- | --- |
| Low | Intel Xeon E5-2690 v4 | Custom | Tersedia |
| Medium | Intel Xeon Gold 6138 | Paket | Ongoing |
| High | AMD Ryzen 9 9950X | Paket | Tersedia |

## Batas konfigurasi tier Low

- **CPU**: 2–16 vCore
- **RAM**: 4–32 GB
- **Penyimpanan**: 20–160 GB

Tidak ada pilihan sistem operasi, versi Minecraft, panel, add-on, region, atau siklus penagihan — konfigurasi dibuat sederhana dan cepat.

## Bagaimana harga dihitung?

Harga tier Low dihitung dari rumus terbuka: biaya dasar + (CPU × harga per core) + (RAM × harga per GB) + (Penyimpanan × harga per GB), dibulatkan ke kelipatan Rp500 dengan harga minimum Rp45.000/bulan. Harga tier High adalah harga paket final.

Harga yang dipakai untuk order dihitung ulang oleh server — nilai harga dari browser tidak pernah dipercaya.

## Estimasi performa

TPS, pemain konkuren, penggunaan CPU/RAM, rekomendasi plugin, dan grade build adalah **estimasi** dari model deterministik. Estimasi bukan SLA atau jaminan performa.`,
    category: 'Pemesanan',
    tags: ['server-builder', 'harga'],
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 20 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 20 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 20 * 86_400_000)),
  },
  {
    id: generateId('ka'),
    slug: 'metode-pembayaran',
    title: 'Pembayaran dan Konfirmasi Order',
    excerpt: 'Bagaimana pembayaran diproses di WangStore dan apa yang terjadi setelah Anda membuat order.',
    content: `## Status order

Setiap order di WangStore memiliki status yang selalu dapat Anda lihat di halaman konfirmasi order dan dashboard pelanggan:

- **pending** — order dibuat, menunggu diproses tim.
- **awaiting_payment** — menunggu pembayaran Anda.
- **paid** — pembayaran diterima.
- **processing** — layanan sedang disiapkan.
- **completed** — layanan aktif.
- **cancelled / expired / refunded** — order berakhir.

## Bagaimana pembayaran dilakukan?

Pembayaran diproses secara manual melalui konfirmasi admin. Setelah membuat order, hubungi kami melalui WhatsApp (tombol tersedia di halaman konfirmasi) untuk detail pembayaran.

WangStore **tidak pernah** meminta Anda melakukan pembayaran sebelum order resmi dibuat dan terverifikasi.

## Apa yang terjadi setelah pembayaran?

1. Tim kami memverifikasi pembayaran Anda.
2. Status order diperbarui menjadi *paid*, lalu *processing*.
3. Layanan disiapkan dan detail akses dikirim melalui kanal resmi (WhatsApp/email).
4. Status menjadi *completed* saat layanan aktif.

Jika order Anda tidak kunjung berubah status dalam waktu wajar, buat tiket dukungan dari dashboard.`,
    category: 'Pembayaran',
    tags: ['pembayaran', 'order'],
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 18 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 18 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 18 * 86_400_000)),
  },
  {
    id: generateId('ka'),
    slug: 'rekomendasi-konfigurasi-minecraft',
    title: 'Rekomendasi Konfigurasi untuk Server Minecraft',
    excerpt: 'Titik awal konfigurasi yang umum untuk berbagai skala server Minecraft.',
    content: `Rekomendasi berikut adalah **titik awal**, bukan jaminan performa. Kebutuhan aktual bergantung pada versi server, plugin, dan perilaku pemain.

## Server pribadi / teman (2–6 pemain)

- Tier Low: 2 core, 4 GB RAM, 20 GB penyimpanan
- Cocok untuk server vanilla atau beberapa plugin ringan.

## Server komunitas kecil (8–15 pemain)

- Tier Low: 3–4 core, 8 GB RAM, 30–40 GB penyimpanan
- Ruang untuk 20–40 plugin ringan.

## Server komunitas aktif (20–40 pemain)

- Tier High: 4 core / 8 GB / 50 GB (paket populer)
- Per-core lebih cepat, cocok untuk banyak plugin dan dunia besar.

## Server besar (40+ pemain)

- Tier High: 6 core / 12 GB / 60 GB atau lebih besar
- Pertimbangkan paket 8C/16G untuk dunia besar dengan banyak plugin.

## Tips

1. Mulai dari konfigurasi yang cukup, bukan berlebihan.
2. Pantau penggunaan nyata setelah layanan aktif, lalu sesuaikan.
3. Gunakan grade build di Server Builder sebagai perbandingan cepat.
4. Jika ragu, konsultasikan dengan tim kami sebelum memesan — pembelian bersifat final.`,
    category: 'Minecraft',
    tags: ['minecraft', 'konfigurasi'],
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 15 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 15 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 15 * 86_400_000)),
  },
  {
    id: generateId('ka'),
    slug: 'setelah-order-dibuat',
    title: 'Apa yang Terjadi Setelah Order Dibuat',
    excerpt: 'Alur layanan setelah order Anda dibuat: verifikasi, penyediaan layanan, dan komunikasi resmi.',
    content: `## 1. Order tersimpan

Setiap order yang berhasil dibuat tersimpan di sistem WangStore dan mendapatkan Order ID unik (format *ws-xxxx*).

## 2. Konfirmasi WhatsApp

Halaman konfirmasi order menyediakan tombol untuk membuka WhatsApp dengan ringkasan order lengkap. Gunakan kanal ini untuk konfirmasi cepat dengan tim kami.

## 3. Verifikasi dan penyediaan

Tim WangStore memverifikasi order, memproses pembayaran, dan menyiapkan layanan Anda pada infrastruktur penyedia yang bekerja sama dengan WangStore.

## 4. Detail akses

Detail akses layanan dikirimkan hanya melalui kanal resmi (WhatsApp/email yang Anda daftarkan). Jangan bagikan detail akses kepada pihak lain.

## 5. Pengelolaan lanjutan

Setelah layanan aktif, semua komunikasi lanjutan — perubahan layanan, tiket, dan penagihan — dilakukan melalui dashboard pelanggan dan kanal resmi WangStore.

## Penting

WangStore adalah platform penjualan dan pengelolaan layanan hosting. Infrastruktur hosting pelanggan berada di luar aplikasi WangStore.`,
    category: 'Server',
    tags: ['order', 'aktivasi'],
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 12 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 12 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 12 * 86_400_000)),
  },
  {
    id: generateId('ka'),
    slug: 'order-tidak-muncul-di-dashboard',
    title: 'Order Tidak Muncul di Dashboard',
    excerpt: 'Langkah-langkah jika order Anda tidak terlihat di dashboard pelanggan.',
    content: `Jika order Anda tidak muncul di dashboard, kemungkinan penyebabnya:

## Order dibuat tanpa login

Order yang dibuat sebagai tamu (tanpa login) tidak otomatis terhubung ke akun Anda. Anda tetap dapat melihat order melalui link halaman konfirmasi yang diterima saat membuat order.

## Login dengan email berbeda

Pastikan email yang Anda gunakan untuk login sama dengan email pada order. Jika berbeda, hubungi tim kami dan kami dapat membantu menautkan order ke akun Anda.

## Solusi

1. Periksa link konfirmasi order (format: */order/ws-xxxx*).
2. Login dengan email yang sama seperti pada order.
3. Jika order tetap tidak muncul, buat tiket dukungan dengan menyertakan Order ID Anda.

> Jangan pernah membagikan link konfirmasi order Anda kepada orang lain, karena link tersebut dapat menampilkan data order Anda.`,
    category: 'Troubleshooting',
    tags: ['dashboard', 'order'],
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 10 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 10 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 10 * 86_400_000)),
  },
  {
    id: generateId('ka'),
    slug: 'mengelola-akun-dan-profil',
    title: 'Mengelola Akun dan Profil',
    excerpt: 'Cara mendaftar, verifikasi email, login, dan mengelola profil akun WangStore Anda.',
    content: `## Mendaftar

1. Buka halaman **Daftar**.
2. Isi nama, email, dan kata sandi (minimal 8 karakter).
3. Verifikasi email Anda melalui tautan yang kami kirimkan.
4. Login dan lengkapi profil Anda (nama, WhatsApp, Discord).

## Verifikasi email

Akun harus diverifikasi sebelum dapat login. Jika email verifikasi tidak sampai, periksa folder spam, atau gunakan fitur kirim ulang di halaman login (tersedia setelah percobaan login).

## Mengubah kata sandi

Buka **Dashboard → Profil → Ubah Kata Sandi**. Anda akan diminta memasukkan kata sandi lama dan kata sandi baru.

## Lupa kata sandi

Gunakan halaman **Lupa Kata Sandi**. Kami mengirim tautan reset ke email Anda. Tautan berlaku terbatas dan hanya sekali pakai.

## Keamanan akun

- Gunakan kata sandi unik untuk akun WangStore.
- Jangan bagikan kata sandi atau tautan reset kepada siapa pun.
- Tim WangStore tidak pernah meminta kata sandi Anda.`,
    category: 'Akun',
    tags: ['akun', 'keamanan'],
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 8 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 8 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 8 * 86_400_000)),
  },
  {
    id: generateId('ka'),
    slug: 'kebijakan-refund',
    title: 'Kebijakan Refund WangStore',
    excerpt: 'Ringkasan kebijakan refund: apa yang tidak dapat dikembalikan dan kapan kompensasi diberikan.',
    content: `Semua pembelian di WangStore bersifat **final**. Tidak ada pengembalian dana untuk:

- Salah spesifikasi atau salah paket.
- Salah memilih layanan.
- Berubah pikiran setelah pembelian.
- Proyek yang dibatalkan.
- Kurang memahami pengelolaan server.
- Layanan yang dibeli tetapi tidak digunakan.
- Kelalaian pelanggan.
- Pelanggaran kebijakan WangStore.

## Kapan kompensasi diberikan?

Kompensasi hanya diberikan jika kesalahan **terbukti berasal dari WangStore**. Kompensasi default berbentuk **kredit layanan**.

Refund tunai hanya diberikan jika layanan sama sekali tidak dapat disediakan oleh WangStore.

## Sebelum membeli

Kami sangat menyarankan konsultasi pra-pembelian melalui WhatsApp atau tiket jika Anda ragu dengan spesifikasi. Dokumen lengkap tersedia di halaman **Kebijakan Refund**.`,
    category: 'Kebijakan',
    tags: ['refund', 'kebijakan'],
    status: 'published',
    publishedAt: toIso(new Date(Date.now() - 5 * 86_400_000)),
    createdAt: toIso(new Date(Date.now() - 5 * 86_400_000)),
    updatedAt: toIso(new Date(Date.now() - 5 * 86_400_000)),
  },
];

const LEGAL_DOCUMENTS: LegalDocumentRecord[] = [
  {
    id: generateId('lg'),
    slug: 'terms',
    title: 'Syarat & Ketentuan',
    version: '1.0',
    publishedAt: toIso(),
    updatedAt: toIso(),
    content: `# Syarat & Ketentuan WangStore

*Terakhir diperbarui: 15 Agustus 2026*

## 1. Penerimaan Ketentuan

Dengan mengakses atau menggunakan platform WangStore ("Platform"), Anda menyetujui Syarat & Ketentuan ini. Jika Anda tidak menyetujui sebagian atau seluruhnya, jangan gunakan Platform.

## 2. Deskripsi Layanan

WangStore adalah platform e-commerce/SaaS untuk menjual dan mengelola layanan hosting, termasuk Minecraft Hosting, VPS, Dedicated Server, dan Panel Hosting. WangStore tidak menjalankan infrastruktur hosting pelanggan di dalam aplikasinya. Infrastruktur hosting pelanggan berada di luar aplikasi dan dioperasikan oleh penyedia layanan yang bekerja sama dengan WangStore.

## 3. Akun

3.1. Anda bertanggung jawab menjaga kerahasiaan kredensial akun Anda.

3.2. Informasi yang Anda berikan saat mendaftar harus akurat dan terkini.

3.3. Anda wajib segera memberi tahu kami apabila terjadi akses tidak sah terhadap akun Anda.

## 4. Pemesanan

4.1. Harga yang ditampilkan di Server Builder adalah estimasi. Harga resmi order dihitung ulang oleh server WangStore saat pemesanan dan ditampilkan pada halaman konfirmasi order.

4.2. Order dianggap diterima setelah sistem WangStore berhasil membuat order dan menampilkan Order ID.

4.3. Tier yang berstatus *ongoing* tidak dapat dipesan. Sistem akan menolak pemesanan tier tersebut.

## 5. Harga dan Pembayaran

5.1. Semua harga dalam Rupiah (IDR).

5.2. Pembayaran diproses sesuai metode yang berlaku dan dikonfirmasi oleh tim WangStore.

5.3. Semua pembelian bersifat final sesuai Kebijakan Refund WangStore.

## 6. Kebijakan Penggunaan

Penggunaan Platform tunduk pada Kebijakan Penggunaan yang Dapat Diterima (Acceptable Use Policy) WangStore.

## 7. Kekayaan Intelektual

Seluruh konten, merek, dan perangkat lunak Platform adalah milik WangStore atau pemberi lisensinya.

## 8. Batasan Tanggung Jawab

8.1. Platform disediakan "sebagaimana adanya" sejauh diizinkan hukum yang berlaku.

8.2. WangStore tidak menjamin ketersediaan tanpa gangguan dan tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan Platform.

8.3. Perlindungan DDoS bergantung pada kapasitas dan kemampuan provider jaringan. WangStore tidak menjanjikan perlindungan DDoS tanpa batas.

## 9. Perubahan Ketentuan

WangStore dapat memperbarui Syarat & Ketentuan ini. Perubahan diumumkan melalui Platform.

## 10. Hukum yang Berlaku

Ketentuan ini diatur oleh hukum Republik Indonesia.

## 11. Kontak

Pertanyaan mengenai ketentuan ini dapat disampaikan melalui kanal yang tercantum di halaman Kontak.`,
  },
  {
    id: generateId('lg'),
    slug: 'privacy',
    title: 'Kebijakan Privasi',
    version: '1.0',
    publishedAt: toIso(),
    updatedAt: toIso(),
    content: `# Kebijakan Privasi WangStore

*Terakhir diperbarui: 15 Agustus 2026*

## 1. Data yang Kami Kumpulkan

**Data akun**: nama, alamat email, dan kata sandi (disimpan dalam bentuk hash bcrypt).

**Data profil**: nama lengkap, nomor WhatsApp, dan username Discord yang Anda berikan secara sukarela.

**Data pesanan**: nama, nomor WhatsApp, email, nama server, catatan pesanan, konfigurasi layanan, dan riwayat pembayaran.

**Data teknis**: alamat IP, jenis browser, dan interaksi dengan Platform untuk keamanan dan audit.

## 2. Tujuan Penggunaan

- Memproses pesanan dan menyediakan layanan.
- Komunikasi terkait order, tiket dukungan, dan pengumuman.
- Keamanan, pencegahan penyalahgunaan, dan audit.
- Analitik internal tanpa menjual data Anda.

## 3. Dasar Pemrosesan

Pemrosesan data dilakukan berdasarkan pelaksanaan kontrak (pemesanan), kepentingan yang sah (keamanan), dan persetujuan Anda (komunikasi pemasaran, jika ada).

## 4. Penyimpanan Data

Data disimpan pada basis data PostgreSQL melalui Supabase dengan enkripsi saat transit dan saat penyimpanan (at rest) sesuai standar penyedia. Kata sandi tidak pernah disimpan dalam bentuk teks biasa.

## 5. Berbagi Data

WangStore tidak menjual data pribadi Anda. Data dapat dibagikan kepada penyedia layanan (prosesor data) semata-mata untuk mengoperasikan Platform, dengan kewajiban kerahasiaan.

## 6. Hak Anda

Anda berhak mengakses, memperbaiki, dan menghapus data pribadi Anda, serta menarik persetujuan, dengan menghubungi kami melalui kanal resmi.

## 7. Cookie

Platform menggunakan cookie esensial untuk autentikasi, keamanan, dan fungsi dasar. Detail tersedia di Kebijakan Cookie.

## 8. Keamanan

Kami menerapkan kontrol keamanan berlapis: sandi ter-hash, koneksi HTTPS, validasi input, pembatasan laju (rate limiting), dan pencatatan audit.

## 9. Perubahan Kebijakan

Perubahan kebijakan ini diumumkan melalui Platform.

## 10. Kontak

Hubungi kami melalui kanal yang tercantum di halaman Kontak untuk pertanyaan privasi.`,
  },
  {
    id: generateId('lg'),
    slug: 'refund',
    title: 'Kebijakan Refund',
    version: '1.0',
    publishedAt: toIso(),
    updatedAt: toIso(),
    content: `# Kebijakan Refund WangStore

*Terakhir diperbarui: 15 Agustus 2026*

## 1. Prinsip Umum

Semua pembelian di WangStore bersifat **final**. WangStore tidak menyediakan masa percobaan (trial), money-back guarantee, atau pengembalian dana karena berubah pikiran.

## 2. Kondisi yang Tidak Dapat Direfund

Tidak ada refund untuk:

- Salah spesifikasi (CPU/RAM/penyimpanan).
- Salah paket atau salah memilih layanan.
- Berubah pikiran setelah pembelian.
- Proyek yang dibatalkan.
- Kurang memahami pengelolaan server.
- Layanan yang dibeli tetapi tidak digunakan.
- Kelalaian pelanggan.
- Pelanggaran kebijakan WangStore.

## 3. Kompensasi

Kompensasi hanya diberikan jika kesalahan **terbukti berasal dari WangStore**.

Kompensasi default berbentuk **kredit layanan** yang dapat digunakan untuk pembayaran layanan berikutnya.

Refund tunai hanya diberikan jika layanan sama sekali tidak dapat disediakan oleh WangStore.

## 4. Proses Klaim

1. Hubungi tim WangStore melalui tiket dukungan atau kanal resmi.
2. Sertakan Order ID dan penjelasan masalah.
3. Tim kami melakukan verifikasi terhadap klaim.
4. Keputusan disampaikan secara tertulis melalui kanal resmi.

## 5. Konsultasi Pra-Pembelian

Karena pembelian bersifat final, WangStore menyediakan konsultasi pra-pembelian melalui WhatsApp dan tiket. Manfaatkan kanal ini jika Anda ragu dengan spesifikasi, paket, atau kecocokan layanan.`,
  },
  {
    id: generateId('lg'),
    slug: 'sla',
    title: 'Service Level Agreement (SLA)',
    version: '1.0',
    publishedAt: toIso(),
    updatedAt: toIso(),
    content: `# Service Level Agreement (SLA) WangStore

*Terakhir diperbarui: 15 Agustus 2026*

SLA ini berlaku untuk layanan platform WangStore (website, API, sistem pemesanan, dan panel pelanggan).

## 1. Target Uptime

Target uptime platform WangStore adalah **99,9%** per bulan, dihitung di luar jendela pemeliharaan yang diumumkan.

## 2. Kredit Layanan

Apabila uptime bulanan berada di bawah target (bukan karena kelalaian pelanggan atau kejadian di luar kendali WangStore), berlaku kredit layanan sebagai berikut:

| Uptime Bulanan | Kredit Layanan |
| --- | --- |
| 99,0% – 99,89% | 10% dari biaya bulanan |
| 95,0% – 98,99% | 25% dari biaya bulanan |
| < 95,0% | 50% dari biaya bulanan |

Kredit layanan berbentuk kredit yang dapat digunakan untuk pembayaran layanan berikutnya dan **tidak dapat diuangkan**.

## 3. Waktu Respons Dukungan

| Prioritas | Contoh | Target Respons |
| --- | --- | --- |
| Kritis | Gangguan total layanan produksi | 15 menit |
| Tinggi | Gangguan sebagian yang berdampak luas | 1 jam |
| Normal | Pertanyaan/masalah umum | 4 jam |
| Rendah | Pertanyaan informasi | 12 jam |

Waktu respons dihitung selama jam operasional tim dukungan.

## 4. Pengecualian

SLA tidak berlaku untuk: pemeliharaan yang diumumkan, kejadian di luar kendali WangStore (force majeure), kesalahan konfigurasi pelanggan, pelanggaran kebijakan, atau gangguan pada infrastruktur hosting pelanggan (yang berada di luar Platform).

## 5. Klaim Kredit

Klaim diajukan melalui tiket dukungan dalam 14 hari setelah periode yang terdampak, dengan menyertakan bukti yang relevan.`,
  },
  {
    id: generateId('lg'),
    slug: 'acceptable-use',
    title: 'Kebijakan Penggunaan yang Dapat Diterima',
    version: '1.0',
    publishedAt: toIso(),
    updatedAt: toIso(),
    content: `# Kebijakan Penggunaan yang Dapat Diterima (AUP)

*Terakhir diperbarui: 15 Agustus 2026*

Kebijakan ini berlaku untuk penggunaan Platform WangStore oleh seluruh pelanggan.

## 1. Larangan Umum

Dilarang menggunakan Platform untuk:

- Aktivitas ilegal menurut hukum Republik Indonesia.
- Menyebarkan malware, phishing, atau konten berbahaya.
- Mengirim spam atau melakukan gangguan jaringan.
- Melanggar hak kekayaan intelektual pihak lain.
- Menyimpan atau menyebarkan konten yang melanggar hukum.
- Upaya mengakses sistem atau data pihak lain tanpa izin.

## 2. Keamanan dan Integritas Platform

Dilarang melakukan percobaan peretasan, pemindaian kerentanan tanpa izin, pengujian beban tanpa izin, atau tindakan lain yang mengganggu ketersediaan Platform.

## 3. Akun dan Identitas

Dilarang membuat akun dengan identitas palsu untuk tujuan penipuan, memanfaatkan kupon secara curang, atau memanipulasi sistem pemesanan.

## 4. Pelanggaran

WangStore berhak menangguhkan atau menghentikan akses terhadap pelanggan yang melanggar kebijakan ini, tanpa kewajiban refund, sesuai Kebijakan Refund.

## 5. Pelaporan

Laporkan dugaan pelanggaran melalui kanal kontak resmi WangStore.`,
  },
  {
    id: generateId('lg'),
    slug: 'cookie-policy',
    title: 'Kebijakan Cookie',
    version: '1.0',
    publishedAt: toIso(),
    updatedAt: toIso(),
    content: `# Kebijakan Cookie WangStore

*Terakhir diperbarui: 15 Agustus 2026*

## 1. Apa itu Cookie?

Cookie adalah berkas kecil yang disimpan browser Anda saat mengunjungi situs web. WangStore menggunakan cookie esensial untuk fungsi dan keamanan Platform.

## 2. Cookie yang Kami Gunakan

| Cookie | Tujuan | Jenis |
| --- | --- | --- |
| Session (httpOnly) | Autentikasi dan keamanan sesi | Esensial |
| CSRF | Perlindungan terhadap pemalsuan permintaan | Esensial |
| Preferensi tema | Mengingat pilihan mode terang/gelap | Fungsional |

## 3. Cookie Pihak Ketiga

WangStore dapat menggunakan layanan pihak ketiga (misalnya Cloudflare Turnstile) yang mungkin menempatkan cookie mereka sendiri, sesuai kebijakan masing-masing penyedia.

## 4. Mengelola Cookie

Anda dapat menghapus atau memblokir cookie melalui pengaturan browser. Memblokir cookie esensial dapat menyebabkan sebagian fungsi Platform (seperti login) tidak berjalan.

## 5. Kontak

Pertanyaan mengenai kebijakan ini dapat disampaikan melalui halaman Kontak.`,
  },
];

const CMS_PAGES: CmsPageRecord[] = [
  {
    id: generateId('pg'),
    slug: 'home',
    title: 'Beranda',
    metaTitle: 'WangStore — Build Your Own Server',
    metaDescription:
      'Platform untuk menjual dan mengelola layanan hosting: Minecraft Hosting, VPS, Dedicated Server, dan Panel Hosting. Bangun server Anda sendiri dengan Server Builder.',
    content: `## Mengapa WangStore?

WangStore adalah platform penjualan dan pengelolaan layanan hosting yang mengutamakan kejelasan: harga transparan, konfigurasi sederhana, dan pesanan yang tercatat rapi.

- **Server Builder** — tentukan CPU, RAM, dan penyimpanan, lihat harga dan estimasi performa secara real-time.
- **Harga transparan** — rumus harga terbuka untuk tier Low, harga final untuk paket High.
- **Pesanan tercatat** — setiap order memiliki ID, status, dan riwayat yang dapat dipantau.
- **Dukungan nyata** — tiket, WhatsApp, dan Discord untuk komunikasi resmi.`,
    updatedAt: toIso(),
  },
  {
    id: generateId('pg'),
    slug: 'about',
    title: 'Tentang WangStore',
    metaTitle: 'Tentang WangStore',
    metaDescription:
      'Cerita, visi, misi, dan prinsip WangStore — platform penjualan dan pengelolaan layanan hosting.',
    content: `## Cerita Kami

WangStore lahir dari kebutuhan sederhana: membeli layanan hosting seharusnya tidak rumit dan tidak membingungkan. Kami membangun platform yang memusatkan seluruh proses — memilih, mengonfigurasi, memesan, dan mengelola layanan — dalam satu tempat yang jelas dan dapat dipercaya.

## Visi

Menjadi platform terpercaya bagi komunitas Minecraft, developer, creator, dan bisnis kecil untuk membangun dan mengelola layanan hosting mereka.

## Misi

1. Menyediakan pengalaman memilih layanan yang sederhana dan transparan.
2. Menampilkan harga yang jujur tanpa biaya tersembunyi.
3. Menjaga komunikasi yang jelas di setiap tahap pemesanan.
4. Mengelola pesanan, tiket, dan layanan secara profesional.

## Prinsip

- **Kejujuran** — kami tidak menampilkan angka atau klaim yang tidak dapat dipertanggungjawabkan.
- **Kejelasan** — harga, kebijakan, dan status layanan selalu terbuka.
- **Kesederhanaan** — produk yang mudah digunakan dari langkah pertama.
- **Akuntabilitas** — setiap tindakan terekam dan setiap pesanan terlacak.

## Layanan Kami

- Minecraft Hosting (tier Low custom & tier High paket tetap)
- VPS, Dedicated Server, dan Panel Hosting (sedang dipersiapkan)

## Pendekatan terhadap Pelanggan

Kami mengutamakan konsultasi pra-pembelian karena kami memahami bahwa pembelian bersifat final. Tim kami siap membantu Anda memilih konfigurasi yang tepat melalui WhatsApp, Discord, dan tiket.

## Teknologi Platform

WangStore dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, dan PostgreSQL melalui Supabase, dengan arsitektur serverless yang dapat berjalan pada Cloudflare/Vercel tanpa VPS.`,
    updatedAt: toIso(),
  },
  {
    id: generateId('pg'),
    slug: 'features',
    title: 'Fitur',
    metaTitle: 'Fitur WangStore',
    metaDescription: 'Fitur-fitur platform WangStore: Server Builder, harga transparan, order management, dashboard pelanggan, dan lainnya.',
    content: `## Fitur Platform

### Server Builder

Pilih tier, atur CPU/RAM/penyimpanan atau pilih paket, dan lihat harga serta estimasi performa secara real-time.

### Mesin Harga Terbuka

Formula harga Low terbuka: biaya dasar + CPU + RAM + penyimpanan. Harga High final per paket. Harga order selalu dihitung ulang oleh server.

### Manajemen Order

Setiap order memiliki ID unik, status yang jelas, dan halaman konfirmasi lengkap dengan tautan WhatsApp.

### Dashboard Pelanggan

Riwayat pesanan, konfigurasi tersimpan, tiket dukungan, kupon, notifikasi, dan profil — dalam satu tempat.

### Sistem Tiket

Buat dan pantau tiket dukungan dengan prioritas dan riwayat percakapan.

### Kupon

Kupon persentase atau nominal dengan aturan minimum order, masa berlaku, dan batas penggunaan — divalidasi sepenuhnya di server.

### Status Layanan

Halaman status publik untuk kondisi platform, pemeliharaan, dan riwayat insiden.

### Blog & Knowledge Base

Panduan dan dokumentasi dalam Bahasa Indonesia, ditulis oleh tim WangStore.`,
    updatedAt: toIso(),
  },
  {
    id: generateId('pg'),
    slug: 'why-wangstore',
    title: 'Mengapa WangStore?',
    metaTitle: 'Mengapa Memilih WangStore',
    metaDescription: 'Alasan memilih WangStore: kejujuran, transparansi harga, dan pengalaman pemesanan yang jelas.',
    content: `## Mengapa Memilih WangStore?

### 1. Harga yang Jujur

Formula harga Low terbuka dan dapat dihitung sendiri. Harga paket High final dan ditampilkan apa adanya. Tidak ada biaya tersembunyi.

### 2. Konfigurasi Sederhana

Hanya tiga hal yang perlu Anda tentukan: CPU, RAM, dan penyimpanan. Tidak ada belasan opsi membingungkan.

### 3. Estimasi yang Transparan

Estimasi performa ditampilkan dengan label jujur: estimasi, bukan jaminan.

### 4. Pesanan yang Terlacak

Order ID, status, dan riwayat tersedia di halaman konfirmasi dan dashboard pelanggan.

### 5. Kebijakan yang Jelas

Refund, SLA, dan ketentuan ditulis dalam Bahasa Indonesia yang mudah dipahami — dan kami menepatinya.

### 6. Dukungan yang Nyata

Tiket dengan target waktu respons yang jelas, plus kanal WhatsApp dan Discord resmi.

### 7. Tanpa Janji Berlebihan

Kami tidak mengklaim uptime palsu, hardware fiktif, atau perlindungan tanpa batas. Apa yang kami tampilkan dapat dipertanggungjawabkan.`,
    updatedAt: toIso(),
  },
  {
    id: generateId('pg'),
    slug: 'infrastructure',
    title: 'Infrastruktur',
    metaTitle: 'Infrastruktur WangStore',
    metaDescription:
      'Penjelasan jujur tentang infrastruktur WangStore sebagai platform penjualan dan pengelolaan layanan hosting.',
    content: `## Infrastruktur Platform

WangStore adalah **platform penjualan dan pengelolaan layanan hosting**. Platform ini menangani katalog layanan, Server Builder, kalkulasi harga, akun pelanggan, pemesanan, order management, customer portal, kupon, tiket, dan konten.

WangStore **tidak menjalankan** infrastructure hosting pelanggan di dalam aplikasinya — termasuk server Minecraft, VPS, Docker, atau panel pelanggan. Infrastruktur hosting pelanggan berada di luar aplikasi dan dioperasikan oleh penyedia layanan yang bekerja sama dengan WangStore.

## Batas yang Jelas

| Komponen | Dijalankan oleh |
| --- | --- |
| Website, API, dashboard, admin | WangStore (platform) |
| Server Minecraft / VPS pelanggan | Penyedia layanan mitra |

## Informasi Infrastruktur

Informasi spesifik mengenai kapasitas dan lokasi infrastruktur mitra akan ditampilkan di halaman ini setelah tersedia. Saat ini:

> Informasi infrastruktur sedang diperbarui.

## Perlindungan DDoS

Perlindungan DDoS bergantung pada kapasitas dan kemampuan provider jaringan. WangStore tidak menjanjikan perlindungan DDoS tanpa batas.`,
    updatedAt: toIso(),
  },
  {
    id: generateId('pg'),
    slug: 'contact',
    title: 'Kontak',
    metaTitle: 'Hubungi WangStore',
    metaDescription: 'Hubungi tim WangStore melalui WhatsApp, Discord, email, atau tiket dukungan.',
    content: `## Hubungi Kami

Tim WangStore siap membantu Anda — baik untuk konsultasi pra-pembelian, pertanyaan teknis, maupun dukungan pasca-pembelian.

Kanal kontak yang aktif ditampilkan pada halaman ini. Jika sebuah kanal belum dikonfigurasi, kanal tersebut tidak ditampilkan — gunakan kanal lain yang tersedia.

Kami menjawab secepat mungkin, dengan prioritas: Kritis (15 menit), Tinggi (1 jam), Normal (4 jam), Rendah (12 jam), sesuai SLA kami.`,
    updatedAt: toIso(),
  },
];

const ANNOUNCEMENTS: AnnouncementRecord[] = [
  {
    id: generateId('an'),
    title: 'WangStore Telah Dibuka',
    message:
      'Platform WangStore resmi beroperasi. Server Builder untuk Minecraft Hosting (tier Low & High) tersedia. VPS, Dedicated Server, dan Panel Hosting sedang dipersiapkan.',
    active: true,
    startsAt: toIso(),
    endsAt: null,
    createdAt: toIso(),
  },
];

export async function buildSeedData(): Promise<JsonCollections> {
  const password = envAdminPassword || DEV_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);
  const user: UserRecord = { ...panelUser(envAdminEmail, 'owner'), passwordHash };
  const profile: ProfileRecord = {
    userId: user.id,
    fullName: 'Administrator WangStore',
    whatsapp: process.env.WHATSAPP_NUMBER?.trim() ?? '',
    discord: '',
    bio: 'Akun owner WangStore.',
    updatedAt: toIso(),
  };

  // Akun contoh Admin & Staff — HANYA di datastore JSON pengembangan lokal,
  // agar perbedaan wewenang kedua role dapat diuji tanpa membuat akun manual.
  // Di production (Supabase) akun panel dibuat Owner lewat halaman Pelanggan.
  const staffPasswordHash = await bcrypt.hash(process.env.STAFF_PASSWORD?.trim() || DEV_STAFF_PASSWORD, 12);
  const adminAccount: UserRecord = {
    ...panelUser('admin.demo@wangstore.id', 'admin'),
    passwordHash: staffPasswordHash,
  };
  const staffAccount: UserRecord = {
    ...panelUser('staff.demo@wangstore.id', 'staff'),
    passwordHash: staffPasswordHash,
  };
  const panelProfiles: ProfileRecord[] = [
    {
      userId: adminAccount.id,
      fullName: 'Admin WangStore',
      whatsapp: '',
      discord: '',
      bio: 'Akun contoh peran Admin (konfigurasi harga, katalog, konten, pengaturan).',
      updatedAt: toIso(),
    },
    {
      userId: staffAccount.id,
      fullName: 'Staff WangStore',
      whatsapp: '',
      discord: '',
      bio: 'Akun contoh peran Staff (proses order, tiket, status layanan).',
      updatedAt: toIso(),
    },
  ];

  return {
    users: [user, adminAccount, staffAccount],
    profiles: [profile, ...panelProfiles],
    products: PRODUCTS,
    packages: packages(),
    pricing: pricingRules(),
    coupons: coupons(),
    couponUsages: [],
    orders: [],
    orderItems: [],
    savedConfigurations: [],
    tickets: [],
    ticketMessages: [],
    notifications: [],
    blogPosts: BLOG_POSTS,
    blogCategories: BLOG_CATEGORIES,
    knowledgeArticles: KB_ARTICLES,
    faqItems: FAQ_ITEMS,
    testimonials: [],
    cmsPages: CMS_PAGES,
    legalDocuments: LEGAL_DOCUMENTS,
    incidents: [],
    maintenanceWindows: [],
    announcements: ANNOUNCEMENTS,
    settings: settings(),
    auditLogs: [],
  };
}
