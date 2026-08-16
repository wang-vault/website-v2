# Changelog

Semua perubahan penting pada WangStore didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/),
dan proyek mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Ditambahkan

- **Katalog VPS** — tabel `vps_packages` (vCPU, RAM, penyimpanan, kuota transfer, sistem operasi, lokasi,
  harga final), halaman publik **`/vps`** dengan pemilihan paket + formulir pemesanan, endpoint publik
  `GET /api/vps-packages`, serta CRUD admin `/api/admin/vps-packages`.
- **Pemesanan VPS memakai alur order yang sama** — `POST /api/orders` menerima `service: 'minecraft' | 'vps'`;
  order VPS tercatat di dashboard pelanggan, panel admin, audit log, dan pesan WhatsApp seperti order lain.
  Harga tetap dihitung ulang server-side dari katalog.
- **Tier Medium aktif sebagai paket tetap** — paket Medium dikelola admin (tabel `packages`, kolom `tier`),
  dapat dipilih di Server Builder, dan dapat dipesan seperti tier High.
- **Pengaturan Ketersediaan Layanan** (Panel Admin → Produk, Paket & VPS) — status setiap katalog
  (Minecraft Low/Medium/High dan VPS) dapat diubah antara *Tersedia*, *Sedang Disiapkan*, dan *Tidak Tersedia*
  tanpa deploy ulang. Status disimpan di `settings.catalogStatus` dan diverifikasi server-side saat order
  dibuat (`409 TIER_ONGOING` / `409 TIER_UNAVAILABLE`).
- **Modul `src/lib/catalog/`** — sumber kebenaran status katalog beserta helper label order lintas layanan,
  dengan 10 unit test baru.
- Kolom `products.catalogKey` — menautkan entri katalog pemasaran ke layanan yang benar-benar dijual; beranda
  kini menampilkan badge ketersediaan dan tautan pemesanan yang mengikuti keadaan sebenarnya.
- Navigasi, footer, dan sitemap memuat halaman VPS; 15 smoke check baru untuk katalog VPS, tier Medium, dan
  kontrol ketersediaan.

- **Matriks izin RBAC eksplisit per peran** (`src/lib/auth/rbac.ts`) — daftar izin setiap role ditulis satu per
  satu (`ROLE_PERMISSIONS`) dengan pewarisan eksplisit Staff → Admin → Owner, menggantikan pengecekan berbasis
  angka hierarki saja. Ditambah metadata `ROLE_DEFINITIONS`, `PERMISSION_LABELS`, dan `PERMISSION_GROUPS`.
- **Izin baca terpisah dari izin tulis** — `pricing.read`, `coupons.read`, `products.read`, `content.read`,
  `customers.read`, `settings.read`, dan `status.read` untuk Staff; `*.manage` tetap milik Admin/Owner.
- **Guard izin di setiap halaman admin** (`src/lib/auth/page-guards.ts`) — Staff tidak lagi dapat membuka
  halaman khusus Admin/Owner lewat URL langsung.
- **Halaman `/admin/forbidden`** — penjelasan jujur tentang izin yang kurang, siapa yang memilikinya, dan
  ringkasan wewenang peran saat ini.
- **Halaman `/admin/roles`** — matriks peran & izin yang dirender langsung dari kode RBAC (dokumentasi hidup).
- **Navigasi admin sadar-peran** — menu difilter di server dan dikelompokkan (Operasional, Katalog & Harga,
  Konten, Pengaturan, Kepemilikan); halaman baca-saja ditandai ikon mata.
- **Mode baca-saja pada komponen admin** — `CmsManager`, `PricingForm`, `CouponsManager`, `ProductsManager`,
  `BlogCategoriesManager`, dan `CustomersManager` menerima prop izin dan menyembunyikan aksi tulis.
- **`npm run db:role`** (`scripts/set-role.ts`) — bootstrap peran Admin/Staff di production; menaikkan
  `tokenVersion` agar sesi lama batal dan mencatat perubahan ke audit log.
- **Akun contoh Admin & Staff** pada seed JSON pengembangan lokal untuk mencoba perbedaan wewenang.
- **27 unit test RBAC** (`src/lib/auth/rbac.test.ts`) — pewarisan izin, batas Staff vs Admin, wewenang khusus
  Owner, filter navigasi, dan pemisahan baca/tulis resource CMS.

### Diubah

- `orders` memiliki kolom `service`, dan `orders.tier` kini nullable (null untuk order VPS) — disertai
  migrasi idempoten di `database/schema.sql`.
- `PUT /api/admin/settings` menerima grup field `catalogStatus` dengan izin `products.manage`.
- `GET /api/pricing` mengembalikan paket Medium/High/VPS dari basis data beserta `catalogStatus`; endpoint
  estimasi memakai status yang sama.
- Server Builder membaca ketersediaan tier dari pengaturan admin dan menampilkan pemilih paket untuk setiap
  tier bermode paket (Medium & High).
- `PUT /api/admin/settings` memeriksa izin **per grup field**: status layanan → Staff (`status.manage`),
  mode maintenance → Owner (`maintenance.manage`), sisanya → Admin (`settings.manage`). Sebelumnya Staff tidak
  dapat memperbarui status layanan meskipun itu tugas operasionalnya.
