## Ringkasan

<!-- Apa yang diubah dan mengapa. -->

## Tipe Perubahan

- [ ] Perbaikan bug
- [ ] Fitur baru
- [ ] Perubahan dokumentasi
- [ ] Refactor / peningkatan teknis

## Verifikasi

- [ ] `npm run typecheck` — 0 error
- [ ] `npm run lint` — 0 error, 0 warning
- [ ] `npm run test` — semua lulus
- [ ] `npm run build` — build berhasil
- [ ] Smoke test (`npm run smoke`) lulus bila relevan

## Catatan Keamanan

<!-- Sebutkan bila perubahan menyentuh: pricing, order, auth, RBAC, CSRF, rate limiting, CMS, atau data pribadi. -->

## Checklist

- [ ] Tidak ada placeholder / TODO / FIXME
- [ ] Tidak ada `any` di TypeScript
- [ ] Teks UI Bahasa Indonesia yang natural
- [ ] Formula harga memakai shared module `src/lib/pricing` (tidak diduplikasi)
- [ ] Perubahan schema didokumentasikan di `database/schema.sql` + CHANGELOG
