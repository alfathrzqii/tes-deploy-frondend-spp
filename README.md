# Frontend Sistem Pembayaran SPP (Al-Uswah)

Frontend aplikasi manajemen dan pembayaran SPP Al-Uswah berbasis Single Page Application (SPA).

---

## 🛠️ Tech Stack

- **Framework / Bundler:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language:** TypeScript
- **Routing:** [React Router DOM v6](https://reactrouter.com/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **HTTP Client:** [Axios](https://axios-http.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Utility:** [SheetJS (xlsx)](https://sheetjs.com/) untuk export Excel

---

## 🚀 Memulai (Getting Started)

### 1. Prasyarat
- Node.js (disarankan v18+ atau v20+)
- npm, pnpm, atau yarn

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variable
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Sesuaikan URL backend pada file `.env`:
```env
# URL API Backend SPP (Local atau Production/Render)
VITE_API_URL="http://localhost:3003/api"
```

### 4. Menjalankan Server Development
```bash
npm run dev
```

Aplikasi akan berjalan di:
👉 **[http://localhost:3001](http://localhost:3001)**

*(Vite dikonfigurasi melakukan proxy request `/api` ke backend lokal di port `3003`)*.

---

## 📜 Skrip yang Tersedia

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan Vite dev server di port 3001 |
| `npm run build` | Menjalankan type-check (`tsc`) dan build production ke folder `dist` |
| `npm run preview` | Menjalankan preview dari hasil build lokal |
| `npm run lint` | Menjalankan linter ESLint |

---

## 📁 Struktur Direktori

```text
spp-frontend/
├── public/                 # Aset statis
├── src/
│   ├── app/                # Komponen halaman & layout
│   │   ├── (dashboard)/    # Halaman dashboard (terlindungi)
│   │   │   ├── layout.tsx  # Layout sidebar & header dashboard
│   │   │   ├── dashboard/  # Statistik utama
│   │   │   ├── students/   # Data siswa
│   │   │   ├── payments/   # Entri pembayaran SPP
│   │   │   ├── invoices/   # Tagihan SPP
│   │   │   ├── unpaid/     # Daftar tunggakan
│   │   │   ├── class-recap/# Rekapitulasi per kelas
│   │   │   ├── spp-tariffs/# Tarif SPP
│   │   │   ├── categories/ # Kategori tarif
│   │   │   ├── transactions/# Riwayat transaksi
│   │   │   ├── users/      # Manajemen akun user
│   │   │   └── activity-logs/# Log aktivitas
│   │   ├── login/          # Halaman login
│   │   └── cek-tagihan/    # Halaman cek tagihan publik
│   ├── components/         # Komponen reusable (RouteGuard, ThemeToggle, dll)
│   ├── lib/                # Konfigurasi axios (api.ts), helper & constants
│   ├── store/              # Zustand store (useAuthStore.ts)
│   ├── App.tsx             # Konfigurasi Router (React Router DOM)
│   └── main.tsx            # Entry point aplikasi
├── vite.config.ts          # Konfigurasi Vite & API Proxy
└── vercel.json             # Konfigurasi routing rewrite untuk deployment Vercel
```

---

## 🌐 Deployment (Vercel)

Aplikasi telah dikonfigurasi untuk deployment SPA di Vercel menggunakan file [`vercel.json`](./vercel.json) agar client-side routing (React Router) berjalan normal:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
Untuk build command di Vercel:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** Tambahkan `VITE_API_URL` sesuai alamat backend produksi Anda.
