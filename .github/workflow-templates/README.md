# Template Workflow — Aktivasi GitHub Actions

Apabila repository tidak mengizinkan workflow di `.github/workflows/` (misalnya organisasi
membatasi izin Actions), salin file dari folder ini ke `.github/workflows/` untuk mengaktifkan.

## Cara aktivasi

```bash
# Dari root repository:
mkdir -p .github/workflows
cp .github/workflow-templates/ci.yml .github/workflows/ci.yml
```

Lalu buka tab **Actions** di repository dan aktifkan workflow untuk repository ini.

## Isi Workflow

| Job | Deskripsi |
| --- | --- |
| `quality` | Typecheck (0 error), lint (0 error/warning), unit test pricing, production build |
| `smoke` | HTTP smoke test 64 acceptance check terhadap `next start` |
| `dependency-audit` | `npm audit --audit-level=high` |
| `codeql` | Analisis keamanan statis (javascript-typescript) |

## Catatan Keamanan

- Workflow TIDAK membutuhkan secret apa pun — test berjalan dengan fallback JSON datastore
  dan nilai `JWT_SECRET`/`WHATSAPP_NUMBER` khusus CI (bukan nilai production).
- Jangan menambahkan secret production ke environment CI.
