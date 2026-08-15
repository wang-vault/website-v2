# WangStore

> **Build Your Own Server.**

WangStore adalah platform e-commerce/SaaS untuk **menjual layanan hosting dan mengelola pelanggan** — Minecraft Hosting, VPS, Dedicated Server, dan Panel Hosting.

WangStore **bukan** infrastructure hosting dan **bukan** Minecraft control panel. Platform ini menangani katalog layanan, Server Builder, kalkulasi harga, akun pelanggan, pemesanan, order management, customer portal, kupon, tiket, WhatsApp, admin panel, CMS, blog, knowledge base, FAQ, status layanan, legal pages, analytics, dan audit log. Infrastruktur hosting pelanggan berada **di luar** aplikasi.

---

## Daftar Isi

- [Arsitektur](#arsitektur)
- [Tech Stack](#tech-stack)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Setup Supabase](#setup-supabase)
- [Deployment ke Vercel](#deployment-ke-vercel)
- [Custom Domain](#custom-domain)
- [Autentikasi](#autentikasi)
- [API](#api)
- [Keamanan](#keamanan)
- [Pricing & Server Builder](#pricing--server-builder)
- [Alur Order](#alur-order)
- [CMS](#cms)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Deployment Checklist](#deployment-checklist)

---

## Arsitektur

```
Browser
   │
   ▼
Vercel / Cloudflare (serverless)
   ├── Next.js App Router (Server Components diutamakan)
   │     ├── src/lib/pricing     ← SATU shared module harga (UI + API)
   │     ├── src/lib/db          ← DataStore: Supabase (production) / JSON (dev fallback)
   │     ├── src/lib/auth        ← custom auth: bcrypt (cost 12) + jose JWT httpOnly
   │     ├── src/lib/security    ← sanitize, rate limit, CSRF, Turnstile
   │     ├── src/lib/cms         ← generic CMS resource handler (resource map)
   │     ├── src/lib/orders      ← order service (server-side pricing)
   │     └── src/lib/whatsapp    ← WhatsApp URL builder
   │
   ▼
Supabase PostgreSQL (production datastore)
```

Detail lengkap: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js App Router (React 19, TypeScript strict) |
| Styling | Tailwind CSS (design system hitam/putih/abu-abu, dark mode) |
| Validasi | Zod |
| Auth | `jose` (JWT httpOnly) + `bcryptjs` (cost 12) |
| Database | PostgreSQL via Supabase |
| Bot protection | Cloudflare Turnstile (opsional, via env) |
| Ikon | lucide-react |
| Konten | Markdown (react-markdown) |
| Test | Vitest + HTTP smoke test |

**Tanpa VPS** — aplikasi dirancang untuk Cloudflare/Vercel + Supabase (Rp0 dengan free tier). Tidak ada ketergantungan pada Docker, Nginx, PM2, systemd, atau filesystem serverless sebagai storage persistent.

## Menjalankan Secara Lokal

```bash
git clone <repository>
cd wangstore
npm install
```

Tanpa Supabase pun aplikasi berjalan — fallback **JSON datastore lokal** (file `data/wangstore.json`, otomatis di-seed, penulisan atomik + antrean tulis terserialisasi) aktif saat environment Supabase belum dikonfigurasi. JSON datastore **hanya untuk pengembangan/fallback**, bukan datastore production.

```bash
npm run dev
```

Buka **http://localhost:3000**.

### Akun development default (JSON mode)

| Email | Kata sandi | Role |
| --- | --- | --- |
| `admin@wangstore.id` | `WangStoreDevAdmin2026!` | Owner |

Kredensial ini hanya untuk pengembangan lokal. Di production, akun Owner dibuat lewat `npm run db:seed` dengan `ADMIN_EMAIL`/`ADMIN_PASSWORD` dari environment.

## Konfigurasi Environment

```bash
cp .env.example .env.local
```

Seluruh variable didokumentasikan di [.env.example](.env.example). Ringkasan kelompok:

| Kelompok | Variable |
| --- | --- |
| APP | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_NAME` |
| DATABASE | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| AUTH | `JWT_SECRET` (wajib di production: `openssl rand -base64 48`), `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| CLOUDFLARE | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (opsional) |
| WHATSAPP | `WHATSAPP_NUMBER` (format internasional tanpa `+`) |
| DISCORD | `DISCORD_INVITE_URL` (opsional) |
| EMAIL | `EMAIL_PROVIDER` (`console` atau `resend`), `EMAIL_FROM`, `RESEND_API_KEY` |
| SECURITY | `RATE_LIMIT_*` |

**Jangan commit secret.** `.env*` di-ignore kecuali `.env.example`. Service role key tidak pernah dikirim ke browser (hanya dipakai di server).

## Setup Supabase

1. Buat project baru di [Supabase](https://supabase.com) (free tier cukup).
2. Catat **Project URL** dan **service_role key** (Project Settings → API).
3. Buka **SQL Editor** dan jalankan seluruh isi [database/schema.sql](database/schema.sql) — seluruh tabel, index, constraint, RLS policy, dan fungsi transaksional (`rpc_create_order`, `rpc_create_ticket`, `rpc_rate_limit_check`) ada di file itu. Tidak ada SQL production di luar repository.
4. Buat akun Owner:
   ```bash
   ADMIN_EMAIL=owner@domain.com ADMIN_PASSWORD='kata-sandi-panjang' npm run db:seed
   ```
5. Isi `.env.local` / environment Vercel dengan `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`.

Catatan autentikasi: WangStore memakai **authentication layer sendiri** (bcrypt + jose JWT) yang kompatibel dengan serverless — bukan Supabase Auth. Supabase dipakai sebagai PostgreSQL + (opsional) Storage. RLS tetap diaktifkan di schema sebagai pertahanan berlapis; RBAC ditegakkan di lapisan API.

## Deployment ke Vercel

Alur: **GitHub → Vercel → Import Repository → Environment Variables → Build → Deploy.**

1. **Login Vercel** — buka dashboard Vercel, login dengan GitHub.
2. **Import Repository** — pilih repository WangStore.
3. **Framework** — pastikan Vercel mendeteksi **Next.js** (otomatis).
4. **Build Settings** — gunakan konfigurasi standar Next.js; build cukup dengan `npm run build`. Jangan tambahkan command lain.
5. **Environment Variables** — masukkan seluruh variable production (lihat `.env.example`), pisahkan environment Production / Preview / Development. Jangan letakkan secret production di client (`NEXT_PUBLIC_*` hanya untuk nilai publik).
6. **Deploy** — klik **Deploy**. Setelah berhasil, aplikasi dapat diakses melalui domain Vercel.

Setelah deployment, konfigurasikan **Supabase Authentication** (hanya jika memakai Supabase Auth sebagai tambahan): Site URL `https://DOMAIN-WANGSTORE`, Redirect URLs `https://DOMAIN-WANGSTORE/**`. Untuk layer auth bawaan WangStore, tidak diperlukan redirect tambahan — tetapi pastikan `NEXT_PUBLIC_APP_URL` menunjuk ke domain production.

Panduan lengkap + checklist: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Custom Domain

1. Vercel dashboard → Project → **Settings → Domains** → tambahkan domain (mis. `wangstore.example` dan `www.wangstore.example`).
2. Ikuti **DNS record yang direkomendasikan Vercel** (A/CNAME yang ditampilkan dashboard — jangan menyalin record dari sumber lain).
3. Tunggu propagasi dan verifikasi SSL (otomatis oleh Vercel).
4. Perbarui `NEXT_PUBLIC_APP_URL` ke domain final, lalu redeploy.

## Autentikasi

| Fitur | Status |
| --- | --- |
| Register, Login, Logout | ✅ |
| Verifikasi email (token sekali pakai) | ✅ |
| Lupa & reset kata sandi (token 1 jam, sekali pakai) | ✅ |
| Sesi JWT httpOnly + tokenVersion (logout global) | ✅ |
| Ganti kata sandi, profil | ✅ |
| Generic error login + dummy hash (timing-resistant) | ✅ |
| Rate limit login/register/reset per IP + email | ✅ |
| Arsitektur 2FA-ready (tokenVersion & sesi independen) | Siap — lihat [docs/SECURITY.md](docs/SECURITY.md) |

## API

Ringkasan endpoint — detail lengkap: [docs/API.md](docs/API.md).

| Endpoint | Deskripsi |
| --- | --- |
| `POST /api/orders` | Buat order (server-side pricing) |
| `GET /api/orders/[id]` | Status order (token/sesi/staff) |
| `GET /api/pricing` · `POST /api/pricing/estimate` | Mesin harga bersama |
| `GET /api/packages` · `GET /api/products` | Katalog publik |
| `POST /api/coupons/validate` | Validasi kupon server-side |
| `POST /api/contact` | Formulir kontak (rate limited, Turnstile opsional) |
| `GET /api/status` | Status platform |
| `GET /api/blog[/slug]` · `GET /api/knowledge-base[/slug]` | Konten publik |
| `/api/auth/*` | Register, login, logout, forgot/reset/change password, session |
| `/api/account/*` | Profil, saved configs, orders, notifications |
| `/api/tickets/*` | Tiket pelanggan |
| `/api/admin/*` | Orders, customers, tickets, pricing, coupons, products, packages, analytics, settings, audit-logs, CMS |

Envelope respons konsisten: `{ success, code, message, data }`. Stack trace tidak pernah dikirim ke klien.

## Keamanan

Ringkasan — detail lengkap: [docs/SECURITY.md](docs/SECURITY.md).

- Password: bcrypt cost 12; hash dummy untuk email tidak dikenal (timing-resistant).
- Sesi: JWT (jose) httpOnly + SameSite + Secure; tokenVersion untuk pembatalan sesi.
- CSRF: double-submit cookie + validasi Origin/Host pada semua permintaan tulis.
- Rate limiting: IP + endpoint + user; DB-backed di Supabase (serverless-compatible).
- Validasi Zod + sanitasi rekursif + payload limit.
- RBAC: Owner > Admin > Staff, diverifikasi ulang di **setiap** API route.
- Audit log untuk login/logout/login gagal/create/update/delete/pricing/coupon/order/customer/CMS/legal/role/maintenance. Password & secret tidak pernah masuk log.
- Header: CSP (dengan nonce), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP.
- Bot protection: Cloudflare Turnstile opsional (register/contact/order) — tidak ada CAPTCHA buatan sendiri.
- **Harga dari browser tidak pernah dipercaya** — selalu dihitung ulang server-side.

## Pricing & Server Builder

- **Satu shared module** `src/lib/pricing/` — UI dan API mengimpor modul yang sama. Tidak ada duplikasi formula.
- Tier: **Low** (custom: CPU 2–16, RAM 4–32 GB, Penyimpanan 20–160 GB; 160 GB batas absolut), **Medium** (Ongoing — ditolak dengan HTTP 409), **High** (paket tetap, harga final, `high-4c8g` = Populer).
- Formula Low: `5.000 + CPU×7.000 + RAM×4.500 + Storage×300`, dibulatkan ke Rp500, minimum **Rp45.000/bulan** (2C/4G/20G = tepat Rp45.000).
- Estimasi performa (TPS, pemain, CPU/RAM, plugin, grade) deterministik & shared — diberi label **Estimasi**, bukan SLA.
- Nilai di luar batas **dipangkas** (clamp), tidak ditolak: 20/64/900 → 16/32/160.
- Medium dan paket palsu ditolak; tidak pernah menghasilkan Rp0.

## Alur Order

```
request → payload limit → rate limit → maintenance → origin/CSRF
→ Turnstile (jika aktif) → Zod → sanitasi → normalisasi → verify tier
→ reject ongoing (409) → verify paket High (422) → verify kupon
→ harga server-side → transaksi DB (order + item + kupon + audit)
→ notifikasi → WhatsApp URL → respons
```

Jika API gagal karena network, builder tetap membuka WhatsApp dengan ringkasan buatan klien — yang secara jujur dinyatakan **bukan order resmi** sampai server berhasil membuat order.

Pembelian **final** — tidak ada trial/refund karena berubah pikiran. Peringatan pembelian tampil di Server Builder, pesan WhatsApp, dan halaman konfirmasi order.

## CMS

Seluruh konten website dikelola dari admin tanpa menyentuh kode: Homepage, About, Features, Why WangStore, Infrastructure, FAQ, Testimoni, Blog, Knowledge Base, Legal pages, Kontak, Pengumuman, Maintenance, SEO metadata — melalui **satu generic resource handler** (`src/lib/cms/`) dengan resource map (collection, identity field, allowed fields, skema Zod, minimum role). Tidak ada 20 endpoint duplikat.

## Testing

```bash
npm run typecheck   # 0 error TypeScript
npm run lint        # 0 error, 0 warning
npm run test        # unit test pricing engine (Vitest)
npm run build       # production build
npm run smoke       # HTTP smoke test (64 acceptance check)
```

`npm run ci` menjalankan semuanya. Smoke test mencakup: harga paket High tepat, minimum Low 45.000, normalisasi 20/64/900 → 16/32/160, Medium → 409, paket palsu → 422, halaman publik → 200, `/dashboard` → `/login`, admin salah/benar + RBAC, CSRF lintas origin ditolak, kupon valid/kedaluwarsa/limit/diskon client diabaikan.

> **CI/CD (GitHub Actions)** — workflow typecheck, lint, test, build, smoke test, `npm audit`, dan CodeQL tersedia sebagai template di [`.github/workflow-templates/`](.github/workflow-templates/) (beberapa organisasi membatasi izin `workflows` untuk bot). Untuk mengaktifkan, salin `ci.yml` ke `.github/workflows/` — langkahnya ada di [`.github/workflow-templates/README.md`](.github/workflow-templates/README.md).

## Troubleshooting

| Gejala | Periksa |
| --- | --- |
| Build gagal | `npm run build` lokal; pastikan dependency terpasang (`npm install`). |
| Supabase connection gagal | `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`; firewall/network; schema sudah dijalankan. |
| Authentication gagal | `JWT_SECRET` konsisten antar environment; `NEXT_PUBLIC_APP_URL` benar; cookie terblokir browser (private mode). |
| Database permission error | RLS & policy di `database/schema.sql`; server memakai service role key; jangan pakai anon key untuk operasi server. |
| Environment variable tidak terbaca | Pastikan variable ada di environment Vercel yang benar (Production) lalu redeploy. |
| API bekerja lokal, gagal di Vercel | Cari penggunaan filesystem/local process/persistent memory/unsupported Node API — aplikasi ini sudah serverless-compatible; jangan tambahkan dependensi semacam itu. |

## Deployment Checklist

- [ ] Repository GitHub dibuat
- [ ] Supabase project dibuat
- [ ] `database/schema.sql` dijalankan
- [ ] RLS dikonfigurasi
- [ ] Akun Owner dibuat (`npm run db:seed`)
- [ ] Environment variables Vercel dikonfigurasi
- [ ] Production URL dikonfigurasi (`NEXT_PUBLIC_APP_URL`)
- [ ] Build berhasil
- [ ] Homepage berhasil
- [ ] Register berhasil
- [ ] Login berhasil
- [ ] Logout berhasil
- [ ] Server Builder berhasil
- [ ] Pricing API berhasil
- [ ] Order berhasil
- [ ] WhatsApp redirect berhasil
- [ ] Customer dashboard berhasil
- [ ] Admin login berhasil
- [ ] RBAC berhasil
- [ ] Blog berhasil
- [ ] Knowledge Base berhasil
- [ ] Sitemap berhasil
- [ ] Robots berhasil
- [ ] Security headers aktif
- [ ] Custom domain dikonfigurasi

## Dokumentasi Lain

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — desain sistem & keputusan arsitektur
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — panduan deployment Vercel + Supabase + verifikasi production
- [docs/SECURITY.md](docs/SECURITY.md) — model keamanan & praktik
- [docs/API.md](docs/API.md) — referensi API
- [CONTRIBUTING.md](CONTRIBUTING.md) — panduan kontribusi
- [CHANGELOG.md](CHANGELOG.md) — riwayat perubahan

## Lisensi

[MIT](LICENSE)
