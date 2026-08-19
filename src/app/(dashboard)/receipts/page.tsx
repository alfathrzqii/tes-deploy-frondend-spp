"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  GraduationCap,
  Receipt,
  Layers,
  CheckSquare,
  Square,
  Eye,
  X,
  Sparkles,
  School
} from "lucide-react";

interface Student {
  id: number;
  studentNumber: string;
  name: string;
  className: string;
  schoolUnitId: number;
  enrollmentYear: number;
  discountAmount: number;
  schoolUnit?: {
    name: string;
  };
  parent?: {
    id: number;
    name: string;
    phoneNumber?: string;
    email?: string | null;
  };
}

interface InvoiceTransaction {
  id: number;
  amount: number;
  date: string;
  paymentMethod: string;
  description?: string;
}

interface InvoiceItem {
  id: number | null;
  studentId: number;
  invoiceType: "SPP" | "UANG_PENGEMBANGAN" | "DAFTAR_ULANG" | "UANG_PERALATAN" | "EKSTRAKURIKULER" | "SERAGAM" | "KEGIATAN" | "LAINNYA";
  month: number;
  year: number;
  baseAmount: number;
  discountApplied: number;
  amount: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "VOID";
  transactions?: InvoiceTransaction[];
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

function terbilang(nilai: number): string {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  const count = Math.abs(Math.floor(nilai));

  if (count < 12) return angka[count] || "";
  if (count < 20) return terbilang(count - 10) + " Belas";
  if (count < 100) return (terbilang(Math.floor(count / 10)) + " Puluh " + terbilang(count % 10)).trim();
  if (count < 200) return ("Seratus " + terbilang(count - 100)).trim();
  if (count < 1000) return (terbilang(Math.floor(count / 100)) + " Ratus " + terbilang(count % 100)).trim();
  if (count < 2000) return ("Seribu " + terbilang(count - 1000)).trim();
  if (count < 1000000) return (terbilang(Math.floor(count / 1000)) + " Ribu " + terbilang(count % 1000)).trim();
  if (count < 1000000000) return (terbilang(Math.floor(count / 1000000)) + " Juta " + terbilang(count % 1000000)).trim();
  return count.toString();
}

function formatTerbilang(amount: number): string {
  if (!amount || amount <= 0) return "# Nol Rupiah #";
  const words = terbilang(amount).trim();
  return `# ${words} Rupiah #`;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ReceiptsPage() {
  const { user } = useAuthStore();

  // Search & Student states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Year & Invoices states
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Selection states (Array of invoice unique keys or IDs)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Status message
  const [error, setError] = useState<string | null>(null);

  const getUnitName = (unitId: number) => {
    return SCHOOL_UNITS.find((u) => u.id === unitId)?.name || `Unit ${unitId}`;
  };

  const getInvoiceKey = (inv: InvoiceItem, index: number) => {
    return inv.id ? `id-${inv.id}` : `type-${inv.invoiceType}-${inv.month}-${inv.year}-${index}`;
  };

  const getInvoiceTitle = (inv: InvoiceItem) => {
    if (inv.invoiceType === "SPP") {
      const monthName = MONTHS.find((m) => m.value === inv.month)?.name || `Bulan ${inv.month}`;
      return `SPP Bulanan - ${monthName} ${inv.year}`;
    }
    if (inv.invoiceType === "UANG_PENGEMBANGAN") {
      return `Uang Pengembangan - Tahun ${inv.year}`;
    }
    if (inv.invoiceType === "DAFTAR_ULANG") {
      return `Daftar Ulang - Tahun ${inv.year}`;
    }
    if (inv.invoiceType === "UANG_PERALATAN") {
      return `Uang Peralatan - Tahun ${inv.year}`;
    }
    if (inv.invoiceType === "EKSTRAKURIKULER") {
      return `Ekstrakurikuler - Tahun ${inv.year}`;
    }
    if (inv.invoiceType === "SERAGAM") {
      return `Seragam Sekolah - Tahun ${inv.year}`;
    }
    return `${inv.invoiceType.replace(/_/g, " ")} - Tahun ${inv.year}`;
  };

  // Search student
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setError(null);
    setSearched(true);
    setSelectedStudent(null);
    setInvoices([]);
    setSelectedKeys([]);

    try {
      const response = await api.get(`/students?search=${encodeURIComponent(searchQuery.trim())}`);
      const list: Student[] = response.data.data || [];
      setSearchResults(list);

      if (list.length === 1) {
        // Auto select if only one match
        handleSelectStudent(list[0]);
      } else if (list.length === 0) {
        setError(`Siswa dengan kata kunci "${searchQuery}" tidak ditemukan.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mencari data siswa");
    } finally {
      setSearchLoading(false);
    }
  };

  // Select student and fetch invoices
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setInvoicesLoading(true);
    setError(null);
    setSelectedKeys([]);

    try {
      const response = await api.get(`/invoices/student/${student.studentNumber}?year=${selectedYear}`);
      const invList: InvoiceItem[] = response.data.data || response.data.allInvoices || [];
      
      // Sort invoices: SPP sorted by month, others afterwards
      const sorted = [...invList].sort((a, b) => {
        if (a.invoiceType === "SPP" && b.invoiceType === "SPP") {
          return a.month - b.month;
        }
        if (a.invoiceType === "SPP") return -1;
        if (b.invoiceType === "SPP") return 1;
        return 0;
      });

      setInvoices(sorted);

      // Auto-select all PAID invoices by default
      const paidKeys = sorted
        .filter((inv) => inv.status === "PAID")
        .map((inv, idx) => getInvoiceKey(inv, idx));
      setSelectedKeys(paidKeys);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal memuat data tagihan siswa");
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Re-fetch when selectedYear changes
  useEffect(() => {
    if (selectedStudent) {
      handleSelectStudent(selectedStudent);
    }
  }, [selectedYear]);

  // Toggle selection for a single invoice
  const toggleSelectInvoice = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Select All Paid
  const handleSelectAllPaid = () => {
    const paidKeys = invoices
      .filter((inv) => inv.status === "PAID")
      .map((inv, idx) => getInvoiceKey(inv, idx));
    setSelectedKeys(paidKeys);
  };

  // Select All (including pending if needed)
  const handleSelectAll = () => {
    const allKeys = invoices.map((inv, idx) => getInvoiceKey(inv, idx));
    setSelectedKeys(allKeys);
  };

  // Clear Selection
  const handleClearSelection = () => {
    setSelectedKeys([]);
  };

  // Get selected invoice objects
  const selectedInvoicesList = invoices.filter((inv, idx) =>
    selectedKeys.includes(getInvoiceKey(inv, idx))
  );

  // Total nominal of selected
  const totalSelectedAmount = selectedInvoicesList.reduce((sum, item) => sum + item.amount, 0);

  // Print Action
  const handlePrint = () => {
    if (!selectedStudent || selectedInvoicesList.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const cashierName = user?.name || "Petugas Kasir";
    const parentName = selectedStudent.parent?.name || "Wali Murid";
    const studentName = selectedStudent.name;
    const studentNumber = selectedStudent.studentNumber;
    const unitName = selectedStudent.schoolUnit?.name || getUnitName(selectedStudent.schoolUnitId);
    const className = selectedStudent.className;

    // Generate HTML for each receipt strip (1x4 format)
    const receiptsHtml = selectedInvoicesList
      .map((inv, index) => {
        const tx = inv.transactions && inv.transactions.length > 0 ? inv.transactions[0] : null;
        const dateStr = tx
          ? new Date(tx.date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : new Date().toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

        const rawMethod = tx ? tx.paymentMethod : "CASH";
        const displayMethod = rawMethod.toUpperCase() === "MIDTRANS" ? "QRIS" : rawMethod;
        const receiptNo = `KW-${inv.id || `${inv.month}${inv.year}`}-${studentNumber}`;
        const title = getInvoiceTitle(inv);
        const amountStr = formatRupiah(inv.amount);
        const terbilangStr = formatTerbilang(inv.amount);

        // Every 4 receipts, force a page break
        const isPageBreak = (index + 1) % 4 === 0 && index !== selectedInvoicesList.length - 1;

        return `
          <div class="receipt-strip-container ${isPageBreak ? "page-break" : ""}">
            <div class="receipt-strip">
              <!-- Left Column: Branding, No. Kwitansi & Status -->
              <div class="col-left">
                <div class="brand-box">
                  <div class="brand-title">SIKUAT</div>
                  <div class="brand-sub">YAYASAN AL USWAH TERPADU</div>
                  <div class="brand-tagline">Sistem Informasi Keuangan</div>
                </div>
                
                <div class="no-box">
                  <div class="no-label">No. Kwitansi:</div>
                  <div class="no-val">${receiptNo}</div>
                  <div class="no-date">Tgl: ${dateStr}</div>
                </div>

                <div class="method-tag">
                  VIA: <b>${displayMethod}</b>
                </div>

                <div class="stamp-lunas">
                  <span>LUNAS</span>
                </div>
              </div>

              <!-- Middle Column: Detail Data Pembayaran -->
              <div class="col-mid">
                <div class="header-mid">
                  <span class="kwitansi-title">BUKTI PEMBAYARAN RESMI</span>
                </div>

                <table class="data-table">
                  <tr>
                    <td class="lbl">Telah Terima Dari</td>
                    <td class="sep">:</td>
                    <td class="val"><b>${parentName}</b> / ${studentName}</td>
                  </tr>
                  <tr>
                    <td class="lbl">NIS / Kelas / Unit</td>
                    <td class="sep">:</td>
                    <td class="val">${studentNumber} / Kelas ${className} / Unit ${unitName}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Untuk Pembayaran</td>
                    <td class="sep">:</td>
                    <td class="val val-highlight">${title}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Jumlah Uang</td>
                    <td class="sep">:</td>
                    <td class="val val-amount">${amountStr}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Terbilang</td>
                    <td class="sep">:</td>
                    <td class="val val-terbilang">${terbilangStr}</td>
                  </tr>
                </table>
              </div>

              <!-- Right Column: Tanda Tangan & Stempel -->
              <div class="col-right">
                <div class="ttd-box">
                  <div class="ttd-city">Tuban, ${dateStr}</div>
                  <div class="ttd-columns">
                    <div class="ttd-item">
                      <div class="ttd-role">Penyetor</div>
                      <div class="ttd-space"></div>
                      <div class="ttd-name">(${parentName.split(" ")[0]})</div>
                    </div>
                    <div class="ttd-item">
                      <div class="ttd-role">Kasir / Admin</div>
                      <div class="ttd-space"></div>
                      <div class="ttd-name">(${cashierName.split(" ")[0]})</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dashed cut line divider -->
            <div class="cut-line">
              <span class="cut-icon">✂</span>
              <span class="cut-text">Gunting di sini</span>
            </div>
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Cetak Kwitansi - ${studentName} (${studentNumber})</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }

            body {
              font-family: 'Inter', Arial, sans-serif;
              color: #0f172a;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .receipt-strip-container {
              width: 100%;
              /* Total height per receipt strip approx 67mm to fit exactly 4 in 297mm height */
              height: 67.5mm;
              max-height: 67.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
              break-inside: avoid;
              margin-bottom: 0.5mm;
            }

            .page-break {
              page-break-after: always;
              break-after: page;
            }

            .receipt-strip {
              width: 100%;
              height: 63.5mm;
              border: 1.5px solid #0f172a;
              border-radius: 6px;
              padding: 5px 8px;
              display: flex;
              gap: 8px;
              background: #fff;
              position: relative;
              overflow: hidden;
            }

            /* Watermark */
            .receipt-strip::before {
              content: "SIKUAT";
              position: absolute;
              top: 50%;
              left: 45%;
              transform: translate(-50%, -50%) rotate(-12deg);
              font-size: 42px;
              font-weight: 900;
              color: rgba(15, 23, 42, 0.04);
              letter-spacing: 6px;
              pointer-events: none;
              z-index: 0;
            }

            /* Left Column: Width ~26% */
            .col-left {
              width: 26%;
              border-right: 1px dashed #cbd5e1;
              padding-right: 6px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              z-index: 1;
            }

            .brand-box {
              line-height: 1.1;
            }

            .brand-title {
              font-size: 13px;
              font-weight: 900;
              color: #1e3a8a;
              letter-spacing: 0.5px;
            }

            .brand-sub {
              font-size: 7.5px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              margin-top: 1px;
            }

            .brand-tagline {
              font-size: 6.5px;
              color: #64748b;
            }

            .no-box {
              margin-top: 3px;
              line-height: 1.15;
            }

            .no-label {
              font-size: 7px;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
            }

            .no-val {
              font-size: 8px;
              font-weight: 800;
              font-family: monospace;
              color: #0f172a;
            }

            .no-date {
              font-size: 7px;
              color: #475569;
            }

            .method-tag {
              font-size: 7px;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              padding: 1px 4px;
              border-radius: 3px;
              display: inline-block;
              width: fit-content;
              color: #334155;
            }

            .stamp-lunas {
              border: 1.5px solid #10b981;
              color: #10b981;
              font-size: 9px;
              font-weight: 900;
              letter-spacing: 1.5px;
              text-align: center;
              padding: 1px 4px;
              border-radius: 4px;
              transform: rotate(-4deg);
              width: fit-content;
              align-self: center;
            }

            /* Middle Column: Width ~48% */
            .col-mid {
              width: 48%;
              padding: 0 4px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              z-index: 1;
            }

            .header-mid {
              text-align: center;
              border-bottom: 1px solid #0f172a;
              padding-bottom: 2px;
              margin-bottom: 2px;
            }

            .kwitansi-title {
              font-size: 9.5px;
              font-weight: 900;
              letter-spacing: 0.8px;
              color: #1e3a8a;
              text-transform: uppercase;
            }

            .data-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8px;
              line-height: 1.25;
            }

            .data-table td {
              vertical-align: top;
              padding: 1px 0;
            }

            .data-table .lbl {
              width: 78px;
              color: #475569;
              font-weight: 600;
              font-size: 7.5px;
            }

            .data-table .sep {
              width: 8px;
              color: #64748b;
              text-align: center;
            }

            .data-table .val {
              color: #0f172a;
              font-size: 8px;
            }

            .val-highlight {
              font-weight: 700;
              color: #1e3a8a;
            }

            .val-amount {
              font-size: 10.5px;
              font-weight: 900;
              color: #0f172a;
              font-family: monospace;
            }

            .val-terbilang {
              font-style: italic;
              font-size: 7.5px;
              font-weight: 600;
              color: #334155;
              background: #f8fafc;
              padding: 1px 3px;
              border-radius: 2px;
              border-left: 2px solid #3b82f6;
            }

            /* Right Column: Width ~26% */
            .col-right {
              width: 26%;
              border-left: 1px dashed #cbd5e1;
              padding-left: 6px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              z-index: 1;
            }

            .ttd-box {
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }

            .ttd-city {
              font-size: 7px;
              text-align: center;
              color: #475569;
              font-weight: 600;
            }

            .ttd-columns {
              display: flex;
              justify-content: space-around;
              gap: 4px;
              flex: 1;
              align-items: flex-end;
              padding-bottom: 2px;
            }

            .ttd-item {
              text-align: center;
              flex: 1;
            }

            .ttd-role {
              font-size: 7px;
              color: #64748b;
              font-weight: 600;
            }

            .ttd-space {
              height: 18px;
            }

            .ttd-name {
              font-size: 7.5px;
              font-weight: 700;
              color: #0f172a;
              border-top: 0.5px solid #94a3b8;
              padding-top: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            /* Cut Line */
            .cut-line {
              height: 3.5mm;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              border-bottom: 1px dashed #94a3b8;
              position: relative;
            }

            .cut-icon {
              font-size: 9px;
              color: #64748b;
            }

            .cut-text {
              font-size: 6.5px;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          ${receiptsHtml}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-xs">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            Cetak Kwitansi Pembayaran
          </h1>
          <p className="text-slate-400 mt-1">
            Cari siswa, pilih beberapa pembayaran atau bulan sekaligus, dan cetak dalam format kwitansi strip (1x4 per lembar A4).
          </p>
        </div>
      </div>

      {/* Alert Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Search & Student Info, Right Invoices & Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Search & Selection */}
        <div className="lg:col-span-5 space-y-6">
          {/* Search Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-md">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              1. Cari Siswa
            </h2>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ketik Nama atau NIS siswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {searchLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  "Cari"
                )}
              </button>
            </form>

            {/* Multiple Search Results Picker */}
            {searchResults.length > 1 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400">
                  Ditemukan {searchResults.length} siswa, pilih salah satu:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {searchResults.map((s) => {
                    const isCurrent = selectedStudent?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isCurrent
                            ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                            : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 text-slate-300"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs">{s.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NIS: {s.studentNumber} • Kelas {s.className} • Unit {getUnitName(s.schoolUnitId)}
                          </p>
                        </div>
                        {isCurrent && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected Student Card */}
          {selectedStudent && (
            <div className="bg-slate-900/40 border border-indigo-500/30 p-5 rounded-2xl space-y-4 backdrop-blur-md animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase">
                    Siswa Terpilih
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-1.5">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    NIS: {selectedStudent.studentNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-800 border border-slate-700 text-amber-400 uppercase">
                    Unit {selectedStudent.schoolUnit?.name || getUnitName(selectedStudent.schoolUnitId)}
                  </span>
                  <p className="text-[11px] font-semibold text-slate-300 mt-1">
                    Kelas {selectedStudent.className}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-[11px]">
                <div className="space-y-1">
                  <p className="text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-600" /> Wali / Orang Tua
                  </p>
                  <p className="font-semibold text-slate-200">
                    {selectedStudent.parent?.name || "-"}
                  </p>
                  {selectedStudent.parent?.phoneNumber && (
                    <p className="text-[10px] text-slate-500 font-mono">
                      {selectedStudent.parent.phoneNumber}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-600" /> Tahun Angkatan
                  </p>
                  <p className="font-semibold text-slate-200">
                    Tahun {selectedStudent.enrollmentYear}
                  </p>
                </div>
              </div>

              {selectedStudent.discountAmount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-[11px] text-amber-300">
                  Potongan SPP: <b>{formatRupiah(selectedStudent.discountAmount)}</b> / bulan
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Invoices, Selection & Print Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selection & Action Header Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                2. Pilih Pembayaran / Bulan
              </h2>

              {/* Year Filter */}
              <div className="flex items-center gap-2">
                <label className="text-slate-400 font-semibold text-[11px]">Tahun:</label>
                <input
                  type="number"
                  min="2000"
                  max="9999"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-24 bg-slate-950 border border-slate-800 text-white px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quick Selection Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllPaid}
                  disabled={!selectedStudent || invoices.length === 0}
                  className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40"
                >
                  Pilih Semua Lunas
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={!selectedStudent || invoices.length === 0}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40"
                >
                  Pilih Semua Item
                </button>
                {selectedKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                )}
              </div>

              {/* Counter Indicator */}
              <div className="text-[11px] font-semibold text-slate-400">
                Terpilih: <span className="text-white font-extrabold">{selectedKeys.length}</span> item
              </div>
            </div>

            {/* Invoices List / Grid */}
            {!selectedStudent ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Silakan cari dan pilih siswa terlebih dahulu di sisi kiri.
              </div>
            ) : invoicesLoading ? (
              <div className="py-12 text-center text-slate-500 animate-pulse">
                Memuat daftar tagihan & riwayat pembayaran...
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Tidak ada tagihan atau pembayaran terdaftar untuk tahun {selectedYear}.
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {invoices.map((inv, idx) => {
                  const key = getInvoiceKey(inv, idx);
                  const isSelected = selectedKeys.includes(key);
                  const isPaid = inv.status === "PAID";
                  const tx = inv.transactions && inv.transactions.length > 0 ? inv.transactions[0] : null;

                  return (
                    <div
                      key={key}
                      onClick={() => toggleSelectInvoice(key)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-indigo-500/15 border-indigo-500/50 shadow-inner"
                          : "bg-slate-950/60 border-slate-850 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-indigo-400">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">
                            {getInvoiceTitle(inv)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span>Nominal: <b className="text-slate-200">{formatRupiah(inv.amount)}</b></span>
                            {tx && (
                              <span className="text-slate-500 font-mono">
                                • Tgl: {new Date(tx.date).toLocaleDateString("id-ID")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isPaid ? "Lunas" : "Belum Lunas"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer Summary & Print Actions */}
            {selectedStudent && selectedKeys.length > 0 && (
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-slate-400">Total Nominal Terpilih:</p>
                  <p className="text-lg font-extrabold text-indigo-400 font-mono">
                    {formatRupiah(totalSelectedAmount)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {Math.ceil(selectedKeys.length / 4)} lembar A4 (Format 1x4 Strip Memanjang)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Eye className="w-4 h-4 text-indigo-400" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer text-xs"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Kwitansi ({selectedKeys.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      {showPreviewModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div>
                <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Preview Cetak Kwitansi (Format 1x4 Strip Kertas A4)
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedStudent.name} • {selectedInvoicesList.length} Kwitansi • {Math.ceil(selectedInvoicesList.length / 4)} Halaman A4
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-4">
              <div className="max-w-2xl mx-auto space-y-4">
                {selectedInvoicesList.map((inv, idx) => {
                  const tx = inv.transactions && inv.transactions.length > 0 ? inv.transactions[0] : null;
                  const dateStr = tx
                    ? new Date(tx.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : new Date().toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      });

                  return (
                    <div
                      key={idx}
                      className="bg-white text-slate-900 p-4 rounded-xl border border-slate-300 shadow-md relative overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        {/* Left Info */}
                        <div className="sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-3 space-y-2">
                          <div>
                            <span className="font-black text-indigo-950 text-sm tracking-tight block">
                              SIKUAT
                            </span>
                            <span className="text-[9px] font-bold text-slate-800 uppercase block">
                              Yayasan Al Uswah Terpadu
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 space-y-0.5">
                            <p>No: <b className="font-mono text-slate-900">KW-{inv.id || `${inv.month}${inv.year}`}-{selectedStudent.studentNumber}</b></p>
                            <p>Tgl: {dateStr}</p>
                          </div>
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300">
                            LUNAS
                          </span>
                        </div>

                        {/* Mid Info */}
                        <div className="sm:w-1/2 space-y-1.5 text-[11px]">
                          <div className="text-center font-bold text-indigo-900 uppercase text-xs border-b pb-1">
                            Bukti Pembayaran Resmi
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <span className="text-slate-500">Diterima Dari:</span>
                            <span className="col-span-2 font-bold text-slate-900">{selectedStudent.parent?.name || "Wali Murid"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <span className="text-slate-500">Siswa / NIS:</span>
                            <span className="col-span-2 font-semibold">{selectedStudent.name} ({selectedStudent.studentNumber})</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <span className="text-slate-500">Untuk Bayar:</span>
                            <span className="col-span-2 font-bold text-indigo-950">{getInvoiceTitle(inv)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <span className="text-slate-500">Jumlah Uang:</span>
                            <span className="col-span-2 font-black font-mono text-xs text-indigo-950">{formatRupiah(inv.amount)}</span>
                          </div>
                          <div className="text-[10px] italic bg-slate-50 p-1 rounded text-slate-700 border-l-2 border-indigo-600">
                            Terbilang: {formatTerbilang(inv.amount)}
                          </div>
                        </div>

                        {/* Right Signatures */}
                        <div className="sm:w-1/4 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-3 flex flex-col justify-between text-[10px] text-center">
                          <div className="text-slate-500 text-[9px]">Tuban, {dateStr}</div>
                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <div>
                              <span className="text-[9px] text-slate-500">Penyetor</span>
                              <div className="h-6"></div>
                              <span className="font-bold border-t border-slate-400 pt-0.5 block text-[9px]">Wali Murid</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-500">Kasir</span>
                              <div className="h-6"></div>
                              <span className="font-bold border-t border-slate-400 pt-0.5 block text-[9px]">{user?.name?.split(" ")[0] || "Admin"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cut line */}
                      <div className="mt-3 pt-2 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-400">
                        ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
              <span className="text-slate-400 text-xs">
                Total: <b className="text-white">{formatRupiah(totalSelectedAmount)}</b>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer text-xs"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    handlePrint();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
