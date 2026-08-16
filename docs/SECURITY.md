# Keamanan WangStore

## 1. Model Kepercayaan

- Klien (browser) **tidak pernah dipercaya** untuk: harga, diskon, status order, role, atau data orang lain.
- Seluruh keputusan otorisasi & bisnis terjadi di server.
- Supabase service role key hanya ada di server. RLS diaktifkan sebagai pertahanan berlapis; RBAC ditegakkan di lapisan API.

## 2. Autentikasi

| Kontrol | Implementasi |
| --- | --- |
| Hash kata sandi | bcrypt cost **12** (`src/lib/auth/password.ts`) |
| Sesi | JWT (jose, HS256) dalam cookie `httpOnly`, `SameSite=Lax`, `Secure` di production, umur 7 hari (30 hari jika "ingat saya") |
| Pembatalan sesi | `tokenVersion` pada user — logout / ganti password / reset password menaikkan versi → semua sesi lama batal |
| Login tahan bocor | Generic error ("Email atau kata sandi salah."), dummy bcrypt compare untuk email tak dikenal (timing-resistant) |
| Rate limit login | per IP dan per email (5 percobaan / 15 menit default, bisa diatur env) |
| Verifikasi email | token acak 32 byte sekali pakai |
| Reset password | token acak, berlaku 1 jam, sekali pakai, menaikkan tokenVersion |
| 2FA-ready | tokenVersion + sesi independen siap diintegrasikan dengan TOTP tanpa migrasi besar |

## 3. CSRF

- **Double-submit cookie**: cookie `ws_csrf` (tidak httpOnly) dibuat middleware untuk sesi terautentikasi; API tulis terautentikasi membandingkannya dengan header `X-CSRF-Token`.
- **Origin/Host validation** untuk SEMUA permintaan tulis (termasuk guest): `Origin` wajib sama dengan `Host`. Cross-origin write → HTTP 403 `CSRF_FAILED`.
- `SameSite=Lax` + metode tulis via `fetch` (bukan form sederhana) sebagai lapisan tambahan.

## 4. Validasi & Sanitasi Input

- Zod schema di setiap endpoint.
- Sanitasi rekursif (`src/lib/security/sanitize.ts`): kontrol karakter dibuang, panjang string dibatasi, kedalaman & jumlah key dibatasi.
- Payload limit pada endpoint order (64 KB).
- Normalisasi email (lowercase/trim) dan nomor telepon (digit).
- URL WhatsApp dibangun server-side dari data tervalidasi.

## 5. Rate Limiting

Kunci: `rl:{endpoint}:{user|ip}`. Prioritas ketat: login, register, password reset, order, contact.

| Mode | Implementasi |
| --- | --- |
| Supabase | tabel `rate_limits` + fungsi atomik `rpc_rate_limit_check` (serverless-compatible, tidak bergantung memori proses) |
| JSON dev | counter in-memory per proses (cukup untuk pengembangan; didokumentasikan sebagai keterbatasan fallback) |

## 6. Bot Protection

