# RFM CRM Prototype

Prototype CRM fundraising dengan **RFM sebagai highlight**, disusun dari notebook RFM yang diberikan.

## Arsitektur

```text
Browser
  |
  | Google OAuth session
  v
Next.js 16 / Auth.js (BFF) :3000
  |
  | X-Internal-Key (server-to-server)
  v
FastAPI :8000
  |                         |
  | read transaksi/live     | donor_summary + sync_run
  v                         v
Source MySQL :3307      Dashboard MySQL :3308
```

### Kenapa memakai BFF?
Browser tidak mengakses FastAPI langsung. Semua request UI melewati Next.js Route Handler yang memeriksa session Google lalu menambahkan internal API key ketika meneruskan request ke FastAPI. Untuk prototype internal, ini lebih aman dan lebih sederhana daripada mengekspos credential/token backend ke browser.

## Fitur yang sudah ada

- Dashboard KPI: donor valid, transaksi hari ini, Champion, program favorit.
- Chart distribusi segmen RFM dan top program favorit.
- Tabel donor, default order segmen prioritas lalu Monetary terbesar.
- Filter segmen, program, payment method, dan search nama/HP/email.
- Detail donor: profile, min/max/median, R/F/M, oldest/latest, favorit, 20 transaksi terakhir.
- App Router `loading.tsx` untuk skeleton dashboard, tabel, dan donor detail.
- Google OAuth allowlist berbasis domain/email internal.
- Dua database terpisah: source history dan dashboard summary.
- Scheduler harian (Asia/Jakarta) dan endpoint manual sync.
- Docker Compose + source DB demo agar alur bisa dicoba lokal.

## Logika RFM dari notebook

Prototype mempertahankan pola utama notebook:

1. Nomor HP dinormalisasi menjadi `62...`.
2. Format HP divalidasi dan pola mencurigakan ditolak.
3. Donor dengan nomor valid yang sama digabung ke donor canonical; donor dengan transaksi terbanyak menjadi prioritas canonical.
4. Nama anonim/kosong dinormalisasi menjadi `Sobat Masjid`.
5. Statistik: first/last donation, recency, frequency, monetary, min/max/median/average.
6. Favorite program/payment berdasarkan frekuensi kemunculan.
7. Recency dan Monetary memakai `qcut(..., duplicates='drop')`; Frequency memakai business bins `[1], [2], [3-4], [5-9], [10+]`.
8. Segment: Champion, Loyal Donor, At Risk, Lost, New Donor, Potential.

Catatan: typo DDL notebook `recency_days INT,xs` diperbaiki melalui SQLAlchemy model.

## Menjalankan lokal

### 1. Siapkan env

```bash
make setup
```

Edit `frontend/.env.local` dan isi Google OAuth:

```env
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_SECRET=...
ALLOWED_GOOGLE_DOMAINS=masjidnusantara.org
```

Untuk demo tanpa domain organisasi, isi `ALLOWED_GOOGLE_EMAILS=emailanda@gmail.com`.

### 2. Jalankan

```bash
make up
```

### 3. Jalankan initial RFM sync

```bash
make sync
```

Lalu buka `http://localhost:3000`.

## Mapping ke database asli

Query source ada di `backend/app/services/sync.py`, mengikuti notebook:
- `corez_donatur`
- `corez_transaksi`
- `setting_program`
- `fins_coa`

Untuk database aktual, cukup ganti `SOURCE_DATABASE_URL` dan `DASHBOARD_DATABASE_URL` di `backend/.env`, lalu sesuaikan query jika schema produksi berbeda.

## Endpoint backend

- `GET /health`
- `GET /api/dashboard/summary`
- `GET /api/donors?page=1&limit=25&segment=...&program=...&payment=...&search=...`
- `GET /api/donors/{id}`
- `GET /api/analytics/donor-type?year=2026` — persentase donor baru / tetap / kembali aktif untuk tahun tertentu, dihitung dari riwayat transaksi per `id_donatur`.
- `GET /api/filters`
- `POST /api/admin/sync`
- `GET /api/admin/users` — daftar user yang punya akses (perlu header `X-User-Email` milik admin aktif)
- `POST /api/admin/users` — tambah user baru; hanya menerima email pada domain `INTERNAL_EMAIL_DOMAIN` (atau yang ada di `ALLOWED_EXTRA_EMAILS`)

Semua `/api/*` FastAPI memerlukan header `x-internal-key`. Endpoint `/api/admin/users` tambahan memerlukan header `x-user-email` milik user dengan role `admin` dan `is_active=true` (dicek ulang di backend, bukan hanya di Next.js).

## Catatan keamanan penting

Repo ini sempat menyertakan `backend/.env` berisi kredensial database asli pada commit awal. File tersebut sudah dihapus dari working tree pada iterasi ini dan `.gitignore` sudah ditambahkan, **tetapi kredensial tersebut tetap tercatat di histori git dan sudah pernah publik** — segera:
1. Rotate/ganti password MySQL yang bersangkutan.
2. Bersihkan histori git (mis. `git filter-repo` atau BFG Repo-Cleaner) agar commit lama tidak lagi menyimpan kredensial tersebut.


## Catatan untuk iterasi berikutnya

Prototype sekarang melakukan full recomputation saat job RFM berjalan. Ini sengaja dipilih karena paling mudah diverifikasi terhadap notebook. Untuk data produksi besar, tahap berikutnya idealnya menambah watermark (`last_transaction_id`/`updated_at`), affected-donor queue, incremental aggregation, materialized metrics harian, audit perubahan segment, dan background worker terpisah dari web process.