- Resource CMS memakai `readPermission` + `writePermission` menggantikan `minimumRole`, sehingga Staff dapat
  membaca konten sebagai rujukan tanpa dapat mengubahnya.
- `GET /api/admin/customers` dapat diakses Staff sebagai baca-saja; perubahan data tetap `customers.update`
  (Admin) dan perubahan role tetap `roles.manage` (Owner).
- Ringkasan `/admin` menampilkan statistik dan aksi cepat sesuai izin peran.
- Halaman Mode Maintenance memakai guard izin standar, bukan pengecekan role manual.
- Dokumentasi (README, ARCHITECTURE, SECURITY, API) dan deskripsi tabel `roles` di `database/schema.sql`
  diperbarui mengikuti pembagian peran baru.

## [1.0.0] - 2026-08-15

### Ditambahkan

- **Server Builder** — tier Low (custom CPU/RAM/penyimpanan, clamp + harga real-time), tier High (paket tetap, `high-4c8g` Populer), tier Medium (Ongoing, tidak dapat dipesan, HTTP 409).
- **Pricing engine** — satu shared module (`src/lib/pricing`) untuk UI & API; formula Low `base + CPU×perCore + RAM×perGbRam + Storage×perGbStorage`, pembulatan Rp500, minimum Rp45.000; harga paket High final; normalisasi overflow 20/64/900 → 16/32/160; model estimasi performa deterministik (TPS, pemain, CPU/RAM, plugin, grade).
- **Order flow** — `POST /api/orders` dengan pipeline keamanan lengkap (payload limit → rate limit → maintenance → origin/CSRF → Turnstile → Zod → sanitasi → normalisasi → verifikasi tier/paket/kupon → harga server-side → transaksi → audit → WhatsApp URL). Harga client diabaikan sepenuhnya.
- **Halaman konfirmasi order** (`/order/[id]`, noindex) dengan kontrol akses token/sesi/staff, ringkasan lengkap, dan WhatsApp CTA.
- **Autentikasi** — register/login/logout, verifikasi email, lupa/reset kata sandi, ganti kata sandi, sesi JWT httpOnly + tokenVersion, login generic error + dummy hash, rate limiting.
- **Customer dashboard** — ringkasan, pesanan, konfigurasi tersimpan, tiket, kupon, notifikasi, profil.
- **Admin panel** (22 modul) — pesanan (status), pelanggan (role, Owner-only), tiket & kontak, formula harga, kupon, analitik, produk & paket, blog, knowledge base, FAQ, testimoni, halaman & legal, infrastruktur & lokasi, insiden & maintenance, pengumuman, tema & branding, sosial & kontak, mode maintenance (Owner-only), audit log.
- **Generic CMS** — satu resource handler + resource map (10 resource) untuk seluruh konten; blog & KB dengan Markdown, kategori, tag, search, draft/terbit, SEO, artikel terkait.
- **Halaman publik** — beranda, about, infrastructure, features, why-wangstore, faq, testimonials, blog, knowledge-base, status, contact, terms, privacy, refund, sla, acceptable-use, cookie-policy + 404/error/loading.
- **Status page** — status platform & layanan, maintenance, insiden + timeline, refresh otomatis ≤ 60 detik, tanpa data monitoring palsu.
- **Kupon** — persentase/nominal, min order, kedaluwarsa, batas penggunaan, batas per pelanggan, tier/paket target; validasi & diskon selalu server-side.
- **Keamanan** — bcrypt cost 12, JWT jose, CSRF double-submit + Origin validation, sanitasi rekursif, rate limit DB-backed, Turnstile opsional, security headers + CSP nonce, audit log menyeluruh, RBAC Owner > Admin > Staff.
- **Data layer** — `DataStore` interface; Supabase adapter (PostgreSQL, transaksi RPC) untuk production; JSON datastore fallback (atomic write, antrean terserialisasi, seed otomatis) untuk development.
- **SEO** — sitemap dinamis, robots, canonical, OpenGraph, Twitter Cards, structured data (Organization, FAQPage, BlogPosting, TechArticle, ContactPage), noindex untuk rute privat.
- **Database** — `database/schema.sql` lengkap (24 tabel, FK, index, RLS, 3 fungsi transaksional).
- **Testing** — unit test pricing (Vitest) + HTTP smoke test 64 acceptance check + CI (typecheck, lint, test, build, smoke, npm audit, CodeQL — template di `.github/workflow-templates/` dengan panduan aktivasi).
- **Dokumentasi** — README, ARCHITECTURE, DEPLOYMENT (Vercel + Supabase + checklist), SECURITY, API; CONTRIBUTING, template issue/PR.

### Keputusan Teknis

- Authentication layer kustom (bukan Supabase Auth) agar perilaku identik di JSON fallback dan Supabase; Supabase tetap PostgreSQL production.
- Kolom camelCase (quoted identifier) di PostgreSQL untuk pemetaan 1:1 dengan domain.
- Tanpa `loading.tsx` di root — Suspense boundary root membuat `notFound()` halaman dinamis kehilangan status 404 (loading state tetap ada per-segmen dashboard/admin).
