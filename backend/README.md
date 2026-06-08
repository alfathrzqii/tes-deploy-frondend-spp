# School SPP Management System - API Documentation

Backend ini dibangun menggunakan **Express.js**, **TypeScript**, dan **Prisma ORM** dengan database **SQLite** lokal untuk pencatatan keuangan dan SPP sekolah yang terisolasi multi-unit (RA/KB, TK, SD).

---

## 🚀 Memulai (Setup)

### 1. File Environment
Salin berkas `.env.example` menjadi `.env` di folder `/backend`:
```ini
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-key-spp-payments-12345"
CORS_ORIGIN="http://localhost:3001"
```

### 2. Instalasi & Menjalankan Database
Jalankan perintah berikut untuk menginstal dependensi, membuat tabel database, dan menyemai data awal (seeding):
```bash
# Instal dependensi
npm install

# Sinkronisasi skema database SQLite
npx prisma db push

# Jalankan seeder data default
npx prisma db seed
```

### 3. Menjalankan Server
```bash
# Mode Pengembangan (Development)
npm run dev

# Mode Produksi (Build & Start)
npm run build
npm start
```

---

## 🔐 Kredensial Demo (Seeder)
Gunakan email & sandi berikut untuk menguji API di klien:
* **Super Admin**: `superadmin@sekolah.sch.id` (Sandi: `admin123`)
* **Admin Unit SD**: `adminsd@sekolah.sch.id` (Sandi: `admin123`)
* **Wali Murid**: `parent@test.com` (Sandi: `parent123`)

---

## 🛡️ Autentikasi & Otorisasi
Semua endpoint berlabel 🔒 memerlukan JWT Token. Token dikirimkan secara otomatis dari backend melalui Cookie httpOnly bernama `token`. Setel opsi `withCredentials: true` pada HTTP Client Anda (misal: Axios) di frontend.

---

## 📌 Endpoint API

### 1. Autentikasi (`/api/auth`)

#### ➔ POST `/api/auth/login`
Autentikasi pengguna dan setel cookie JWT.
* **Payload Request:**
  ```json
  {
    "email": "superadmin@sekolah.sch.id",
    "password": "admin123"
  }
  ```
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login berhasil",
    "data": {
      "id": 1,
      "name": "Super Admin Yayasan",
      "email": "superadmin@sekolah.sch.id",
      "role": "SUPER_ADMIN"
    }
  }
  ```

#### ➔ GET `/api/auth/me` 🔒
Mendapatkan profil pengguna aktif berdasarkan cookie JWT.
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "name": "Super Admin Yayasan",
      "email": "superadmin@sekolah.sch.id",
      "role": "SUPER_ADMIN",
      "schoolUnitId": null
    }
  }
  ```

#### ➔ POST `/api/auth/logout`
Menghapus cookie autentikasi.
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logout berhasil"
  }
  ```

---

### 2. Kategori Keuangan (`/api/categories`) 🔒
*(Khusus `SUPER_ADMIN` dan `UNIT_ADMIN`)*

#### ➔ GET `/api/categories`
Membaca semua kategori buku kas.
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "SPP", "type": "INCOME", "schoolUnitId": null },
      { "id": 4, "name": "Gaji Guru", "type": "EXPENSE", "schoolUnitId": null }
    ]
  }
  ```

#### ➔ POST `/api/categories`
Membuat kategori transaksi baru.
* **Payload Request:**
  ```json
  {
    "name": "Uang Seragam",
    "type": "INCOME",
    "schoolUnitId": 3
  }
  ```

#### ➔ PUT `/api/categories/:id`
Mengubah data kategori.

#### ➔ DELETE `/api/categories/:id`
Menghapus kategori.

---

### 3. Master Tarif SPP (`/api/spp-tariffs`) 🔒
*(Akses Baca untuk `SUPER_ADMIN` dan `UNIT_ADMIN`. Akses Tulis HANYA `SUPER_ADMIN`)*

#### ➔ GET `/api/spp-tariffs`
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "schoolUnitId": 3, "enrollmentYear": 2024, "amount": 150000 }
    ]
  }
  ```

#### ➔ POST `/api/spp-tariffs`
Membuat nominal tarif SPP baru per unit & angkatan.
* **Payload Request:**
  ```json
  {
    "schoolUnitId": 3,
    "enrollmentYear": 2026,
    "amount": 200000
  }
  ```

#### ➔ PUT `/api/spp-tariffs/:id`
Mengubah jumlah nominal tarif SPP.

#### ➔ DELETE `/api/spp-tariffs/:id`
Menghapus master tarif.

---

### 4. Manajemen Siswa (`/api/students`) 🔒
*(Khusus `SUPER_ADMIN` dan `UNIT_ADMIN`)*

#### ➔ GET `/api/students`
Mengambil semua data siswa. Mendukung filter pencarian nama/NIS via query string `?search=...`.
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "studentNumber": "SD-2024-001",
        "name": "Budi Santoso",
        "schoolUnitId": 3,
        "parentId": 3,
        "enrollmentYear": 2024,
        "discountPercentage": 10,
        "parent": {
          "name": "Hendra Wijaya (Wali Murid)",
          "email": "parent@test.com"
        }
      }
    ]
  }
  ```

