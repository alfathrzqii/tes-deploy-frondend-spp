# SPP-Frontend - Project Guidelines

Dokumen ini adalah panduan resmi arsitektur, standar penulisan kode, alur kerja, dan deployment untuk developer serta AI coding assistants (Antigravity, Codex, Copilot, dsb.) di repository **SPP Frontend**.

Setiap kontributor atau AI agent yang memodifikasi, merefaktor, atau menambahkan fitur baru di repository ini **WAJIB** membaca dan mematuhi seluruh aturan di dokumen ini tanpa terkecuali.

---

## 1. Project Overview, Tech Stack & Deployment

### A. Tentang Proyek

**SPP-Frontend** adalah antarmuka web (Single Page Application) sistem manajemen keuangan dan pembayaran SPP sekolah Al-Uswah (KB, RA, SD). Frontend ini menyediakan antarmuka bagi berbagai peran (Super Admin, Unit Admin, Wali Kelas, dan Orang Tua/Wali Siswa) untuk mengelola data siswa, tarif SPP, tagihan bulanan/tahunan, transaksi pembayaran, rekapitulasi kelas, serta log aktivitas.

### B. Tech Stack Utama

- **Runtime & Bundler:** Node.js & [Vite 5](https://vitejs.dev/).
- **Library Inti:** [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/) (Strict Mode).
- **Routing:** [React Router DOM v6](https://reactrouter.com/) (Client-side Routing).
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & PostCSS.
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) (Auth Store & Session).
- **HTTP Client:** [Axios](https://axios-http.com/) (dengan credentials & response interceptor).
- **Icons & UI Utilities:** [Lucide React](https://lucide.dev/) & [SheetJS (xlsx)](https://sheetjs.com/).

### C. Lingkungan Eksekusi & Target Deployment

1. **Status Saat Ini (Fase Transisi): Vercel**
   - Frontend saat ini di-deploy di platform **Vercel**.
   - Routing dikonfigurasi melalui [`vercel.json`](./vercel.json) dengan aturan *rewrite* semua path ke `/index.html` agar SPA routing berjalan normal.
2. **Target Mendatang: Virtual Private Server (VPS)**
   - Dalam waktu dekat, deployment frontend akan **dipindahkan sepenuhnya ke VPS** bersama dengan backend.
   - Hasil build statis dihasilkan via `npm run build` ke folder `dist/`.
   - Di VPS, folder `dist/` akan disajikan oleh web server performa tinggi seperti **Nginx** (atau Caddy), dengan fallback `try_files $uri $uri/ /index.html;`.
   - **Mandat Agent:** Seluruh kode harus *production-ready*, bebas dari URL hardcoded (`localhost` atau link pihak ketiga tertentu), dan hanya mengandalkan environment variable `VITE_API_URL` atau relative path `/api` yang diproxy oleh web server.

---

## 2. Arsitektur Frontend & Struktur Direktori

Meskipun struktur folder halaman berada di dalam `src/app/`, **proyek ini BUKAN Next.js**, melainkan **SPA berbasis React 19 + Vite** dengan router terpusat di `src/App.tsx`.

### Struktur Folder `src/`:

```text
src/
├── app/                        # Komponen Halaman & Layout Dashboard
│   ├── (dashboard)/            # Route dashboard terlindungi (Protected Routes)
│   │   ├── layout.tsx          # Layout wrapper: Sidebar, Header, Breadcrumbs
│   │   ├── dashboard/          # Halaman ringkasan statistik
│   │   ├── students/           # Manajemen data siswa
│   │   ├── payments/           # Entri & riwayat pembayaran SPP
│   │   ├── invoices/           # Daftar & generate tagihan
│   │   ├── unpaid/             # Rekap tunggakan siswa
│   │   ├── class-recap/        # Rekapitulasi pembayaran per kelas
│   │   ├── spp-tariffs/        # Konfigurasi nominal tarif SPP
│   │   ├── categories/         # Kategori pos pembayaran
│   │   ├── transactions/       # Log transaksi keuangan
│   │   ├── users/              # Manajemen akun pengguna & hak akses
│   │   └── activity-logs/      # Audit trail & log aktivitas user
│   ├── login/                  # Halaman Login
│   ├── cek-tagihan/            # Halaman publik pengecekan tagihan siswa
│   ├── globals.css             # Konfigurasi Tailwind v4 & global theme styles
│   └── favicon.ico             # Aset icon
│
├── components/                 # Komponen Reusable Global
│   ├── RouteGuard.tsx          # Proteksi autentikasi & autorisasi role
│   └── ThemeToggle.tsx         # Toggle dark / light mode
│
├── lib/                        # Helper, Konfigurasi & Library Utilitas
│   ├── api.ts                  # Axios client terpusat (withCredentials: true)
│   ├── classConstants.ts       # Konstanta jenjang, kelas, dan unit sekolah
│   └── receiptPrinter.ts       # Generator cetak struk/kuitansi pembayaran
│
├── store/                      # Global State Management (Zustand)
│   └── useAuthStore.ts         # State sesi login, user role, fetchMe, logout
│
├── App.tsx                     # Definisi Seluruh Route (React Router DOM)
├── main.tsx                    # Entrypoint React DOM Mounting
└── index.html                  # Root HTML template
```

---

## 3. Aturan & Standar Pengkodean Frontend (Golden Rules)

### A. Larangan Penggunaan Konvensi Next.js
- **DILARANG mengimpor package Next.js** (seperti `next/navigation`, `next/router`, `next/link`, `next/image`, `next/font`, atau server actions).
- Untuk navigasi, **WAJIB** menggunakan `react-router-dom` (`useNavigate`, `useLocation`, `<Link>`, `<Navigate>`).
- Untuk image/aset statis, gunakan tag `<img>` standar atau impor file gambar langsung via modul Vite (`import logo from '@/assets/logo.png'`).

### B. Komunikasi API & Axios Client (`src/lib/api.ts`)
- **DILARANG memanggil `fetch()` atau membuat instance `axios.create()` baru** di dalam komponen halaman.
- **WAJIB** mengimpor dan menggunakan instance `api` dari `@/lib/api`:
  ```typescript
  import { api } from "@/lib/api";

  // BENAR
  const { data } = await api.get("/students");
  ```
- Instance `api` telah dikonfigurasi dengan:
  - `baseURL`: `import.meta.env.VITE_API_URL || "/api"`
  - `withCredentials: true` (mengirimkan HttpOnly cookies sesi JWT otomatis).
- Penanganan error: Selalu bungkus request API dengan `try-catch` yang memadai dan tampilkan feedback user (alert/toast/pesan error ramah).

### C. Autentikasi, Role & Route Guarding
- State autentikasi dikelola oleh **Zustand** di [`src/store/useAuthStore.ts`](./src/store/useAuthStore.ts).
- Rute-rute dashboard dilindungi oleh [`RouteGuard`](./src/components/RouteGuard.tsx):
  - Memverifikasi apakah user sudah login melalui `fetchMe()` ke backend.
  - Memeriksa batasan `allowedRoles` (`SUPER_ADMIN`, `UNIT_ADMIN`, `WALI_KELAS`, `PARENT`).
  - Bila session habis / 401, redirect ke `/login` dengan parameter query `redirect`.

### D. Styling & UI Design System
- Gunakan utility classes dari **Tailwind CSS v4**.
- Pastikan desain antarmuka responsif (mobile & desktop) dan mendukung dark mode melalui kelas `dark:` yang kompatibel dengan [`ThemeToggle.tsx`](./src/components/ThemeToggle.tsx).
- Komponen harus memiliki feedback visual yang jelas: skeleton loading / spinner saat fetch data, dan state kosong (empty state) jika data tabel nihil.

---

## 4. TypeScript, Build & Environment Standards

1. **Path Alias (`@/`)**
   - Selalu gunakan alias `@/` untuk import internal yang mengarah ke `src/`:
     ```typescript
     import { api } from "@/lib/api";             // BENAR
     import { useAuthStore } from "@/store/useAuthStore"; // BENAR
     ```

2. **Environment Variables Vite**
   - Semua environment variable di frontend **WAJIB diawali dengan prefix `VITE_`**:
     ```typescript
     const apiUrl = import.meta.env.VITE_API_URL;
     ```
   - **DILARANG KERAS** memanggil `process.env.*` di kode client.
   - Jangan pernah menuliskan URL backend secara hardcoded di dalam komponen.

3. **Verifikasi Build Wajib**
   - Sebelum tugas dianggap selesai, jalankan build check:
     ```bash
     npm run build
     ```
   - Script ini menjalankan `tsc && vite build`. **Wajib menghasilkan Exit Code 0**.

---

## 5. Strategi Deployment & Migrasi ke VPS

Saat memodifikasi atau menambah fitur, perhatikan kesiapan migrasi dari Vercel ke VPS:

### A. Vercel (Sekarang)
- Konfigurasi rewrite SPA diatur di [`vercel.json`](./vercel.json).
- Build command: `npm run build`, output: `dist`.

### B. VPS Target (Mendatang)
- Di server VPS, build frontend akan disajikan langsung sebagai static files menggunakan **Nginx**.
- Konfigurasi Nginx di VPS yang perlu didukung:
  ```nginx
  server {
      listen 80;
      server_name spp.domainanda.sch.id;
      root /var/www/spp-frontend/dist;
      index index.html;

      # Client-side routing support
      location / {
          try_files $uri $uri/ /index.html;
      }

      # Reverse proxy ke Express backend di port 3003
      location /api/ {
          proxy_pass http://127.0.0.1:3003/api/;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
      }
  }
  ```
- **Kunci Penting:** Kode frontend tidak boleh berasumsi bahwa backend selalu berada di domain terpisah atau Render. Dengan menggunakan `/api` sebagai default fallback di `src/lib/api.ts`, frontend siap bekerja mulus dengan reverse proxy Nginx di VPS.

---

## 6. Git Deployment Workflow

Setiap kali ada perubahan kode yang perlu di-push:

- **Perubahan Frontend (`spp-frontend`)**:
  - Remote: `origin` (`https://github.com/alfathrzqii/tes-deploy-frondend-spp`)
  - Branch: `main`
- **Perubahan Backend (`spp-backend`)**:
  - Remote: `origin` (`https://github.com/alfathrzqii/spp-backend-render.git`)
  - Branch: `main`

---

## 7. Pengelolaan Berkas Sementara & Dokumentasi Lokal (`temp/`)

Jika user meminta dokumentasi, penjelasan, visualisasi data, analisis, atau output dalam bentuk file Markdown (`.md`) / HTML (`.html`):

- **Seluruh berkas tersebut wajib ditulis ke dalam folder `temp/`** (contoh: `temp/penjelasan-arsitektur.md`, `temp/report.html`).
- Folder `temp/` ini juga digunakan untuk segala keperluan pengembangan lokal (scratchpad, log pengujian, dump sementara).
- **Folder `temp/` telah diabaikan oleh Git (`.gitignore`)**, sehingga berkas di dalamnya tidak akan mengotori riwayat commit repository.

---

## 8. Cheat Sheet Cek Kepatuhan (Self-Check Checklist)

Sebelum menyelesaikan task di repositori ini, wajib memeriksa checklist berikut:

- [ ] Apakah `npm run build` sukses (exit code 0 tanpa error TypeScript/Vite)?
- [ ] Apakah ada impor package Next.js (`next/*`) yang tidak sengaja masuk? (Harus **0 hasil**).
- [ ] Apakah seluruh request HTTP menggunakan instance `api` dari `@/lib/api`? (Bebas dari hardcoded URL `http://localhost`).
- [ ] Apakah routing didaftarkan dengan benar di `src/App.tsx`?
- [ ] Apakah halaman dashboard baru sudah terproteksi oleh `RouteGuard` atau berada di dalam `DashboardLayout`?
- [ ] Apakah berkas penjelasan/dokumentasi/log sementara sudah ditempatkan di folder `temp/`?
- [ ] Apakah konfigurasi tetap kompatibel untuk Vercel saat ini dan siap untuk Nginx VPS mendatang?
