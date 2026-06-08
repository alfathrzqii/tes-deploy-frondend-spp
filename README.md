# School SPP Management & Bookkeeping System

Aplikasi Fullstack Manajemen SPP dan Buku Kas Sekolah dengan isolasi multi-unit (RA/KB, TK, SD). Dilengkapi dengan Dashboard Admin, Pencarian Tagihan Siswa Publik, dan **Simulasi Interaktif Gateway Pembayaran Midtrans Snap**.

---

## 📁 Struktur Proyek

Proyek ini terdiri dari dua bagian utama:
1. **[`/backend`](./backend)**: RESTful API yang dibangun menggunakan Node.js, Express, TypeScript, dan Prisma ORM dengan database SQLite lokal.
2. **[`/frontend`](./frontend)**: Antarmuka pengguna (UI) modern yang dibangun menggunakan Next.js (App Router), Tailwind CSS, Axios, dan Zustand.

---

## 🚀 Cara Menjalankan Aplikasi

Pastikan Anda telah menginstal **Node.js** di komputer Anda.

### Langkah 1: Pengaturan Backend & Database
1. Buka terminal baru dan masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Salin `.env.example` menjadi `.env` dan sesuaikan nilainya (default sudah sesuai untuk SQLite).
3. Jalankan perintah instalasi dan inisialisasi database:
   ```bash
   # Instal dependensi
   npm install

   # Buat database dev.db & sync tabel
   npx prisma db push

   # Seed data akun & tarif default
   npx prisma db seed
   ```
4. Jalankan server backend:
   ```bash
   npm run dev
   ```
   *Backend akan berjalan di **http://localhost:3000**.*

---

### Langkah 2: Pengaturan Frontend Next.js
1. Buka terminal baru (split) dan masuk ke folder `frontend`:
   ```bash
   cd frontend
   ```
2. Jalankan perintah instalasi dan jalankan dev server:
   ```bash
   # Instal dependensi
   npm install

   # Jalankan frontend server
   npm run dev
   ```
   *Frontend akan berjalan di **http://localhost:3001**.*

---

## 🔐 Kredensial Pengujian Default
Gunakan akun bawaan (seeder) berikut untuk menguji sistem:
* **Super Admin (Akses Global)**: `superadmin@sekolah.sch.id` (Sandi: `admin123`)
* **Admin Unit SD**: `adminsd@sekolah.sch.id` (Sandi: `admin123`)
* **Wali Murid (Orang Tua)**: `parent@test.com` (Sandi: `parent123`)

---

## 🛠️ Fitur Utama

1. **Dashboard & Manajemen Keuangan (RBAC)**:
   * **Super Admin**: Mengontrol penuh semua data unit sekolah, master tarif SPP, kategori buku kas, dan rekap keuangan global.
   * **Unit Admin (RA/TK/SD)**: Mengelola siswa, melakukan pencatatan transaksi masuk/keluar, dan mencatat SPP offline hanya untuk unit sekolah mereka sendiri.

2. **Pembayaran SPP Offline (Tunai)**:
   * Kasir mencatat pembayaran tunai langsung di loket, memasukkan NIS siswa, memilih bulan periode, dan mencetak resi kuitansi pembayaran digital langsung.

3. **Portal Pengecekan Tagihan Siswa Publik (`/cek-tagihan`)**:
   * Halaman publik bebas login untuk siswa/orang tua untuk mencari tagihan berdasarkan NIS. Menampilkan status SPP 12 bulan untuk tahun ajaran terkait secara real-time.

4. **Simulasi Midtrans Snap Pembayaran Online**:
   * Integrasi visual yang meniru **Midtrans Snap Modal** saat siswa membayar SPP secara mandiri di portal publik.
   * Simulasi pembayaran melalui QRIS, Bank Virtual Account (Mandiri, BCA), dan GoPay Instant yang memperbarui status database menjadi lunas dan otomatis mencatat kas masuk di jurnal kasir.

---

## 📖 Dokumentasi Detail API
Dokumentasi API lengkap untuk payload request, response endpoint, dan arsitektur backend dapat dibaca langsung di:
👉 **[Dokumentasi API Backend (`backend/README.md`)](./backend/README.md)**
