# Issue: Implementasi Endpoint Tambahan & Perbaikan Cookie Lintas Domain (SameSite=None) di Express Backend

## Deskripsi / Latar Belakang
Frontend aplikasi saat ini telah dimigrasi menjadi React SPA (Vite) yang menembak API backend Express di Render secara langsung. Namun, beberapa fitur di frontend (Manajemen Pengguna, Portal Wali Murid, Tunggakan SPP, Rekap Kelas, dan Import CSV Siswa) mengalami error 404/401 karena endpoint-endpoint pendukungnya belum terimplementasi di backend `spp-backend-render`.

Untuk menyelaraskan backend dengan frontend, kita perlu menambahkan beberapa endpoint dan memperbarui kebijakan pengiriman cookie agar mendukung otentikasi lintas domain (Cross-Origin).

---

## 🛠️ Daftar Perubahan & File Pendukung
Seluruh berkas kode sumber untuk perubahan ini sudah disiapkan di folder `backend-additions/` pada repository frontend:
👉 **[Lihat Kode Sumber Tambahan di Sini](https://github.com/bons027/tes-deploy/tree/main/backend-additions)**

### 1. Perbaikan Otentikasi & Cookie (Luncurkan Lintas Domain)
Perbarui pengaturan cookie di `AuthController.ts` saat pengguna melakukan login dan get session agar menggunakan `SameSite=None` dan `Secure=true` saat berjalan di production (Render / HTTPS). Jika tidak disetel, browser akan memblokir cookie token JWT karena domain frontend (Vercel/Localhost) berbeda dengan domain backend (Render).
- **File Referensi**: `backend-additions/controllers/InvoiceController.ts` & `routes/authRoutes.ts`.
- **Implementasikan juga endpoint `/auth/logout`** untuk membersihkan cookie `token` secara aman di browser klien.

### 2. Implementasi Endpoint Tagihan SPP (Invoices)
Tambahkan route tagihan baru di `invoiceRoutes.ts` dan logic handler di `InvoiceController.ts`:
- **`GET /api/invoices/unpaid`**: Mengambil daftar tagihan yang belum lunas (untuk halaman Tunggakan SPP).
- **`GET /api/invoices/class-recap`**: Rekap total tunggakan per kelas untuk analisis diagram di dashboard dan ekspor CSV.
- **`GET /api/invoices/student/:studentNumber`**: Mengambil daftar tagihan bulanan spesifik berdasarkan NIS siswa (untuk halaman Cek Tagihan publik dan pembayaran).
- **`POST /api/invoices/pay-online-simulated`**: Simulasi proses pembayaran online.
- **File Referensi**:
  - `backend-additions/routes/invoiceRoutes.ts`
  - `backend-additions/controllers/InvoiceController.ts`

### 3. Penambahan Fitur Unggah CSV Siswa (Students)
Tambahkan route di `studentRoutes.ts` dan handler di `StudentController.ts`:
- **`POST /api/students/import`**: Menerima data array siswa hasil parsing CSV dari frontend, menyimpannya ke database, dan otomatis membuatkan akun wali murid untuk nomor HP yang terdaftar.
- **File Referensi**:
  - `backend-additions/routes/studentRoutes.ts`
  - `backend-additions/controllers/StudentController.ts`

### 4. Implementasi Manajemen Pengguna (Users CRUD)
Buat route baru `userRoutes.ts` untuk melayani pengelolaan pengguna (tambah, edit, hapus admin/staf):
- **`GET /api/users`**: List data pengguna.
- **`POST /api/users`**: Tambah pengguna baru.
- **`PUT /api/users/:id`**: Update profil/peran pengguna.
- **`DELETE /api/users/:id`**: Hapus akun pengguna.
- **File Referensi**: `backend-additions/routes/userRoutes.ts`

### 5. Implementasi Portal Orang Tua (Parent Children Lookup)
Buat route baru `parentRoutes.ts`:
- **`GET /api/parent/children`**: Mengambil data anak-anak yang terhubung dengan nomor HP akun wali murid yang sedang aktif masuk.
- **File Referensi**: `backend-additions/routes/parentRoutes.ts`

---

## 📝 Langkah Pemasangan ke Backend Render
1. Salin isi berkas dari folder `backend-additions/` ke folder/jalur yang bersesuaian di dalam repository backend `spp-backend-render` Anda.
2. Impor dan registrasikan rute-rute baru tersebut (`userRoutes`, `parentRoutes`) di dalam berkas inisialisasi Express utama Anda (`src/main/app.ts`), seperti yang dicontohkan pada `backend-additions/main/app.ts`.
3. Lakukan commit dan push ke repository backend Anda untuk memicu build otomatis di Render.
