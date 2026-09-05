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
  Printer,
  X
} from "lucide-react";

interface Invoice {
  id: number;
  studentId: number;
  invoiceType: "SPP" | "FULLDAY" | "UANG_PENGEMBANGAN" | "UANG_PERALATAN" | "EKSTRAKURIKULER" | "DAFTAR_ULANG" | "SERAGAM" | "KEGIATAN" | "LAINNYA";
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
  const [invoiceType, setInvoiceType] = useState("");

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
      if (invoiceType) params.invoiceType = invoiceType;
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
  }, [search, status, invoiceType, schoolUnitId, month, year]);

  useEffect(() => {
    fetchInvoices();
  }, [page, search, status, invoiceType, schoolUnitId, month, year]);

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

  const getInvoiceTypeName = (type: string) => {
    if (type === "SPP") return "SPP Bulanan";
    if (type === "FULLDAY") return "Biaya Fullday Bulanan";
    if (type === "UANG_PENGEMBANGAN") return "Uang Pengembangan";
    if (type === "UANG_PERALATAN") return "Uang Peralatan";
    if (type === "EKSTRAKURIKULER") return "Uang Ekstrakurikuler";
    if (type === "DAFTAR_ULANG") return "Uang Daftar Ulang";
    if (type === "SERAGAM") return "Uang Seragam";
    return type;
  };

  // Print Selection Modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [modalStudentInvoices, setModalStudentInvoices] = useState<Invoice[]>([]);
  const [modalSelectedKeys, setModalSelectedKeys] = useState<string[]>([]);
  const [modalStudentName, setModalStudentName] = useState("");

  const openPrintModalForInvoice = async (inv: Invoice) => {
    setModalStudentName(inv.student.name);
    try {
      const res = await api.get(`/invoices/student/${inv.student.studentNumber}`);
      const fetchedInvs: Invoice[] = res.data.data || [];
      setModalStudentInvoices(fetchedInvs.length > 0 ? fetchedInvs : [inv]);
      
      const targetKey = `${inv.invoiceType}-${inv.month}-${inv.year}`;
      let keys: string[] = [targetKey];
      for (const item of fetchedInvs) {
        const k = `${item.invoiceType}-${item.month}-${item.year}`;
        if (!keys.includes(k) && keys.length < 4) {
          keys.push(k);
        }
      }
      setModalSelectedKeys(keys);
    } catch {
      setModalStudentInvoices([inv]);
      setModalSelectedKeys([`${inv.invoiceType}-${inv.month}-${inv.year}`]);
    }
    setIsPrintModalOpen(true);
  };

  const handlePrintReceipt = (inv?: Invoice, customInvoices?: Invoice[]) => {
    const terbilangFunc = (num: number): string => {
      const ones = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
      if (num < 12) return ones[num];
      if (num < 20) return terbilangFunc(num - 10) + " Belas";
      if (num < 100) return ones[Math.floor(num / 10)] + " Puluh " + terbilangFunc(num % 10);
      if (num < 200) return "Seratus " + terbilangFunc(num - 100);
      if (num < 1000) return ones[Math.floor(num / 100)] + " Ratus " + terbilangFunc(num % 100);
      if (num < 2000) return "Seribu " + terbilangFunc(num - 1000);
      if (num < 1000000) return terbilangFunc(Math.floor(num / 1000)) + " Ribu " + terbilangFunc(num % 1000);
      if (num < 1000000000) return terbilangFunc(Math.floor(num / 1000000)) + " Juta " + terbilangFunc(num % 1000000);
      return "";
    };

    let selectedFourInvoices: Invoice[] = [];
    if (customInvoices && customInvoices.length > 0) {
      selectedFourInvoices = customInvoices.slice(0, 4);
    } else if (inv) {
      const sameStudentInvoices = invoices.filter(
        (i) => i.studentId === inv.studentId && i.invoiceType === inv.invoiceType && i.year === inv.year
      );
      const currentMonth = inv.month || 7;
      const idx = sameStudentInvoices.findIndex((i) => i.month === currentMonth);
      if (idx !== -1) {
        const startIdx = Math.max(0, Math.min(idx, sameStudentInvoices.length - 4));
        selectedFourInvoices = sameStudentInvoices.slice(startIdx, startIdx + 4);
      }
      if (selectedFourInvoices.length === 0) {
        selectedFourInvoices = [inv];
      }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const slotsHtml = Array.from({ length: 4 }).map((_, slotIdx) => {
      const itemInv = selectedFourInvoices[slotIdx];
      if (!itemInv) {
        return `
          <div class="receipt-slot empty-slot">
            <div class="empty-slot-text">
              <span>Potongan Kertas A4 (Kosong)</span>
            </div>
          </div>
        `;
      }

      const itemTx = itemInv.transactions && itemInv.transactions.length > 0 ? itemInv.transactions[0] : null;
      const itemAmountText = formatRupiah(itemInv.amount);
      const itemTerbilang = terbilangFunc(itemInv.amount) ? terbilangFunc(itemInv.amount) + " Rupiah" : "Nol Rupiah";
      const itemMethod = itemTx?.paymentMethod ? (itemTx.paymentMethod.toUpperCase() === "MIDTRANS" ? "QRIS" : itemTx.paymentMethod) : "CASH";
      const itemDateStr = itemTx?.date
        ? new Date(itemTx.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "-";

      const periodDesc = itemInv.invoiceType === "SPP" || itemInv.invoiceType === "FULLDAY"
        ? `${getInvoiceTypeName(itemInv.invoiceType)} - Bulan ${MONTHS.find((m) => m.value === itemInv.month)?.name} ${itemInv.year}`
        : `${getInvoiceTypeName(itemInv.invoiceType)} - Tahun ${itemInv.year}`;

      return `
        <div class="receipt-slot">
          <div class="stamp">${itemInv.status === "PAID" ? "LUNAS" : "BELUM LUNAS"}</div>
          <div class="header">
            <div>
              <div class="school-title">Yayasan Al Uswah Terpadu</div>
              <div class="school-sub">SIKUAT Keuangan Sekolah</div>
            </div>
            <div style="text-align: right;">
              <div class="kw-no">KW-${itemInv.id}-${itemInv.student.studentNumber}</div>
              <div class="kw-date">${itemDateStr}</div>
            </div>
          </div>

          <div class="title-banner">KWITANSI PEMBAYARAN</div>

          <div class="row-data">
            <div class="label">Telah Diterima Dari</div>
            <div class="value" style="font-weight: 700;">${itemInv.student.parent?.name || "Wali Siswa"} (Wali ${itemInv.student.name})</div>
          </div>

          <div class="row-data">
            <div class="label">Nama Siswa / NIS</div>
            <div class="value" style="font-weight: 600;">${itemInv.student.name} (NIS: ${itemInv.student.studentNumber})</div>
          </div>

          <div class="row-data">
            <div class="label">Kelas / Unit</div>
            <div class="value">Kelas ${itemInv.student.className} / Unit ${getUnitName(itemInv.student.schoolUnitId)}</div>
          </div>

          <div class="row-data">
            <div class="label">Untuk Pembayaran</div>
            <div class="value" style="font-weight: 600;">${periodDesc}</div>
          </div>

          <div class="row-data">
            <div class="label">Metode Pembayaran</div>
            <div class="value">
              <span class="badge-method">${itemMethod}</span>
            </div>
          </div>

          <div class="row-data">
            <div class="label">Jumlah Uang</div>
            <div class="value" style="font-size: 11px; font-weight: 800; color: #1e3a8a;">${itemAmountText}</div>
          </div>

          <div class="terbilang-box">
            Terbilang: ${itemTerbilang}
          </div>

          <div class="footer-receipt">
            <div class="signature">
              <div class="sig-title">Pembayar</div>
              <div class="sig-name">${itemInv.student.parent?.name || "Wali Murid"}</div>
            </div>
            <div class="signature">
              <div class="sig-title">Petugas Kasir</div>
              <div class="sig-name">${user?.name || "Admin Kasir"}</div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Kwitansi Pembayaran A4 (4-in-1) - ${selectedFourInvoices[0]?.student?.name || modalStudentName || 'Siswa'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;850&display=swap');
            @page {
              size: A4 portrait;
              margin: 3mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              height: 100%;
              margin: 0;
              padding: 0;
              overflow: hidden;
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .a4-grid {
              width: 200mm;
              height: 280mm;
              max-height: 280mm;
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: 1fr 1fr;
              gap: 4mm;
              margin: 0 auto;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            .receipt-slot {
              border: 1px dashed #64748b;
              border-radius: 6px;
              padding: 6px 8px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              background: #ffffff;
              height: 136mm;
              max-height: 136mm;
              overflow: hidden;
            }
            .empty-slot {
              border: 1px dashed #cbd5e1;
              background: #fafafa;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .empty-slot-text {
              font-size: 9px;
              font-weight: 600;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 1.5px solid #cbd5e1;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .school-title {
              font-size: 10px;
              font-weight: 850;
              text-transform: uppercase;
              color: #0f172a;
              line-height: 1.2;
            }
            .school-sub {
              font-size: 7.5px;
              color: #64748b;
              margin-top: 1px;
            }
            .kw-no {
              font-size: 8px;
              font-weight: 700;
              color: #0f172a;
              text-align: right;
            }
            .kw-date {
              font-size: 7.5px;
              color: #64748b;
              text-align: right;
            }
            .title-banner {
              text-align: center;
              font-size: 10px;
              font-weight: 850;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 2px 0 6px 0;
            }
            .row-data {
              display: flex;
              margin-bottom: 4px;
              font-size: 8.5px;
              line-height: 1.3;
            }
            .label {
              width: 95px;
              font-weight: 600;
              color: #475569;
              flex-shrink: 0;
            }
            .value {
              flex: 1;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 1px;
              color: #0f172a;
            }
            .terbilang-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 3px 6px;
              border-radius: 4px;
              font-style: italic;
              font-weight: 600;
              font-size: 7.5px;
              color: #334155;
              margin: 2px 0;
            }
            .badge-method {
              display: inline-block;
              background: #e0f2fe;
              color: #0369a1;
              border: 1px solid #bae6fd;
              padding: 1px 4px;
              font-weight: 700;
              font-size: 7.5px;
              border-radius: 3px;
              text-transform: uppercase;
            }
            .stamp {
              position: absolute;
              bottom: 40px;
              right: 12px;
              transform: rotate(-6deg);
              border: 2px solid #10b981;
              color: #10b981;
              font-size: 8.5px;
              font-weight: 900;
              padding: 2px 6px;
              text-transform: uppercase;
              border-radius: 4px;
              letter-spacing: 1px;
              opacity: 0.85;
            }
            .footer-receipt {
              display: flex;
              justify-content: space-between;
              margin-top: 6px;
              padding-top: 2px;
            }
            .signature {
              text-align: center;
              width: 80px;
            }
            .sig-title {
              font-size: 7.5px;
              color: #64748b;
              margin-bottom: 20px;
            }
            .sig-name {
              font-weight: 700;
              border-top: 1px solid #94a3b8;
              padding-top: 2px;
              font-size: 7.5px;
              color: #0f172a;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="a4-grid">
            ${slotsHtml}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

          {/* Invoice Type selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-400 block">Jenis Tagihan</label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">Semua Jenis</option>
              <option value="SPP">SPP Bulanan</option>
              <option value="UANG_PENGEMBANGAN">Uang Pengembangan</option>
              <option value="EKSTRAKURIKULER">Ekstrakurikuler</option>
              <option value="DAFTAR_ULANG">Daftar Ulang</option>
              <option value="UANG_PERALATAN">Uang Peralatan</option>
              <option value="SERAGAM">Uang Seragam</option>
              <option value="FULLDAY">Fullday</option>
            </select>
          </div>

          {/* Unit selection */}
          {!isUnitAdmin && (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-400 block">Unit Sekolah</label>
              <select
                value={schoolUnitId}
                onChange={(e) => setSchoolUnitId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
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
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
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
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="PAID">Lunas</option>
              <option value="PENDING">Belum Lunas</option>
            </select>
          </div>
        </div>

        {/* Clear filter indicator */}
        {(search || status || invoiceType || schoolUnitId || month || year !== String(new Date().getFullYear())) && (
          <button
            onClick={() => {
              setSearch("");
              setStatus("");
              setInvoiceType("");
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
                                onClick={() => openPrintModalForInvoice(inv)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer flex items-center gap-1"
                                title="Pilih dan cetak kwitansi A4"
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

      {/* Modal Selection Kwitansi A4 */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-400" />
              Pilih Kwitansi untuk Cetak A4 (Maksimal 4)
            </h2>
            <p className="text-xs text-slate-400">
              Centang hingga 4 tagihan/bulan milik <b>{modalStudentName}</b> yang ingin dicetak bersama dalam 1 lembar kertas A4:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-800 p-3 rounded-xl bg-slate-950">
              {modalStudentInvoices.map((inv) => {
                const key = `${inv.invoiceType}-${inv.month}-${inv.year}`;
                const isChecked = modalSelectedKeys.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? "bg-indigo-600/15 border-indigo-500/50 text-indigo-200"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setModalSelectedKeys(modalSelectedKeys.filter((k) => k !== key));
                          } else {
                            if (modalSelectedKeys.length >= 4) {
                              alert("Maksimal 4 kwitansi dalam 1 lembar kertas A4");
                              return;
                            }
                            setModalSelectedKeys([...modalSelectedKeys, key]);
                          }
                        }}
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                      />
                      <div>
                        <p className="font-bold text-white">
                          {getInvoiceTypeName(inv.invoiceType)} - {inv.invoiceType === "SPP" || inv.invoiceType === "FULLDAY" ? `${MONTHS.find(m => m.value === inv.month)?.name} ${inv.year}` : `Tahun ${inv.year}`}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Nominal: {formatRupiah(inv.amount)} | Status: <span className={inv.status === "PAID" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{inv.status === "PAID" ? "LUNAS" : "BELUM LUNAS"}</span>
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs text-indigo-400 font-semibold">
                {modalSelectedKeys.length} / 4 kwitansi terpilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-all text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (modalSelectedKeys.length === 0) {
                      alert("Pilih minimal 1 kwitansi untuk dicetak");
                      return;
                    }
                    const targetInvs = modalStudentInvoices.filter((i) =>
                      modalSelectedKeys.includes(`${i.invoiceType}-${i.month}-${i.year}`)
                    );
                    setIsPrintModalOpen(false);
                    handlePrintReceipt(targetInvs[0], targetInvs);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Cetak Lembar A4 ({modalSelectedKeys.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
