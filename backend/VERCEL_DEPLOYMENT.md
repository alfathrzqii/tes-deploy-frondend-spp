# Panduan Lengkap Deploy Backend SPP ke Vercel

Dokumen ini berisi panduan langkah-demi-langkah untuk mendeploy backend aplikasi SPP (Express.js + TypeScript + Prisma + PostgreSQL) ke platform **Vercel** sebagai *Serverless Functions*.

---

## 📋 Prasyarat (Prerequisites)

Sebelum memulai, pastikan Anda memiliki:
1. **Akun GitHub** dan repositori proyek ini sudah di-push ke GitHub.
2. **Akun Vercel** yang terhubung dengan akun GitHub Anda.
3. **Database PostgreSQL Cloud**. Karena Vercel menggunakan arsitektur *Serverless* (ephemeral/sementara), Anda **tidak bisa** menggunakan database lokal (`localhost`). Anda wajib menggunakan database PostgreSQL cloud. Karena Anda menggunakan **Supabase**, perhatikan hal penting berikut:
   * **Gunakan Connection Pooling (Transaction Mode)**: Supabase menyediakan dua port koneksi. Gunakan URL koneksi port **`6543`** (Transaction Mode) sebagai `DATABASE_URL` di Vercel. Jangan gunakan port `5432` langsung agar koneksi database tidak cepat penuh akibat arsitektur serverless Vercel yang menskala dinamis.
   * Alternatif lain jika membuat database baru: [Neon.tech](https://neon.tech/) (Gratis & terintegrasi dengan baik).

---

## 🛠️ Langkah 1: Memahami Konfigurasi yang Telah Disiapkan

Kami telah menambahkan beberapa file konfigurasi penting di dalam repositori agar Vercel dapat menjalankan aplikasi Express Anda secara serverless:

1. **`vercel.json`** (di root proyek):
   Mengatur agar semua *request* (rute API) diarahkan ke serverless entrypoint (`api/index.ts`).
2. **`api/index.ts`** (di root proyek):
   Merupakan file *entrypoint* serverless untuk Vercel yang mengimpor dan mengekspor instance Express `app` dari `src/main/app.ts`.
3. **`package.json`**:
   Menambahkan `"postinstall": "prisma generate"`. Ini memastikan Vercel membuat file Prisma Client yang sesuai dengan lingkungan cloud Vercel setiap kali melakukan install dependencies.
4. **`tsconfig.json`**:
   Mengecualikan folder `api/` dari kompilasi lokal `tsc` agar proses build lokal tidak terganggu dengan file di luar folder `src/`.

---

## 💾 Langkah 2: Menyiapkan Database PostgreSQL di Cloud

1. Daftar/Masuk ke layanan penyedia database (contoh: **Neon.tech**).
2. Buat project baru dan pilih database **PostgreSQL**.
3. Salin **Connection String** yang diberikan. Formatnya akan terlihat seperti ini:
   ```text
   postgresql://username:password@ep-cool-shadow-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Simpan Connection String ini karena akan digunakan sebagai `DATABASE_URL` di Vercel dan lokal.

---

## 📤 Langkah 3: Push Perubahan ke GitHub

Terapkan perubahan konfigurasi yang telah dibuat ke repositori GitHub Anda:

```bash
# Buka terminal di dalam folder spp-backend
git add .
git commit -m "chore: configure project for vercel deployment"
git push origin main
```
*(Sesuaikan nama branch jika Anda tidak menggunakan `main`)*.

---

## 🚀 Langkah 4: Hubungkan & Deploy ke Vercel

1. Buka dashboard [Vercel](https://vercel.com/dashboard).
2. Klik tombol **Add New...** -> **Project**.
3. Pilih repositori GitHub `spp-backend` Anda lalu klik **Import**.
4. Di bagian **Configure Project**:
   - **Framework Preset**: Biarkan **Other**.
   - **Root Directory**: Jika repositori Anda memiliki subfolder (seperti `spp-backend`), pastikan root directory diarahkan ke `spp-backend`. Jika tidak, biarkan default (`./`).
5. **Environment Variables**:
   Buka bagian ini dan tambahkan variabel berikut:
   * **`DATABASE_URL`**: Paste *connection string* PostgreSQL cloud Anda (dari Langkah 2).
   * **`JWT_SECRET`**: Masukkan string acak yang aman (digunakan untuk mengenkripsi JWT token).
   * **`NODE_ENV`**: `production`
6. Klik **Deploy**.
7. Tunggu beberapa menit hingga proses build selesai. Vercel akan memberikan URL publik untuk aplikasi Anda (contoh: `https://spp-backend.vercel.app`).

---

## 🗄️ Langkah 5: Menjalankan Migrasi Database (Database Migration)

Karena database PostgreSQL cloud Anda masih kosong, Anda harus menjalankan skema tabel (migration) agar database memiliki tabel-tabel yang dibutuhkan oleh backend.

### Opsi A: Migrasi dari Komputer Lokal (Paling Mudah & Direkomendasikan)
Anda dapat menjalankan migrasi langsung dari terminal komputer lokal Anda dengan mengarahkan koneksinya ke database cloud:

1. Di komputer lokal Anda, buat file `.env` di dalam folder `spp-backend` (jika belum ada).
2. Masukkan URL database cloud Anda ke dalamnya:
   ```env
   DATABASE_URL="postgresql://username:password@ep-cool-shadow-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   JWT_SECRET="rahasia_super_aman"
   ```
3. Jalankan perintah migrasi Prisma berikut:
   ```bash
   npx prisma migrate deploy
   ```
   *Perintah ini akan menjalankan seluruh file migrasi SQL yang ada di folder `prisma/migrations` ke database cloud Anda.*
4. *(Opsional)* Jika Anda ingin mengisi data awal (seperti akun admin default), jalankan perintah seed:
   ```bash
   npx prisma db seed
   ```

### Opsi B: Migrasi Otomatis saat Build di Vercel
Jika Anda ingin migrasi berjalan otomatis setiap kali melakukan push kode ke GitHub, Anda bisa mengubah script build di `package.json` Anda menjadi:
```json
"build": "prisma generate && prisma migrate deploy && tsc"
```
*Catatan: Metode ini mengharuskan database cloud Anda mengizinkan koneksi dari IP address Vercel Build Server (biasanya harus bersifat publik).*

---

## 🧪 Langkah 6: Uji Coba Deployment

Setelah deploy selesai dan migrasi sukses dijalankan, Anda bisa mencoba mengakses endpoint backend Anda.
Misalnya, akses rute autentikasi atau rute publik menggunakan **Postman**, **Insomnia**, atau langsung lewat browser:

* **Contoh Cek Endpoint**:
  ```text
  GET https://spp-backend.vercel.app/api/categories
  ```
  *(Seharusnya merespons dengan status `200 OK` atau `401 Unauthorized` jika rute tersebut terproteksi, bukan `404 Not Found` atau `500 Server Error`)*.

---

## ⚠️ Catatan Penting untuk Serverless di Vercel

* **Cold Starts**: Pertama kali API diakses setelah beberapa waktu tidak aktif, mungkin akan ada sedikit delay (1-2 detik) karena Vercel perlu menghidupkan fungsi serverless-nya kembali.
* **Serverless Timeout**: Secara default, fungsi serverless Vercel memiliki limit waktu eksekusi (10-15 detik untuk akun Free). Pastikan query database Anda dioptimalkan dengan baik.
* **Connection Pooling**: Karena sifat serverless yang dapat menskala secara dinamis (membuat banyak instance fungsi sekaligus), disarankan untuk menggunakan **Connection Pooler** (seperti fitur pooling di Neon atau Supabase dengan port `6543` / PgBouncer) jika aplikasi Anda menerima banyak traffic untuk mencegah error `Too many connections` pada PostgreSQL.
