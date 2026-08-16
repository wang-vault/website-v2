# Arsitektur WangStore

## 1. Definisi Produk

WangStore adalah platform e-commerce/SaaS untuk **menjual layanan hosting dan mengelola pelanggan**. WangStore bukan infrastructure hosting dan bukan Minecraft control panel — platform tidak menjalankan server Minecraft, VPS, Docker, Wings, Pterodactyl, Nginx, atau infrastructure hosting pelanggan apa pun.

Yang ditangani platform:

- katalog layanan & produk
- Server Builder (tier, CPU, RAM, penyimpanan)
- kalkulasi & estimasi harga
- akun pelanggan & autentikasi
- pemesanan & order management
- customer portal
- kupon
- tiket
- WhatsApp
- admin panel
- CMS (blog, knowledge base, FAQ, legal, pengumuman, insiden)
- status layanan
- analytics & audit log

Infrastruktur hosting pelanggan berada di luar aplikasi.

## 2. Target Deployment

- Vercel atau Cloudflare Pages/Workers (serverless/edge)
- Supabase (PostgreSQL)
- Tidak ada VPS, Docker, Nginx, PM2, systemd, cron lokal, atau in-memory global state sebagai database
- Scheduled task (jika diperlukan kelak) memakai mekanisme scheduler platform (mis. Vercel Cron / Cloudflare Scheduled), bukan proses lokal

## 3. Struktur Kode

```
src/
  app/                  # App Router (halaman + route handlers API)
  components/           # UI kit + komponen fitur (builder, admin, dashboard)
  lib/
    api/                # envelope respons + guards (auth/RBAC/CSRF/maintenance)
    auth/               # password (bcrypt), session (jose JWT), rbac
    cms/                # generic CMS resource handler + resource map
    db/                 # DataStore interface + Supabase adapter + JSON fallback + seed
    email/              # provider email (console/resend)
    maintenance/        # mode maintenance
    orders/             # order service (server-side pricing)
    payments/           # PaymentProvider abstraction (manual/gateway)
    pricing/            # SATU shared pricing module + model estimasi + unit test
    security/           # sanitize, rate-limit, csrf, turnstile
    whatsapp/           # WhatsApp URL builder + peringatan pembelian
  types/                # tipe domain (dicerminkan oleh database/schema.sql)
database/
  schema.sql            # seluruh DDL + RLS + fungsi transaksional production
docs/  scripts/  .github/
```

## 4. Data Layer

Interface `DataStore` (`src/lib/db/types.ts`) memisahkan domain dari penyimpanan:

| Driver | Kapan | Catatan |
| --- | --- | --- |
| `SupabaseDataStore` | Production | Supabase PostgreSQL via service role (server-only). Operasi multi-tulis memakai fungsi SQL transaksional (`rpc_create_order`, `rpc_create_ticket`) sehingga rollback otomatis. Rate limit DB-backed (`rpc_rate_limit_check`) agar kompatibel serverless. |
| `JsonDataStore` | Development/fallback | File `data/wangstore.json`, seed otomatis, penulisan atomik (temp + rename), antrean tulis terserialisasi. BUKAN datastore production. |

Pemilihan driver otomatis di `getDb()`: Supabase bila `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` tersedia; selain itu JSON (dengan peringatan di production).

### Kolom camelCase

Skema PostgreSQL memakai quoted identifier camelCase agar pemetaan objek 1:1 dengan lapisan domain dan menghilangkan lapisan mapper yang rawan bug. Konvensi ini didokumentasikan di `database/schema.sql`.

## 5. Pricing Engine (satu sumber kebenaran)

`src/lib/pricing/` berisi:

- `constants.ts` — batas Low, definisi tier (perfFactor), paket High, konstanta formula
- `calculator.ts` — normalisasi (clamp), harga Low, harga High, rincian harga
- `estimate.ts` — model estimasi deterministik (TPS, pemain, CPU/RAM, plugin, grade)
- `pricing.test.ts` — unit test

UI (Server Builder) dan API (`/api/pricing/estimate`, `/api/orders`) mengimpor modul yang sama. **Dilarang** menduplikasi formula harga di tempat lain. Formula harga Low dapat diubah admin (disimpan di `pricing_rules`); katalog paket High dikelola di tabel `packages`.

## 6. Order Service

`src/lib/orders/service.ts` adalah satu-satunya jalur pembuatan order:

