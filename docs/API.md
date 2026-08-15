# Referensi API WangStore

## Konvensi

- Base URL: `NEXT_PUBLIC_APP_URL` (production), `http://localhost:3000` (dev).
- Envelope respons: `{ "success": boolean, "code": string, "message": string, "data": T | null }`.
- Stack trace tidak pernah dikirim ke klien.
- Permintaan tulis wajib lolos: payload limit → rate limit → maintenance → Origin/CSRF (header `X-CSRF-Token` untuk permintaan terautentikasi) → Turnstile (jika aktif).
- Harga/diskonto dari klien selalu diabaikan dan dihitung ulang server.

## Publik

### `POST /api/orders`
Membuat order. Body: `customerName`, `customerWhatsapp`, `customerEmail`, `serverName`, `notes?`, `couponCode?`, `tier` (`low|medium|high`), `packageId?`, `cpu?`, `ramGb?`, `storageGb?`, `agreeTerms` (harus `true`), `turnstileToken?`.

- 201 → `{ order, whatsappUrl, accessToken }`
- 409 `TIER_ONGOING` — tier Medium
- 422 `INVALID_PACKAGE` — paket High tidak dikenal
- 422 `UNKNOWN_TIER` / `VALIDATION_ERROR`
- 422 `COUPON_*` — kupon tidak valid
- 403 `CSRF_FAILED` / 429 `RATE_LIMITED` / 413 `PAYLOAD_TOO_LARGE` / 503 `MAINTENANCE_MODE`

### `GET /api/orders/[id]?token=…`
Status order. Akses: staff, pemilik (login), atau token akses. 404 bila tidak diizinkan/tidak ada.

### `GET /api/pricing`
Konstanta harga aktif, batas Low, paket High, status tier.

### `POST /api/pricing/estimate`
Body: `tier`, `packageId?`, `cpu?`, `ramGb?`, `storageGb?`. Mengembalikan konfigurasi ternormalisasi, harga, dan estimasi performa. 409 untuk tier ongoing; 422 untuk paket palsu.

### `GET /api/packages` / `GET /api/products`
Katalog publik.

### `POST /api/coupons/validate`
Body: `code`, `tier`, `packageId`, `subtotal`. Server menghitung diskon. 422 `COUPON_*` bila tidak valid.

### `POST /api/contact`
Body: `name`, `email`, `subject`, `message`, `turnstileToken?`. Rate limited; pesan masuk menjadi tiket admin.

### `GET /api/status`
Status platform, layanan, insiden terbuka, pemeliharaan aktif, catatan uptime jujur.

### `GET /api/blog` / `GET /api/blog/[slug]`
Artikel terbit. `GET /api/knowledge-base` / `[slug]` untuk knowledge base.

## Autentikasi (`/api/auth/*`)

| Endpoint | Body | Catatan |
| --- | --- | --- |
| `POST /register` | `fullName`, `email`, `password`, `turnstileToken?` | Email verifikasi dikirim; `devVerificationLink` hanya di mode dev+console |
| `POST /login` | `email`, `password`, `remember?` | Generic error; set cookie sesi + CSRF |
| `POST /logout` | — | Batalkan sesi (tokenVersion++) |
| `POST /forgot-password` | `email` | Respons selalu generik |
| `POST /reset-password` | `token`, `password` | Token 1 jam sekali pakai |
| `POST /change-password` | `currentPassword`, `newPassword` | Wajib login |
| `GET /session` | — | Status sesi |

## Akun (`/api/account/*`, wajib login)

| Endpoint | Deskripsi |
| --- | --- |
| `GET/PATCH /profile` | Baca/perbarui profil |
| `GET/POST /saved-configurations`, `DELETE /saved-configurations/[id]` | Konfigurasi tersimpan (maks 50) |
| `GET /orders` | Riwayat order milik sendiri |
| `GET /notifications`, `PATCH /notifications` | Notifikasi & tandai dibaca |

## Tiket (`/api/tickets/*`, wajib login)

| Endpoint | Deskripsi |
| --- | --- |
| `GET /tickets` | Tiket sendiri (staff: semua) |
| `POST /tickets` | `subject`, `message`, `priority?` |
| `GET /tickets/[id]` | Tiket + percakapan (pemilik/staff) |
| `POST /tickets/[id]/messages` | `message`; tiket tertutup → 409 |
| `PATCH /tickets/[id]` | `status` (pelanggan: hanya open/closed) |

## Admin (`/api/admin/*`, RBAC per route)

| Endpoint | Minimum role |
| --- | --- |
| `GET /orders` (filter `status`, `q`, `page`) | Staff |
| `GET/PATCH /orders/[id]` (`status`) | Staff (baca) / Staff (update) |
| `GET /customers`, `PATCH /customers/[id]` | Admin; perubahan role → Owner |
| `GET /tickets`, `GET/PATCH /tickets/[id]`, `POST /tickets/[id]/messages` | Staff |
| `GET/PUT /pricing` | Admin |
| `GET/POST /coupons`, `PATCH/DELETE /coupons/[id]` | Admin |
| `GET/POST /products`, `PATCH/DELETE /products/[id]` | Admin |
| `GET/POST /packages`, `PATCH/DELETE /packages/[id]` | Admin |
| `GET /analytics` | Admin |
| `GET/PUT /settings` | Admin; field maintenance → Owner |
| `GET /audit-logs` (filter `resource`, `q`) | Admin |
| `GET/POST /cms/[resource]`, `GET/PATCH/DELETE /cms/[resource]/[id]` | Admin; incidents/maintenanceWindows → Staff |

Resource CMS: `blog`, `blogCategories`, `knowledgeBase`, `faq`, `testimonials`, `pages`, `legal`, `announcements`, `incidents`, `maintenanceWindows` — satu generic handler dengan resource map (skema Zod + allowed fields per resource di `src/lib/cms/index.ts`).

## Kode Error Umum

| Kode | HTTP |
| --- | --- |
| `VALIDATION_ERROR` | 422 |
| `UNKNOWN_TIER` / `INVALID_PACKAGE` / `COUPON_*` | 422 |
| `TIER_ONGOING` | 409 |
| `UNAUTHENTICATED` / `SESSION_EXPIRED` | 401 |
| `FORBIDDEN` | 403 |
| `CSRF_FAILED` | 403 |
| `NOT_FOUND` | 404 |
| `RATE_LIMITED` | 429 |
| `MAINTENANCE_MODE` | 503 |
| `INTERNAL_ERROR` | 500 |
