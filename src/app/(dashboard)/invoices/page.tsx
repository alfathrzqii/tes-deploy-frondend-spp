"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  Check,
  Printer
} from "lucide-react";

interface Invoice {
  id: number;
  studentId: number;
  invoiceType: "SPP" | "UANG_PENGEMBANGAN" | "EKSTRAKURIKULER" | "KEGIATAN" | "LAINNYA";
  month: number;
  year: number;
  baseAmount: number;
  discountApplied: number;
  amount: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "VOID";
  student: {
    studentNumber: string;
    name: string;
    className: string;
    schoolUnitId: number;
    parent: {
      name: string;
    };
  };
  transactions: {
    id: number;
    date: string;
    paymentMethod: string;
    amount: number;
    description: string;
    recordedById: number | null;
  }[];
}

const MONTHS = [
  { value: 1, name: "Januari" },
  { value: 2, name: "Februari" },
  { value: 3, name: "Maret" },
  { value: 4, name: "April" },
  { value: 5, name: "Mei" },
  { value: 6, name: "Juni" },
  { value: 7, name: "Juli" },
  { value: 8, name: "Agustus" },
  { value: 9, name: "September" },
  { value: 10, name: "Oktober" },
  { value: 11, name: "November" },
  { value: 12, name: "Desember" },
];

const SCHOOL_UNITS = [
  { id: 1, name: "KB" },
  { id: 2, name: "RA" },
  { id: 3, name: "SD" },
  { id: 4, name: "TPA" },
];