```
Zod validation → sanitasi → normalisasi → verify tier → reject ongoing (409)
→ verify paket High (422) → verify kupon → harga server-side
→ db.orders.create (transaksional: order + item + penggunaan kupon + audit)
→ notifikasi → WhatsApp URL
```

Harga dari klien diabaikan sepenuhnya. Halaman konfirmasi order diakses pemilik (login), staff, atau token akses (hash disimpan di order).

## 7. Autentikasi & Sesi

- Custom auth layer: bcrypt (cost 12) + jose JWT (HS256), cookie httpOnly/SameSite/Secure.
- Klaim: `sub`, `email`, `role`, `tv` (tokenVersion). Setiap logout/ganti password menaikkan tokenVersion sehingga sesi lama langsung batal.
- Login: generic error, dummy hash untuk email tak dikenal (timing-resistant), rate limit per IP + email, audit login gagal.
- Verifikasi email & reset password: token acak sekali pakai (reset: 1 jam), dikirim lewat provider email abstrak (`console` dev / `resend` production).
- Middleware (edge) memverifikasi JWT untuk proteksi rute `/dashboard`, `/account`, `/admin`; API menegakkan otorisasi ulang (RBAC) di setiap route.

## 8. RBAC

Hierarchy: **Owner > Admin > Staff** (customer di bawah semua). Matriks izin eksplisit per role di
`src/lib/auth/rbac.ts` (`ROLE_PERMISSIONS`), dengan pemisahan tegas antara izin `*.read` dan `*.manage`:

| Operasi | Minimum role |
| --- | --- |
| Baca/ubah status order, balas tiket, kelola status & insiden | Staff |
| Baca pelanggan, harga, kupon, produk, konten, settings (read-only) | Staff |
| Ubah kupon, formula harga, produk, paket, konten, legal, settings; baca analitik & audit | Admin |
| Ubah role pengguna, mode maintenance | Owner |

Pembagian peran singkat: **Staff = operasional** (menjalankan pekerjaan harian, hanya membaca data kebijakan),
**Admin = konfigurasi** (mengubah harga, penawaran, konten, pengaturan), **Owner = kepemilikan** (role &
maintenance). Perubahan role: hanya Owner; role Owner tidak dapat diturunkan.

Penegakan berlapis: middleware (edge) → guard halaman `requireAdminPage()` (`src/lib/auth/page-guards.ts`) →
`requireAdmin()` di setiap API route. Navigasi difilter server-side lewat `src/lib/admin/nav.ts` dan komponen
admin menerima prop `readOnly` untuk role tanpa izin tulis. Matriks izin hidup dapat dilihat di `/admin/roles`.
RBAC diverifikasi ulang di **setiap** API route — bukan hanya di UI.

## 9. Generic CMS

`src/lib/cms/` mendefinisikan resource map (`blog`, `blogCategories`, `knowledgeBase`, `faq`, `testimonials`, `pages`, `legal`, `announcements`, `incidents`, `maintenanceWindows`) dengan per resource: collection, identity field, allowed fields, skema Zod, serta `readPermission` dan `writePermission` terpisah. Dua route (`/api/admin/cms/[resource]` dan `/api/admin/cms/[resource]/[id]`) melayani seluruh modul — tidak ada 20 endpoint duplikat. UI admin memakai satu `CmsManager` yang digerakkan konfigurasi.

## 10. Mode Maintenance

Settings-driven (admin, owner-only): title, message, estimasi selesai, allowed paths, admin bypass (staff+ tetap bisa akses). Dicek di root layout untuk halaman dan `assertNotInMaintenance()` untuk API (HTTP 503).

## 11. Keputusan Penting

1. **Custom auth, bukan Supabase Auth** — satu implementasi yang identik di JSON fallback dan Supabase, memenuhi persyaratan (generic error, dummy hash, rate limit, tokenVersion, 2FA-ready) tanpa dual-path yang rawan bug. Supabase tetap menjadi PostgreSQL production.
2. **Service-role server-only + RLS aktif** — RLS di schema sebagai pertahanan berlapis; otorisasi nyata di lapisan API.
3. **Root tanpa `loading.tsx`** — `loading.tsx` di root membuat Suspense boundary yang memulai streaming sehingga `notFound()` pada halaman dinamis kehilangan status 404. Loading state per-segmen (`/dashboard`, `/admin`) tetap ada; halaman publik memakai skeleton di dalam komponen.
4. **Kolom camelCase di PostgreSQL** — pemetaan 1:1, mengurangi bug mapper untuk jalur data yang lebih banyak.
