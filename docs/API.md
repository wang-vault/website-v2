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

## Katalog VPS

| Endpoint | Keterangan |
| --- | --- |
| `GET /vps-packages` | Katalog VPS aktif + status ketersediaan (`available` / `ongoing` / `unavailable`). |

`POST /orders` menerima `service: 'minecraft' | 'vps'` (default `minecraft`). Untuk `vps`, `packageId` wajib dan
`tier` diabaikan; harga selalu diambil dari katalog di server. Layanan yang tidak berstatus *Tersedia* ditolak
dengan `409 TIER_ONGOING` / `409 TIER_UNAVAILABLE`.

## Perpanjangan

| Endpoint | Keterangan |
| --- | --- |
| `GET /api/orders/[id]/renew` | Kelayakan & harga perpanjangan (staff, pemilik order, atau `?token=`). |
| `POST /api/orders/[id]/renew` | Membuat order perpanjangan (body: `agreeTerms: true`, `turnstileToken?`). Rate limit sama dengan pembuatan order. |

Kode penolakan (HTTP 409): `RENEWAL_PACKAGE_NOT_RENEWABLE`, `RENEWAL_PACKAGE_MISSING`,
`RENEWAL_CATALOG_UNAVAILABLE`, `RENEWAL_PERIOD_NOT_SET`, `RENEWAL_ORDER_INACTIVE`, `RENEWAL_RENEWAL_PENDING`,
`RENEWAL_IS_RENEWAL_ORDER`.

## Cron

| Endpoint | Keterangan |
| --- | --- |
| `GET/POST /api/cron/reminders` | Pengingat masa aktif (H-7, H-3, H-1, hari kedaluwarsa). Memerlukan `Authorization: Bearer $CRON_SECRET` atau header `x-cron-secret`; menolak semua permintaan bila `CRON_SECRET` kosong. Idempoten. |

## Admin (`/api/admin/*`, RBAC per route)

| Endpoint | Minimum role |
| --- | --- |
| `GET /orders` (filter `status`, `q`, `page`) | Staff (`orders.read`) |
| `GET/PATCH /orders/[id]` (`status`, `activatedAt`, `expiresAt`) | Staff (`orders.read` / `orders.update`). Menandai order perpanjangan `paid`/`completed` otomatis memundurkan masa aktif order induk. |
| `GET /reminders`, `POST /reminders` | Staff (`orders.read` / `orders.update`) — ringkasan masa aktif & menjalankan pengingat manual |
| `GET /customers` | Staff (`customers.read`, baca-saja) |
| `PATCH /customers/[id]` | Admin (`customers.update`); perubahan role → Owner (`roles.manage`) |
| `GET /tickets`, `GET/PATCH /tickets/[id]`, `POST /tickets/[id]/messages` | Staff (`tickets.read` / `tickets.reply`) |
| `GET /pricing` | Staff (`pricing.read`) |
| `PUT /pricing` | Admin (`pricing.manage`) |
| `GET /coupons` | Staff (`coupons.read`) |
| `POST /coupons`, `PATCH/DELETE /coupons/[id]` | Admin (`coupons.manage`) |
| `GET /products`, `GET /packages`, `GET /vps-packages` | Staff (`products.read`) |
| `POST /products`, `PATCH/DELETE /products/[id]` | Admin (`products.manage`) |
| `POST /packages`, `PATCH/DELETE /packages/[id]` | Admin (`packages.manage`); tier `medium` atau `high` |
| `POST /vps-packages`, `PATCH/DELETE /vps-packages/[id]` | Admin (`packages.manage`) |
| `GET /analytics` | Admin (`analytics.read`) |
| `GET /settings` | Staff (`settings.read`) |
| `PUT /settings` | Per grup field: status layanan → Staff (`status.manage`), ketersediaan katalog (`catalogStatus`) → Admin (`products.manage`), maintenance → Owner (`maintenance.manage`), sisanya → Admin (`settings.manage`) |
| `GET /audit-logs` (filter `resource`, `q`) | Admin (`audit.read`) |
| `GET /cms/[resource]`, `GET /cms/[resource]/[id]` | Staff (`readPermission` resource: `content.read` / `status.read`) |
| `POST/PATCH/DELETE /cms/[resource]` | `writePermission` resource: `content.manage` (Admin), `legal.manage` (Admin), `status.manage` (Staff untuk incidents/maintenanceWindows) |

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
