# Panduan Kontribusi

Terima kasih atas minat Anda untuk berkontribusi pada WangStore.

## Prinsip

1. **Correctness** — fitur harus benar-benar berfungsi, bukan placeholder.
2. **Security** — setiap perubahan yang menyentuh pricing, order, auth, RBAC, CSRF, rate limiting, CMS, atau data pribadi wajib melewati pipeline keamanan yang sama.
3. **Usability** — teks UI Bahasa Indonesia yang natural dan profesional.
4. **Maintainability** — SOLID, DRY, KISS; tanpa `any`, tanpa duplikasi logika (khususnya pricing & CMS).

## Aturan Wajib

- Tidak ada placeholder, lorem ipsum, TODO/FIXME, data palsu, tombol/fungsi/endpoint kosong, atau link mati.
- Formula harga HANYA di `src/lib/pricing` — UI dan API mengimpor modul yang sama.
- Validasi & RBAC diverifikasi ulang di setiap API route.
- Perubahan skema database dicatat di `database/schema.sql` (idempotent) + CHANGELOG.
- Semua teks UI dalam Bahasa Indonesia.
- Hormati `prefers-reduced-motion`, mobile-first, aksesibilitas (semantic HTML, keyboard, ARIA).

## Alur Kerja

1. Fork repository dan buat branch fitur (`feat/nama`, `fix/nama`, `docs/nama`).
2. Implementasikan perubahan + test bila relevan.
3. Jalankan verifikasi lokal:
   ```bash
   npm run typecheck   # 0 error
   npm run lint        # 0 error, 0 warning
   npm run test        # semua lulus
   npm run build       # build berhasil
   npm run smoke       # smoke test (bila menyentuh alur publik)
   ```
4. Buka pull request menggunakan template yang tersedia.

## Testing

- Unit test pricing: `src/lib/pricing/pricing.test.ts` (Vitest).
- HTTP smoke test: `scripts/smoke-test.mjs` — 64 acceptance check termasuk harga, normalisasi, 409/422, CSRF, RBAC, dan kupon.
- Tambahkan test baru untuk perilaku baru; jangan hapus acceptance check yang ada.

## Keamanan

- Jangan commit `.env`, secret, service role key, atau kredensial apa pun.
- Jangan mengirim data sensitif ke klien; harga/diskonto selalu dihitung server.
- Audit log tidak boleh menyimpan password/secret.

## Pelaporan Bug

Gunakan template issue `bug_report`. Sertakan langkah reproduksi tanpa data pribadi. Untuk kerentanan keamanan, laporkan secara privat melalui kanal resmi (jangan buka issue publik).