Cloudflare Turnstile opsional (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`) untuk register, login abuse, contact, dan order abuse. Tidak ada CAPTCHA buatan sendiri. Jika tidak dikonfigurasi, proteksi bot dilewati dan statusnya jujur (tidak diklaim aktif).

## 7. Keamanan Order

Urutan pipeline (lihat `src/lib/orders/service.ts` dan `src/app/api/orders/route.ts`):

```
payload limit → rate limit → maintenance → origin/CSRF → Turnstile
→ Zod → sanitasi → normalisasi (clamp) → verify tier (unknown → 422)
→ reject ongoing (409) → verify paket High (422) → verify kupon
→ harga server-side (harga client DIABAIKAN) → transaksi DB
→ audit → notifikasi → WhatsApp URL
```

- Ketersediaan layanan (tier Minecraft & VPS) dibaca dari `settings.catalogStatus` dan diverifikasi server-side: status `ongoing` / `unavailable` ditolak (409). Paket palsu, paket nonaktif, dan paket milik tier lain ditolak (422); total tidak pernah Rp0.
- Order VPS memakai harga dari tabel `vps_packages` — nilai harga dari klien tidak pernah dipakai.
- Halaman konfirmasi order: hanya pemilik (login), staff, atau pemegang token akses (hash SHA-256 disimpan; token tidak disimpan).
- Perubahan status order oleh staff diaudit; harga order **tidak dapat diubah**.

## 8. RBAC

Hierarchy: Owner > Admin > Staff > Customer. Matriks izin **eksplisit per role** di `src/lib/auth/rbac.ts`
(`ROLE_PERMISSIONS`) — bukan sekadar perbandingan angka hierarki. Admin mewarisi seluruh izin Staff, Owner
mewarisi seluruh izin Admin, dan pewarisan itu ditulis eksplisit agar dapat diuji (`src/lib/auth/rbac.test.ts`).

Pembagian peran:

| Peran | Fungsi | Wewenang inti |
| --- | --- | --- |
| **Staff** | Operasional | Order (baca + ubah status), tiket (baca + balas), status layanan/insiden/jendela maintenance. Akses **baca-saja** ke pelanggan, harga, kupon, produk, konten, pengaturan. |
| **Admin** | Konfigurasi | Seluruh izin Staff + ubah harga, kupon, produk, paket, konten, legal, pengaturan situs, serta baca analitik & audit log. |
| **Owner** | Kepemilikan | Seluruh izin Admin + ubah role pengguna dan mode maintenance. |

Aturan khusus:

- Perubahan role: Owner-only; role Owner tidak dapat diturunkan; hanya Owner yang menetapkan role Owner.
- Mode maintenance: Owner-only.
- Audit log & analitik: Admin+ (customer/staff tidak dapat membaca).
- Staff tidak dapat mengubah harga/kupon/produk/CMS/legal/settings — hanya membacanya.
- `PUT /api/admin/settings` memeriksa izin **per grup field**: status layanan (Staff), mode maintenance (Owner),
  sisanya (Admin).
- Resource CMS memiliki `readPermission` dan `writePermission` terpisah, sehingga Staff dapat membaca konten
  tetapi hanya dapat menulis resource status (`incidents`, `maintenanceWindows`).

Penegakan berlapis (defense in depth):

1. **Middleware (edge)** — memblokir non-staf di seluruh `/admin`.
2. **Halaman** — setiap halaman admin memanggil `requireAdminPage(permission)` (`src/lib/auth/page-guards.ts`);
   role tanpa izin diarahkan ke `/admin/forbidden` yang menjelaskan izin yang kurang.
3. **API** — setiap route memanggil `requireAdmin(permission)`; ini satu-satunya lapisan yang menentukan.
4. **UI** — menu difilter di server (`src/lib/admin/nav.ts`) dan komponen dirender `readOnly`. Ini kenyamanan,
   **bukan** mekanisme keamanan.

## 9. Audit Log

Dicatat: login, logout, login gagal, register, verifikasi email, reset password, create/update/delete (order, coupon, product, package, ticket, CMS, legal, settings, pricing, profile, role), perubahan maintenance.

Data: actor, action, resource, resourceId, timestamp, IP, metadata (tanpa password/secret). Di Supabase, log ditulis dalam transaksi pembuatan order. RLS memblokir pembacaan audit oleh role client.

## 10. HTTP Security Headers

| Header | Nilai |
| --- | --- |
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'nonce-…'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` — nonce dihasilkan middleware, Next menerapkannya ke seluruh script |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (production) |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=()` |
| Cross-Origin-Opener-Policy | `same-origin` |
| X-Robots-Tag | `noindex, nofollow` untuk rute privat |

CSP kompatibel dengan aplikasi: satu-satunya script eksternal adalah Turnstile (img/connect via `https:` pada img-src; widget dimuat script dari challenges.cloudflare.com — jika Turnstile diaktifkan, tambahkan domain itu ke `script-src`; default CSP cukup untuk mode tanpa Turnstile). Tidak ada inline script manual; JSON-LD memakai tag `<script type="application/ld+json">` yang diizinkan karena ber-nonce.

## 11. Database Security

- Least privilege: aplikasi memakai service role hanya di server; akses client dibatasi RLS (baca data publik & milik sendiri; audit/pricing/coupons/rate_limits diblokir dari client).
- FK dengan cascade/set null sesuai kebutuhan; index pada kolom pencarian/foreign key.
- Soft delete tidak dipakai (hapus fisik + audit), kecuali bila diperlukan kelak.

## 12. Storage & Upload

Belum ada fitur upload. Jika ditambahkan: Supabase Storage/object storage, validasi MIME + extension + size + filename + storage key, larangan executable upload.

## 13. Disclosure yang Jujur

- Perlindungan DDoS bergantung pada kapasitas dan kemampuan provider jaringan; WangStore tidak menjanjikan perlindungan tanpa batas.
- Uptime hanya target (99,9%); data uptime terukur tidak ditampilkan sebelum monitoring benar-benar terhubung.
- Integrasi eksternal yang belum dikonfigurasi (WhatsApp, Discord, email provider) ditampilkan statusnya secara jujur di UI.
