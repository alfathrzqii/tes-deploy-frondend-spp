# Dokumentasi API & Keamanan (Fullstack Next.js)

Dokumentasi ini menjelaskan arsitektur keamanan, otorisasi, manajemen sesi, serta referensi lengkap API endpoint yang digunakan pada sistem pembayaran SPP terintegrasi.

---

## 1. Arsitektur Keamanan & Otorisasi

Sistem ini dirancang menggunakan arsitektur **Fullstack Next.js (App Router)** dengan perlindungan API terpusat.

### A. Autentikasi (Sesi JWT)
*   **Mekanisme**: Menggunakan JWT (JSON Web Token) yang disimpan dalam **HTTP-Only Cookie** bernama `token`.
*   **Masa Berlaku**: Sesi JWT berlaku selama **1 hari (`1d`)**.
*   **Keuntungan**: Menyimpan JWT dalam HTTP-only cookie mencegah eksploitasi serangan *Cross-Site Scripting (XSS)* dari sisi client (JavaScript tidak bisa membaca cookie tersebut).

### B. Otorisasi Berbasis Peran (RBAC - Role-Based Access Control)
Sistem membedakan tiga level otorisasi utama menggunakan field `Role` pada database:
1.  `SUPER_ADMIN`: Memiliki akses penuh global untuk melihat dan mengelola seluruh transaksi, kategori kas, tarif SPP, dan data siswa di semua unit sekolah.
2.  `UNIT_ADMIN`: Dibatasi hanya untuk melihat dan mengelola data milik unit sekolahnya saja (misal: hanya unit SD). Ditentukan berdasarkan `schoolUnitId`.
3.  `PARENT`: Wali murid, hanya diperkenankan melihat halaman cek tagihan publik serta status pelunasan invoice milik anak-anak mereka.

### C. Isolasi Data Multi-Unit (Data Isolation)
Untuk mencegah kebocoran data antar unit sekolah, setiap API Endpoint melakukan validasi kepemilikan unit sekolah.

*Contoh logika isolasi pada Route Handler:*
```typescript
// Pengecekan otorisasi & isolasi unit sekolah
if (authResult.role === "UNIT_ADMIN") {
  // Paksa query hanya memfilter data berdasarkan unit admin tersebut
  schoolUnitId = authResult.schoolUnitId;
}
```

---

## 2. Struktur Token JWT

Payload token yang didekripsi di sisi server memiliki struktur data sebagai berikut:

```json
{
  "id": 1,
  "email": "adminsd@sekolah.sch.id",
  "role": "UNIT_ADMIN",
  "schoolUnitId": 3
}
```

---

## 3. Referensi Lengkap API Endpoints

Semua endpoint API memiliki prefix `/api` dan mengembalikan format respons standar JSON.

### A. Autentikasi (`/api/auth`)

#### 1. Login Pengguna
*   **Endpoint**: `POST /api/auth/login`
*   **Keamanan**: Terbuka untuk umum (Public).
*   **Request Body**:
    ```json
    {
      "email": "superadmin@sekolah.sch.id",
      "password": "admin123"
    }
    ```
*   **Respons (Sukses - HTTP 200)**:
    Mengatur cookie `token` pada browser.
    ```json
    {
      "success": true,
      "message": "Login berhasil",
      "user": {
        "id": 1,
        "name": "Super Admin Yayasan",
        "email": "superadmin@sekolah.sch.id",
        "role": "SUPER_ADMIN",
        "schoolUnitId": null
      }
    }
    ```

#### 2. Logout Pengguna
*   **Endpoint**: `POST /api/auth/logout`
*   **Keamanan**: Memerlukan Autentikasi.
*   **Respons (Sukses - HTTP 200)**:
    Menghapus cookie `token` dari browser.
    ```json
    {
      "success": true,
      "message": "Logout berhasil"
    }
    ```

#### 3. Cek Sesi Aktif
*   **Endpoint**: `GET /api/auth/me`
*   **Keamanan**: Memerlukan Autentikasi.
*   **Respons (Sukses - HTTP 200)**:
    ```json
    {
      "success": true,
      "user": {
        "id": 1,
        "name": "Super Admin Yayasan",
        "email": "superadmin@sekolah.sch.id",
        "role": "SUPER_ADMIN",
        "schoolUnitId": null
      }
    }
    ```

---

### B. Pengelolaan Siswa (`/api/students`)

#### 1. Ambil Daftar Siswa
*   **Endpoint**: `GET /api/students`
*   **Keamanan**: `SUPER_ADMIN` atau `UNIT_ADMIN`.
*   **Query Parameters**:
    *   `search` (opsional): Mencari berdasarkan nama atau NIS.
    *   `schoolUnitId` (opsional): Filter per unit (Hanya berfungsi bagi `SUPER_ADMIN`).