export default function InvoicesPage() {
  const { user } = useAuthStore();
  const isUnitAdmin = user?.role === "UNIT_ADMIN";

  // Data States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [schoolUnitId, setSchoolUnitId] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        limit,
        year: year ? parseInt(year) : undefined,
      };

      if (search) params.search = search;
      if (status) params.status = status;
      if (month) params.month = parseInt(month);

      if (isUnitAdmin) {
        params.schoolUnitId = user.schoolUnitId;
      } else if (schoolUnitId) {
        params.schoolUnitId = parseInt(schoolUnitId);
      }

      const response = await api.get("/invoices", { params });
      setInvoices(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalItems(response.data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil data tagihan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, status, schoolUnitId, month, year]);

  useEffect(() => {
    fetchInvoices();
  }, [page, search, status, schoolUnitId, month, year]);

  const handleUpdateStatus = async (id: number, targetStatus: "PAID" | "PENDING") => {
    const actionText = targetStatus === "PAID" ? "melunasi" : "membatalkan pelunasan";
    if (!confirm(`Apakah Anda yakin ingin ${actionText} tagihan ini?`)) return;

    setError(null);
    setSuccessMsg(null);
    try {
      await api.put(`/invoices/${id}/status`, { status: targetStatus });
      setSuccessMsg(`Status tagihan berhasil diubah menjadi ${targetStatus === "PAID" ? "Lunas" : "Belum Lunas"}`);
      fetchInvoices();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal memperbarui status tagihan");
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tagihan ini beserta semua transaksi kas terkait secara permanen?")) return;

    setError(null);
    setSuccessMsg(null);
    try {
      await api.delete(`/invoices/${id}`);
      setSuccessMsg("Tagihan berhasil dihapus dari database");
      fetchInvoices();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus tagihan");
    }
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getUnitName = (unitId: number) => {
    return SCHOOL_UNITS.find((u) => u.id === unitId)?.name || `Unit ${unitId}`;
  };

  const handlePrintReceipt = (inv: Invoice) => {
    const tx = inv.transactions && inv.transactions.length > 0 ? inv.transactions[0] : null;
    const rawMethod = tx ? tx.paymentMethod : "CASH";
    const displayMethod = rawMethod.toUpperCase() === "MIDTRANS" ? "QRIS" : rawMethod;
    const dateStr = tx ? new Date(tx.date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " WIB" : "-";

    const amountText = formatRupiah(inv.amount);

    const terbilang = (num: number): string => {
      const ones = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
      if (num < 12) return ones[num];
      if (num < 20) return terbilang(num - 10) + " Belas";
      if (num < 100) return ones[Math.floor(num / 10)] + " Puluh " + terbilang(num % 10);
      if (num < 200) return "Seratus " + terbilang(num - 100);
      if (num < 1000) return ones[Math.floor(num / 100)] + " Ratus " + terbilang(num % 100);
      if (num < 2000) return "Seribu " + terbilang(num - 1000);
      if (num < 1000000) return terbilang(Math.floor(num / 1000)) + " Ribu " + terbilang(num % 1000);
      if (num < 1000000000) return terbilang(Math.floor(num / 1000000)) + " Juta " + terbilang(num % 1000000);
      return "";
    };

    const terbilangStr = terbilang(inv.amount) ? terbilang(inv.amount) + " Rupiah" : "Nol Rupiah";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Kwitansi Pembayaran SIKUAT - ${inv.student.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;600;850&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background: #fff;
            }
            .receipt-border {
              border: 2px solid #0f172a;
              padding: 30px;
              max-width: 750px;
              margin: 0 auto;
              position: relative;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
              background-color: #fff;
              background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><text fill='%23e2e8f0' font-size='13' font-family='sans-serif' font-weight='900' x='75' y='75' transform='rotate(-30 75 75)' text-anchor='middle'>SIKUAT</text></svg>");
              background-repeat: repeat;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .school-title {
              font-size: 18px;
              font-weight: 850;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
            }
            .school-sub {
              font-size: 11px;
              color: #64748b;
              margin-top: 4px;
            }
            .receipt-title {
              font-size: 20px;
              font-weight: 850;
              text-align: center;
              letter-spacing: 1px;
              margin-bottom: 30px;
              text-transform: uppercase;
              color: #1e3a8a;
            }
            .row-data {
              display: flex;
              margin-bottom: 18px;
              font-size: 13px;
              line-height: 1.6;
            }
            .label {
              width: 180px;
              font-weight: 600;
              color: #475569;
            }
            .value {
              flex: 1;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 2px;
              color: #0f172a;
            }
            .terbilang-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 12px 15px;
              border-radius: 8px;
              font-style: italic;
              font-weight: 600;
              color: #0f172a;
              margin: 25px 0;
              font-size: 12px;
            }
            .footer-receipt {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
            }
            .signature {
              text-align: center;
              width: 220px;
            }
            .signature-space {
              height: 60px;
            }
            .signature-name {
              font-weight: 700;
              border-top: 1px solid #94a3b8;
              padding-top: 6px;
              font-size: 12px;
              color: #0f172a;
            }
            .badge-method {
              display: inline-block;
              background: #e0f2fe;
              color: #0369a1;
              border: 1px solid #bae6fd;
              padding: 3px 8px;
              font-weight: 700;
              font-size: 10px;
              border-radius: 4px;
              text-transform: uppercase;
            }
            .stamp {
              position: absolute;
              bottom: 150px;
              left: 55%;
              transform: translateX(-50%) rotate(-7deg);
              border: 3px solid #10b981;
              color: #10b981;
              font-size: 13px;
              font-weight: 900;
              padding: 8px 16px;
              text-transform: uppercase;
              border-radius: 8px;
              letter-spacing: 2px;
              opacity: 0.8;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-border">
            <div class="stamp">LUNAS / PAID</div>
            <div class="header">
              <div>
                <div class="school-title">Yayasan Al Uswah Terpadu</div>
                <div class="school-sub">Sistem Informasi Keuangan Terpadu (SIKUAT)</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">No. Kwitansi: KW-${inv.id}-${inv.student.studentNumber}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Tanggal: ${dateStr.split(" pukul ")[0]}</div>
              </div>
            </div>
            
            <div class="receipt-title">Kwitansi Pembayaran SPP</div>

            <div class="row-data">
              <div class="label">Telah Diterima Dari</div>
              <div class="value" style="font-weight: 700;">${inv.student.name} (NIS: ${inv.student.studentNumber})</div>
            </div>

            <div class="row-data">
              <div class="label">Kelas / Unit</div>
              <div class="value">Kelas ${inv.student.className} / Unit ${SCHOOL_UNITS.find(u => u.id === inv.student.schoolUnitId)?.name || 'SD'}</div>
            </div>

            <div class="row-data">
              <div class="label">Untuk Pembayaran</div>
              <div class="value" style="font-weight: 600;">
                ${inv.invoiceType === "SPP" ? `SPP Bulanan - Bulan ${MONTHS.find(m => m.value === inv.month)?.name} ${inv.year}` : `Uang Pengembangan - Tahun ${inv.year}`}
              </div>
            </div>

            <div class="row-data">
              <div class="label">Metode Pembayaran</div>
              <div class="value">
                <span class="badge-method">${displayMethod}</span>
                ${tx && tx.description ? `<span style="margin-left: 10px; font-size: 11px; color: #64748b;">(${tx.description})</span>` : ""}
              </div>
            </div>

            <div class="row-data">
              <div class="label">Jumlah Uang</div>
              <div class="value" style="font-size: 15px; font-weight: 800; color: #1e3a8a;">${amountText}</div>
            </div>

            <div class="terbilang-box">
              Terbilang: ${terbilangStr}
            </div>

            <div class="footer-receipt">
              <div class="signature">
                <div style="font-size: 11px; color: #64748b; margin-bottom: 40px;">Wali Murid / Pembayar</div>
                <div class="signature-space"></div>
                <div class="signature-name">${inv.student.parent.name}</div>
              </div>
              
              <div class="signature">
                <div style="font-size: 11px; color: #64748b; margin-bottom: 40px;">Petugas Administrasi</div>
                <div class="signature-space"></div>
                <div class="signature-name">${tx && tx.recordedById ? "Admin SIKUAT" : "Sistem Online SIKUAT"}</div>
              </div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" />
            Daftar Tagihan & Invoice Siswa
          </h1>
          <p className="text-slate-400 mt-1">
            Lihat, filter, dan kelola seluruh status pembayaran SPP/Uang Pengembangan siswa secara keseluruhan.
          </p>
        </div>
        <button
          onClick={fetchInvoices}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-semibold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Card */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-md">
        <div className="flex items-center gap-2 text-slate-400 font-semibold border-b border-slate-800 pb-2.5">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span className="text-white">Filter Invoice</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Search bar */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-400 block">Cari Siswa</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-650" />
              <input
                type="text"
                placeholder="Nama / NIS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500 placeholder:text-slate-700"
              />
            </div>
          </div>

          {/* Unit selection */}
          {!isUnitAdmin && (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-400 block">Unit Sekolah</label>
              <select
                value={schoolUnitId}
                onChange={(e) => setSchoolUnitId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="">Semua Unit</option>
                {SCHOOL_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-400 block">Bulan</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="">Semua Bulan</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year field */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-400 block">Tahun Kalender</label>
            <input
              type="number"
              min="2000"
              max="9999"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-400 block">Status Bayar</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="">Semua Status</option>
              <option value="PAID">Lunas</option>
              <option value="PENDING">Belum Lunas</option>
            </select>
          </div>
        </div>

        {/* Clear filter indicator */}
        {(search || status || schoolUnitId || month || year !== String(new Date().getFullYear())) && (
          <button
            onClick={() => {
              setSearch("");
              setStatus("");
              setSchoolUnitId("");
              setMonth("");
              setYear(String(new Date().getFullYear()));
            }}
            className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Invoice List Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 animate-pulse">
              Memuat data tagihan...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Tidak ada data invoice tagihan yang terdaftar.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="px-6 py-4">Siswa / NIS</th>
                  <th className="px-6 py-4">Kelas & Unit</th>
                  <th className="px-6 py-4">Jenis Tagihan</th>
                  <th className="px-6 py-4">Periode</th>
                  <th className="px-6 py-4 text-right">Nominal Tagihan</th>
                  <th className="px-6 py-4 text-center">Bayar Via</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Aksi Administrasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-350">
                {invoices.map((inv) => {
                  const isPaid = inv.status === "PAID";
                  const rawMethod = inv.transactions && inv.transactions.length > 0
                    ? inv.transactions[0].paymentMethod
                    : "-";
                  const methodUsed = rawMethod.toUpperCase() === "MIDTRANS" ? "QRIS" : rawMethod;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs">{inv.student.name}</span>
                          <span className="font-mono text-[10px] text-slate-500 mt-0.5">{inv.student.studentNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-300">Kelas {inv.student.className}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Unit {getUnitName(inv.student.schoolUnitId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          inv.invoiceType === "SPP"
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {inv.invoiceType === "SPP" ? "SPP Bulanan" : "Uang Pengembangan"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {inv.invoiceType === "SPP"
                          ? `${MONTHS.find((m) => m.value === inv.month)?.name} ${inv.year}`
                          : `Tahun ${inv.year}`}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-200">
                        {formatRupiah(inv.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isPaid ? (
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                            {methodUsed}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {isPaid ? "Lunas" : "Belum Lunas"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {!isPaid ? (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, "PAID")}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer flex items-center gap-1"
                              title="Tandai tagihan sebagai lunas"
                            >
                              <Check className="w-3 h-3" /> Set Lunas
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handlePrintReceipt(inv)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer flex items-center gap-1"
                                title="Cetak kwitansi pembayaran"
                              >
                                <Printer className="w-3 h-3" /> Kwitansi
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(inv.id, "PENDING")}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer flex items-center gap-1"
                                title="Kembalikan status tagihan menjadi belum lunas"
                              >
                                <XCircle className="w-3 h-3" /> Set Belum Lunas
                              </button>
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer flex items-center gap-1"
                                title="Hapus tagihan dan log transaksi secara permanen"
                              >
                                <Trash2 className="w-3 h-3" /> Hapus
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-950/30 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">
              Total {totalItems} tagihan • Halaman {page} dari {totalPages}
            </span>
            <div className="inline-flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