#### ➔ POST `/api/students`
Mendaftarkan siswa baru. Otomatis membuat akun user Wali Murid di tabel `users` dengan sandi default ter-hash `parent123` jika email wali belum terdaftar.
* **Payload Request:**
  ```json
  {
    "studentNumber": "SD-2026-003",
    "name": "Rian Hidayat",
    "schoolUnitId": 3,
    "enrollmentYear": 2026,
    "parentName": "Taufik Hidayat",
    "parentEmail": "taufik@gmail.com"
  }
  ```

---

### 5. Buku Kas & Transaksi (`/api/transactions`) 🔒
*(Khusus `SUPER_ADMIN` dan `UNIT_ADMIN`)*

#### ➔ GET `/api/transactions`
Mengambil riwayat transaksi masuk & keluar.
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "date": "2026-06-08T06:35:42.000Z",
        "type": "INCOME",
        "amount": 135000,
        "paymentMethod": "CASH",
        "description": "Pembayaran SPP offline tunai bulan 6 tahun 2026 untuk siswa Budi Santoso",
        "schoolUnitId": 3,
        "categoryId": 1
      }
    ]
  }
  ```

#### ➔ POST `/api/transactions`
Mencatat transaksi manual (non-SPP) baru.
* **Payload Request:**
  ```json
  {
    "type": "EXPENSE",
    "categoryId": 5,
    "amount": 75000,
    "description": "Pembelian spidol papan tulis unit SD",
    "schoolUnitId": 3,
    "paymentMethod": "CASH"
  }
  ```

---

### 6. Tagihan & Pembayaran SPP (`/api/invoices`)

#### ➔ POST `/api/invoices/pay-offline` 🔒
Mencatat pembayaran SPP tunai secara offline oleh admin di loket sekolah.
* **Payload Request:**
  ```json
  {
    "studentNumber": "SD-2024-001",
    "month": 6,
    "year": 2026,
    "invoiceType": "SPP"
  }
  ```
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "message": "Pembayaran tunai SPP offline berhasil diproses",
    "data": {
      "id": 5,
      "invoiceId": 5,
      "studentId": 1,
      "month": 6,
      "year": 2026,
      "baseAmount": 150000,
      "discountApplied": 15000,
      "amount": 135000,
      "amountPaid": 135000,
      "transactionId": 12
    }
  }
  ```

#### ➔ GET `/api/invoices/student/:studentNumber`
**[Public Portal]** Mendapatkan 12 bulan daftar tagihan untuk satu tahun kalender bagi siswa tertentu (tanpa login admin).
* **Query Params:** `?year=2026` (Default tahun saat ini)
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 5,
        "studentId": 1,
        "invoiceType": "SPP",
        "month": 6,
        "year": 2026,
        "baseAmount": 150000,
        "discountApplied": 15000,
        "amount": 135000,
        "status": "PAID",
        "midtransOrderId": null
      },
      {
        "id": null,
        "studentId": 1,
        "invoiceType": "SPP",
        "month": 7,
        "year": 2026,
        "baseAmount": 150000,
        "discountApplied": 15000,
        "amount": 135000,
        "status": "PENDING",
        "midtransOrderId": null
      }
    ]
  }
  ```

#### ➔ POST `/api/invoices/pay-online-simulated`
**[Public Portal]** Simulasi pelunasan tagihan online menggunakan gateway Midtrans Snap. Mengisi kas masuk otomatis dengan paymentMethod `MIDTRANS` di database.
* **Payload Request:**
  ```json
  {
    "studentNumber": "SD-2024-001",
    "month": 7,
    "year": 2026
  }
  ```
* **Response Sukses (200 OK):**
  ```json
  {
    "success": true,
    "message": "Simulasi pembayaran online SPP (Midtrans) berhasil diproses",
    "data": {
      "invoiceId": 6,
      "studentId": 1,
      "month": 7,
      "year": 2026,
      "amountPaid": 135000,
      "transactionId": 13,
      "midtransOrderId": "MOCK-MIDTRANS-1718023456789"
    }
  }
  ```
