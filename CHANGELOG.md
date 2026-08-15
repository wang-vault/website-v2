# Changelog

Semua perubahan penting pada WangStore didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/),
dan proyek mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Diperbaiki

- `database/schema.sql` kini **idempoten sepenuhnya**: 24 policy RLS didahului `drop policy if exists`, sehingga menjalankan ulang schema tidak lagi gagal dengan `ERROR: 42710: policy "..." already exists`. Sebelumnya run kedua (mis. setelah run pertama terhenti di tengah) selalu berhenti di policy pertama.
- Dokumentasi: konvensi idempoten ditegaskan di header `database/schema.sql`, bagian Database Migration, dan tabel troubleshooting `docs/DEPLOYMENT.md`.

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
