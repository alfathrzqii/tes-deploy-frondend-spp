# Panduan Lengkap Deploy Backend SPP ke Render

Dokumen ini berisi panduan langkah-demi-langkah untuk mendeploy aplikasi backend SPP (Express.js + TypeScript + Prisma + Supabase) ke platform **Render** sebagai **Web Service**.

Berbeda dengan Vercel yang menggunakan arsitektur *Serverless*, **Render** menjalankan aplikasi backend Anda sebagai server tradisional yang aktif terus-menerus (*persistent*), sehingga sangat cocok untuk aplikasi Node.js/Express.js standar.

---

## 📋 Prasyarat (Prerequisites)

Sebelum memulai, pastikan Anda memiliki:
1. **Akun GitHub** dan repositori proyek ini sudah di-push ke GitHub.
2. **Akun Render** yang terhubung dengan akun GitHub Anda.
3. **Database Supabase**. Karena Anda sudah memiliki database di Supabase, Anda memerlukan *Connection String* (URL koneksi) database tersebut.

---

## 💾 Langkah 1: Mendapatkan Connection String Supabase

Karena Render menggunakan server persisten (tidak seperti Vercel yang serverless), Anda dapat menggunakan salah satu dari dua koneksi berikut dari Supabase:

1. Buka dashboard [Supabase](https://supabase.com/).
2. Masuk ke proyek database Anda.
3. Pergi ke menu **Project Settings** (ikon gerigi di kiri bawah) -> **Database**.
4. Scroll ke bawah ke bagian **Connection string**.
5. Pilih tab **URI**. Anda akan melihat URL koneksi.
   * **Rekomendasi untuk Render**: Anda bisa memilih opsi **Session** (port `5432` koneksi langsung) atau opsi **Transaction** (port `6543` connection pooler). Kedua opsi ini bekerja dengan baik di Render karena Render menjaga koneksi database tetap hidup secara terus menerus (*persistent connections*).
6. Salin URI tersebut dan ganti `[YOUR-PASSWORD]` dengan password database Supabase Anda.

---

## 🛠️ Langkah 2: Mengkonfigurasi Build & Start Command di Render

Render membutuhkan perintah (command) untuk membangun (*build*) aplikasi Anda dari TypeScript menjadi JavaScript, dan perintah untuk menjalankan (*start*) aplikasi tersebut.

Berikut adalah konfigurasi yang akan kita masukkan di dashboard Render:
* **Build Command**:
  ```bash
  npm install --include=dev && npx prisma generate && npm run build
  ```
  *(Perintah ini menginstal semua modul termasuk devDependencies yang diperlukan TypeScript, membuat Prisma Client, dan mengompilasi TypeScript ke folder `dist`)*.
* **Start Command**:
  ```bash
  npm run start
  ```
  *(Perintah ini menjalankan server yang sudah dikompilasi menggunakan `node dist/main/server.js`)*.

---

## 🚀 Langkah 3: Membuat Web Service di Render

1. Masuk ke dashboard [Render](https://dashboard.render.com/).
2. Klik tombol **New +** di kanan atas dan pilih **Web Service**.
3. Pilih **Build and deploy from a Git repository** lalu klik **Next**.
4. Hubungkan repositori GitHub Anda dan pilih repositori `spp-backend` lalu klik **Connect**.
5. Di halaman konfigurasi Web Service:
   * **Name**: Beri nama aplikasi Anda (misal: `spp-backend`).
   * **Region**: Pilih regional terdekat dengan pengguna Anda (disarankan **Singapore** untuk akses tercepat dari Indonesia).
   * **Branch**: Pilih branch utama Anda (biasanya `main` atau `master`).
   * **Runtime**: Pilih **Node**.
   * **Build Command**: `npm install --include=dev && npx prisma generate && npm run build`
   * **Start Command**: `npm run start`
6. Scroll ke bawah dan pilih **Free Instance Type** (atau plan berbayar sesuai kebutuhan Anda).
7. Klik tombol **Advanced** untuk menambahkan Environment Variables:
   * **`DATABASE_URL`**: Masukkan *Connection String* Supabase Anda (dari Langkah 1).
   * **`JWT_SECRET`**: Masukkan kunci rahasia acak yang aman untuk token JWT.
   * **`NODE_ENV`**: `production`
8. Klik **Create Web Service**.
9. Render akan mulai menarik kode dari GitHub, menginstal library, mengompilasi kode, dan menjalankan server.

---

## 🗄️ Langkah 4: Menjalankan Migrasi Database di Supabase

Untuk memastikan seluruh struktur tabel database Anda terbuat dengan benar di Supabase, Anda perlu menjalankan migrasi database:

### Opsi A: Migrasi Otomatis dari Render (Sangat Direkomendasikan)
Anda dapat memicu jalannya migrasi database setiap kali Render melakukan deployment secara otomatis.
Ubah kolom **Build Command** di setting Render menjadi:
```bash
npm install --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build
```
Dengan cara ini, Render akan secara otomatis menjalankan `npx prisma migrate deploy` sebelum mengompilasi kode. Jika migrasi gagal, deployment akan dibatalkan, menjaga aplikasi Anda tetap aman.

### Opsi B: Migrasi Manual dari Komputer Lokal
1. Buat berkas `.env` di dalam folder `spp-backend` di komputer lokal Anda (jika belum ada).
2. Isi `DATABASE_URL` dengan connection string database Supabase Anda.
3. Jalankan perintah migrasi via terminal lokal:
   ```bash
   npx prisma migrate deploy
   ```
4. Jalankan seeding jika diperlukan untuk mengisi data awal:
   ```bash
   npx prisma db seed
   ```

---

## 🧪 Langkah 5: Uji Coba Deployment

Setelah status Web Service Anda di Render berubah menjadi **Live** (berwarna hijau), Render akan memberikan URL publik seperti `https://spp-backend.onrender.com`.

Uji rute API Anda menggunakan Postman, Insomnia, atau browser:
* **Uji Endpoint**:
  ```text
  GET https://spp-backend.onrender.com/api/categories
  ```
  Jika routing berhasil, Anda akan menerima respon JSON atau status `401 Unauthorized` (jika rute tersebut terproteksi token), bukan error `502 Bad Gateway` atau `404 Not Found`.

---

## ⚠️ Catatan Penting untuk Layanan Free Tier Render

Jika Anda menggunakan paket **Free** di Render:
* **Spin Down (Tidur Otomatis)**: Jika aplikasi tidak menerima traffic selama 15 menit, Render akan menonaktifkan (*spin down*) server secara otomatis. Saat ada request masuk berikutnya, server membutuhkan waktu sekitar **30 - 50 detik** untuk aktif kembali (*cold start*).
* **Batas Jam Bulanan**: Layanan free tier memiliki batas penggunaan bulanan. Untuk aplikasi produksi skala penuh, disarankan meng-upgrade ke paket **Starter** ($7/bulan) agar server aktif terus tanpa ada waktu tidur.
