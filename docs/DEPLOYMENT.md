# Deployment — Vercel + Supabase

WangStore dirancang untuk berjalan **tanpa VPS**: GitHub → Vercel (Next.js) → Supabase (PostgreSQL).

## 1. Supabase Setup

1. Buat project baru di [Supabase](https://supabase.com) (free tier cukup untuk memulai).
2. Catat:
   - **Project URL** (Project Settings → API)
   - **service_role key** (Project Settings → API → service_role)
   - Database connection info bila diperlukan (untuk inspeksi manual).
3. Buka **SQL Editor** (Database → SQL Editor) dan jalankan **seluruh isi** `database/schema.sql`. File ini membuat:
   - seluruh tabel (users, profiles, roles→kolom role, orders, order_items, products, packages, pricing_rules, coupons, coupon_usages, saved_configurations, tickets, ticket_messages, notifications, blog_posts, blog_categories, knowledge_articles, faq_items, testimonials, pages→cms_pages, legal_documents, incidents, maintenance_windows, announcements, settings, audit_logs, rate_limits)
   - foreign keys, unique constraints, dan index
   - Row Level Security + policy (pertahanan berlapis)
   - fungsi transaksional `rpc_create_order`, `rpc_create_ticket`, `rpc_rate_limit_check`
4. Buat akun Owner:
   ```bash
   cp .env.example .env.local
   # isi NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY
   ADMIN_EMAIL=owner@domain.com ADMIN_PASSWORD='kata-sandi-panjang' npm run db:seed
   ```
5. Konfigurasikan email verifikasi & reset password: set `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` di environment (atau provider lain dengan menambahkan adapter di `src/lib/email`).
6. **Storage**: hanya diperlukan jika fitur upload dipakai (saat ini tidak ada upload — validasi MIME/extension/size/filename/storage key tersedia di `src/lib/security/sanitize.ts` untuk ditambahkan nanti).

`database/schema.sql` bersifat **idempoten** — aman dijalankan ulang bila run pertama gagal di tengah atau saat menerapkan perubahan skema. Policy RLS di-drop lebih dulu (`drop policy if exists`) sebelum dibuat ulang, karena PostgreSQL tidak menyediakan `create policy if not exists`.

Jangan menjalankan SQL yang tidak tersedia di repository — seluruh SQL production ada di `database/schema.sql`.

## 2. Environment Variables

Gunakan `.env.example` sebagai referensi. Wajib di production:

| Variable | Keterangan |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | URL production, mis. `https://wangstore.example` |
| `NEXT_PUBLIC_SITE_NAME` | `WangStore` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Hanya server. **Jangan pernah** taruh di `NEXT_PUBLIC_*` atau di browser. |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `WHATSAPP_NUMBER` | Nomor tujuan order (tanpa `+`) |
| `EMAIL_PROVIDER` / `EMAIL_FROM` / `RESEND_API_KEY` | Untuk verifikasi email & reset password |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Opsional |
| `DISCORD_INVITE_URL` | Opsional |

Jangan commit `.env`, `.env.local`, service role key, JWT secret, atau database password.

## 3. GitHub Setup

1. Buat repository GitHub dan push project (branch utama).
2. Pastikan `.env*` tidak masuk repository — `.gitignore` sudah mengecualikan `.env` dan `.env.*` dengan pengecualian `!.env.example`.
3. Pastikan `.env.example`, `database/schema.sql`, dan `docs/` tetap ter-commit.

## 4. Vercel Deployment

1. **Login Vercel** dengan GitHub.
2. **Import Repository** — pilih repository WangStore.
3. **Framework** — Vercel otomatis mendeteksi Next.js.
4. **Build Settings** — biarkan standar: `npm run build`, output `.next`. Jangan menambahkan command yang tidak diperlukan.
5. **Environment Variables** — masukkan seluruh variable production, pisahkan environment Production / Preview / Development. Nilai secret tidak boleh ada di variabel `NEXT_PUBLIC_*`.
6. **Deploy** — klik *Deploy*. Setelah selesai, aplikasi dapat diakses melalui domain Vercel (`*.vercel.app`).

Setelah deployment: verifikasi `NEXT_PUBLIC_APP_URL` menunjuk domain final (dipakai untuk canonical, OpenGraph, tautan WhatsApp, dan email).

## 5. Custom Domain

1. Vercel → Project → Settings → **Domains** → tambahkan domain (`wangstore.example`, `www.wangstore.example`).
2. Gunakan **DNS record yang direkomendasikan Vercel** yang ditampilkan di dashboard (A/CNAME) — jangan menyalin IP/record dari sumber lain, karena konfigurasi dapat berubah.
3. SSL diterbitkan otomatis oleh Vercel.
4. Perbarui `NEXT_PUBLIC_APP_URL` dan redeploy.

## 6. Supabase + Vercel (produksi)

```
Vercel
  └── Next.js (serverless)
        └── Supabase
              ├── PostgreSQL  (orders, users, coupons, tickets, CMS, audit)
              └── Authentication (lapisan auth bawaan WangStore — bukan Supabase Auth)
```

Aplikasi **tidak** menyimpan order, user, coupon, ticket, CMS, atau audit log di filesystem serverless. Filesystem hanya untuk fallback dev (`data/*.json`, ter-ignore dari Git).

## 7. Database Migration

- `database/schema.sql` adalah sumber kebenaran skema; jalankan melalui Supabase SQL Editor.
- Seluruh tabel terdokumentasi di file itu — tidak ada tabel yang dibuat manual tanpa dokumentasi.
- Perubahan skema ke depan: tambahkan pernyataan idempotent (`create table if not exists`, `create index if not exists`, `create or replace function`, `insert ... on conflict`) ke file yang sama + dokumentasikan di CHANGELOG.
- **Policy RLS**: PostgreSQL tidak mendukung `create policy if not exists`. Setiap policy baru wajib didahului `drop policy if exists "<nama>" on <tabel>;` agar file tetap dapat dijalankan ulang.

## 8. Production Security

- Supabase service role key hanya di server.
- Secret tidak pernah dikirim ke client.
- RLS aktif (schema), RBAC + authorization server-side (API).
- Validasi API server-side; pricing server-side; kupon server-side.
- CSRF (double-submit + Origin/Host), rate limiting (DB-backed), security headers (CSP nonce, HSTS, dll).

## 9. Vercel Serverless Compatibility

Dilarang mengandalkan: persistent local filesystem, long-running process, systemd, PM2, Docker daemon, Nginx, cron lokal, in-memory global state sebagai database. API tidak membutuhkan proses server yang berjalan terus-menerus. Untuk scheduled task, gunakan scheduler platform (mis. Vercel Cron) atau layanan eksternal — belum diperlukan oleh fitur saat ini.

## 10. Storage (Upload)

Saat ini tidak ada fitur upload. Jika ditambahkan: gunakan Supabase Storage / object storage (bukan `/public/uploads`), dengan validasi MIME, extension, size, filename, dan authorization.

## 11. Deployment Checklist

- [ ] Repository GitHub dibuat
- [ ] Supabase project dibuat
- [ ] `database/schema.sql` dijalankan
- [ ] RLS dikonfigurasi
- [ ] Akun Owner dibuat (`npm run db:seed`)
- [ ] Environment variables Vercel dikonfigurasi
- [ ] Production URL dikonfigurasi
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

## 12. Production Verification

Setelah deployment, uji URL production:

```
GET /  /about  /server-builder  /blog  /knowledge-base  /status
GET /contact  /terms  /privacy  /refund  /sla
```

Lalu alur penuh: Register → verifikasi email → Login → Server Builder → Create Order → Order Confirmation → WhatsApp → Dashboard. Admin: Login → Dashboard → Kelola Produk → Edit Pricing → Buat Kupon → Edit CMS → Audit Log. Verifikasi pricing API memakai endpoint production (`POST /api/pricing/estimate`).

## 13. Troubleshooting

| Gejala | Periksa |
| --- | --- |
| Build gagal | `npm run build` lokal; `npm install` bersih. |
| Supabase connection gagal | `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` benar; network; schema sudah dijalankan. |
| `ERROR: 42710: policy "..." already exists` | Schema pernah dijalankan sebagian/seluruhnya. Gunakan `database/schema.sql` versi terbaru (setiap policy sudah didahului `drop policy if exists`) lalu jalankan ulang seluruh file. |
| Authentication gagal | `JWT_SECRET` sama antar environment; `NEXT_PUBLIC_APP_URL`; cookie diblokir browser. |
| Database permission error | RLS/policy; server memakai service role; jangan pakai anon key untuk operasi server. |
| Env tidak terbaca | Variable ada di environment Vercel yang benar (Production) → redeploy. |
| API ok lokal, gagal di Vercel | Kode memakai filesystem/local process/persistent memory/unsupported Node API? Refactor agar serverless-compatible. |

## 14. Aturan Akhir

Project dianggap selesai setelah: build ✅, deployment Vercel ✅, Supabase terhubung ✅, database terpakai ✅, authentication ✅, Server Builder ✅, pricing API ✅, order ✅, customer dashboard ✅, admin dashboard ✅, production smoke test ✅. Jika suatu langkah belum dapat diverifikasi, nyatakan secara jujur — jangan klaim "deployment berhasil" tanpa verifikasi.