*   **Respons (Sukses - HTTP 200)**:
    ```json
    {
      "success": true,
      "message": "Daftar data siswa berhasil diambil",
      "data": [
        {
          "id": 1,
          "studentNumber": "SD-2024-001",
          "name": "Budi Santoso",
          "schoolUnitId": 3,
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

#### 2. Registrasi Siswa Baru + Akun Orang Tua
*   **Endpoint**: `POST /api/students`
*   **Keamanan**: `SUPER_ADMIN` atau `UNIT_ADMIN` (dengan validasi isolasi unit).
*   **Request Body**:
    ```json
    {
      "studentNumber": "SD-2025-002",
      "name": "Andi Pratama",
      "schoolUnitId": 3,
      "enrollmentYear": 2025,
      "discountPercentage": 0,
      "parentName": "Joko Widodo",
      "parentEmail": "jokowi@test.com"
    }
    ```
*   **Respons (Sukses - HTTP 201)**:
    ```json
    {
      "success": true,
      "message": "Data siswa dan akun orang tua berhasil didaftarkan",
      "data": {
        "id": 3,
        "studentNumber": "SD-2025-002",
        "name": "Andi Pratama",
        "schoolUnitId": 3,
        "parentId": 5,
        "enrollmentYear": 2025,
        "discountPercentage": 0
      }
    }
    ```

#### 3. Hapus Data Siswa
*   **Endpoint**: `DELETE /api/students/:id`
*   **Keamanan**: `SUPER_ADMIN` atau `UNIT_ADMIN`.
*   **Respons (Sukses - HTTP 200)**:
    ```json
    {
      "success": true,
      "message": "Data siswa berhasil dihapus"
    }
    ```

---

### C. Tagihan & Pembayaran (`/api/invoices`)

#### 1. Cek Rincian Tagihan Siswa (Portal Publik)
*   **Endpoint**: `GET /api/invoices/student/:studentNumber`
*   **Keamanan**: Terbuka untuk umum (Public Portal).
*   **Query Parameters**: `year` (contoh: `2026`).
*   **Respons (Sukses - HTTP 200)**:
    Mengembalikan array tagihan SPP selama 12 bulan (1-12) baik yang berstatus `PENDING` maupun `PAID`.
    ```json
    {
      "success": true,
      "message": "Daftar invoice SPP siswa berhasil diambil",
      "data": [
        {
          "id": 1,
          "studentId": 1,
          "invoiceType": "SPP",
          "month": 1,
          "year": 2026,
          "baseAmount": 150000,
          "discountApplied": 15000,
          "amount": 135000,
          "status": "PAID",
          "midtransOrderId": "MOCK-MIDTRANS-1717830232"
        }
      ]
    }
    ```

#### 2. Bayar SPP Tunai Offline (Loket Kasir)
*   **Endpoint**: `POST /api/invoices/pay-offline`
*   **Keamanan**: `SUPER_ADMIN` atau `UNIT_ADMIN`.
*   **Request Body**:
    ```json
    {
      "studentNumber": "SD-2024-001",
      "month": 2,
      "year": 2026
    }
    ```
*   **Respons (Sukses - HTTP 200)**:
    ```json
    {
      "success": true,
      "message": "Pembayaran tunai SPP offline berhasil diproses",
      "data": {
        "invoice": {
          "id": 2,
          "studentId": 1,
          "invoiceType": "SPP",
          "month": 2,
          "year": 2026,
          "baseAmount": 150000,
          "discountApplied": 15000,
          "amount": 135000,
          "status": "PAID",
          "midtransOrderId": null
        },
        "transaction": {
          "id": 45,
          "amount": 135000,
          "paymentMethod": "CASH",
          "type": "INCOME"
        }
      }
    }
    ```

#### 3. Simulasi Bayar Online (Midtrans Snap Gateway)
*   **Endpoint**: `POST /api/invoices/pay-online-simulated`
*   **Keamanan**: Terbuka untuk umum (Public).
*   **Request Body**:
    ```json
    {
      "studentNumber": "SD-2024-001",
      "month": 3,
      "year": 2026
    }
    ```
*   **Respons (Sukses - HTTP 200)**:
    ```json
    {
      "success": true,
      "message": "Simulasi pembayaran online SPP (Midtrans) berhasil diproses",
      "data": {
        "invoiceId": 3,
        "studentId": 1,
        "month": 3,
        "year": 2026,
        "amountPaid": 135000,
        "transactionId": 46,
        "midtransOrderId": "MOCK-MIDTRANS-1717830999"
      }
    }
    ```

---

### D. Tarif SPP (`/api/spp-tariffs`)

#### 1. Ambil Tarif SPP
*   **Endpoint**: `GET /api/spp-tariffs`
*   **Keamanan**: `SUPER_ADMIN` atau `UNIT_ADMIN`.
*   **Respons (Sukses - HTTP 200)**:
    ```json
    {
      "success": true,
      "message": "Daftar tarif SPP berhasil diambil",
      "data": [
        {
          "id": 1,
          "schoolUnitId": 3,
          "enrollmentYear": 2024,
          "amount": 150000
        }
      ]
    }
    ```

#### 2. Tambah Tarif SPP Baru
*   **Endpoint**: `POST /api/spp-tariffs`
*   **Keamanan**: Hanya `SUPER_ADMIN`.
*   **Request Body**:
    ```json
    {
      "schoolUnitId": 3,
      "enrollmentYear": 2026,
      "amount": 200000
    }
    ```

---

## 4. Keamanan di Tingkat Database (Supabase PostgreSQL)

1.  **Enkripsi Kata Sandi**:
    Kata sandi akun pengguna disimpan menggunakan hash satu arah **bcrypt** dengan salt round sebanyak **10**.
2.  **Pemformatan Validasi Data**:
    *   Composite Unique Key `uq_school_unit_enrollment_year` memastikan tidak ada tarif ganda untuk unit dan angkatan yang sama.
    *   Composite Unique Key `uq_student_billing_period` mencegah pembuatan tagihan ganda untuk siswa, bulan, tahun, dan tipe tagihan yang sama.
