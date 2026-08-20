"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  CreditCard,
  Search,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  GraduationCap,
  Receipt,
  ArrowRight,
  Calculator,
  Printer,
  MessageCircle,
  X
} from "lucide-react";

interface Student {
  id: number;
  studentNumber: string;
  name: string;
  className: string;
  schoolUnitId: number;
  parentId: number;
  enrollmentYear: number;
  discountAmount: number;
  parent: {
    name: string;
    phoneNumber: string;
    email: string | null;
  };
}

interface SppTariff {
  id: number;
  schoolUnitId: number;
  enrollmentYear: number;
  amount: number;
}

interface InvoiceTransaction {
  id: number;
  amount: number;
  date: string;
  paymentMethod: string;
}

interface DBInvoice {
  id: number;
  studentId: number;
  invoiceType: "SPP" | "EKSTRAKURIKULER" | "KEGIATAN" | "UANG_PENGEMBANGAN" | "LAINNYA";
  month: number;
  year: number;
  baseAmount: number;
  discountApplied: number;
  amount: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "VOID";
  transactions: InvoiceTransaction[];
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

export default function PaymentsPage() {
  const { user } = useAuthStore();
  
  // Search state
  const [nisQuery, setNisQuery] = useState("");
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [tariffs, setTariffs] = useState<SppTariff[]>([]);
  const [matchingTariff, setMatchingTariff] = useState<SppTariff | null>(null);
  
  // Student invoices states
  const [studentInvoices, setStudentInvoices] = useState<DBInvoice[]>([]);
  
  // Payment states
  const [invoiceType, setInvoiceType] = useState<"SPP" | "UANG_PENGEMBANGAN">("SPP");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  
  // Transaction results states
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Fetch tariffs on mount to help calculate discounted estimates
  const fetchTariffs = async () => {
    try {
      const response = await api.get("/spp-tariffs");
      setTariffs(response.data.data);
    } catch (err) {
      console.error("Gagal memuat tarif SPP", err);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, []);

  // Update matching tariff when student & unit/year changes
  useEffect(() => {
    if (foundStudent && tariffs.length > 0) {
      const match = tariffs.find(
        (t) =>
          t.schoolUnitId === foundStudent.schoolUnitId &&
          t.enrollmentYear === foundStudent.enrollmentYear
      );
      setMatchingTariff(match || null);
      
      // Auto-set payment amount based on tariff discount
      if (match && invoiceType === "SPP") {
        const discount = foundStudent.discountAmount || 0;
        const netAmount = Math.max(0, match.amount - discount);
        setPaymentAmount(String(netAmount));
      }
    }
  }, [foundStudent, tariffs, invoiceType]);

  // Helper to fetch student invoices for specific year
  const fetchStudentInvoices = async (studentNum: string, year: number) => {
    try {
      const invResponse = await api.get(`/invoices/student/${studentNum}?year=${year}`);
      setStudentInvoices(invResponse.data.allInvoices || []);
    } catch (err) {
      console.error("Gagal mengambil data invoice siswa", err);
    }
  };

  // Auto re-fetch invoices when selected year changes or student changes
  useEffect(() => {
    if (foundStudent) {
      fetchStudentInvoices(foundStudent.studentNumber, selectedYear);
    }
  }, [foundStudent, selectedYear]);

  const handleSearchStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisQuery.trim()) return;

    setSearchLoading(true);
    setError(null);
    setSuccessMsg(null);
    setFoundStudent(null);
    setReceiptData(null);
    setShowReceiptModal(false);
    setStudentInvoices([]);

    try {
      const response = await api.get(`/students?search=${encodeURIComponent(nisQuery.trim())}`);
      const studentsList: Student[] = response.data.data;
      const match = studentsList.find(
        (s) => s.studentNumber.toLowerCase() === nisQuery.trim().toLowerCase()
      );

      if (match) {
        setFoundStudent(match);
        // Fetch existing invoices for student for selected year
        fetchStudentInvoices(match.studentNumber, selectedYear);
      } else {
        setError("Siswa dengan Nomor Induk tersebut tidak ditemukan");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mencari informasi siswa");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundStudent) return;

    setError(null);
    setSuccessMsg(null);
    setReceiptData(null);
    setSubmitLoading(true);

    try {
      const payload = {
        studentNumber: foundStudent.studentNumber,
        month: selectedMonth,
        year: selectedYear,
        invoiceType,
        paymentAmount: Number(paymentAmount),
      };

      const response = await api.post("/invoices/pay-offline", payload);
      const rawData = response.data.data?.invoice || response.data.data || {};
      const invData = {
        id: rawData.id || rawData.invoiceId || rawData.transactionId || Date.now(),
        invoiceType: rawData.invoiceType || invoiceType,
        month: rawData.month || selectedMonth,
        year: rawData.year || selectedYear,
        amount: rawData.amount || rawData.amountPaid || Number(paymentAmount),
        status: rawData.status || "PAID",
      };
      setSuccessMsg(response.data.message || "Pembayaran tunai berhasil diproses");
      setReceiptData(invData);
      setShowReceiptModal(true);
      
      // Refresh invoices for current selected year
      fetchStudentInvoices(foundStudent.studentNumber, selectedYear);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal memproses pembayaran");
    } finally {
      setSubmitLoading(false);
    }
  };

  const getUnitName = (unitId: number) => {
    return SCHOOL_UNITS.find((u) => u.id === unitId)?.name || `Unit ${unitId}`;
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handlePrintReceipt = () => {
    if (!foundStudent || !receiptData) return;
    const mockInvoice: DBInvoice = {
      id: receiptData.id,
      studentId: foundStudent.id,
      invoiceType: receiptData.invoiceType,
      month: receiptData.month,
      year: receiptData.year,
      baseAmount: receiptData.amount,
      discountApplied: 0,
      amount: receiptData.amount,
      status: "PAID",
      transactions: [{
        id: Date.now(),
        amount: receiptData.amount,
        date: new Date().toISOString(),
        paymentMethod: "CASH"
      }]
    };
    handlePrintReceiptForInvoice(mockInvoice);
  };

  const handlePrintReceiptForInvoice = (inv: DBInvoice) => {
    if (!foundStudent) return;

    const tx = inv.transactions && inv.transactions.length > 0 ? inv.transactions[0] : null;
    const dateStr = tx ? new Date(tx.date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " WIB" : new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const amountText = formatRupiah(inv.amount);

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

    const terbilangStr = terbilangFunc(inv.amount) ? terbilangFunc(inv.amount) + " Rupiah" : "Nol Rupiah";
    const rawMethod = tx ? tx.paymentMethod : "CASH";
    const displayMethod = rawMethod.toUpperCase() === "MIDTRANS" ? "QRIS" : rawMethod;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Kwitansi Pembayaran SIKUAT - ${foundStudent.name}</title>
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
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">No. Kwitansi: KW-${inv.id || 'NEW'}-${foundStudent.studentNumber}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Tanggal: ${dateStr.split(" pukul ")[0]}</div>
              </div>
            </div>
            
            <div class="receipt-title">Kwitansi Pembayaran SPP</div>

            <div class="row-data">
              <div class="label">Telah Diterima Dari</div>
              <div class="value" style="font-weight: 700;">${foundStudent.parent.name} (Wali ${foundStudent.name})</div>
            </div>

            <div class="row-data">
              <div class="label">Nama Siswa / NIS</div>
              <div class="value" style="font-weight: 600;">${foundStudent.name} (NIS: ${foundStudent.studentNumber})</div>
            </div>

            <div class="row-data">
              <div class="label">Kelas / Unit</div>
              <div class="value">Kelas ${foundStudent.className} / Unit ${SCHOOL_UNITS.find(u => u.id === foundStudent.schoolUnitId)?.name || 'SD'}</div>
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
                ${tx && tx.amount ? `<span style="margin-left: 10px; font-size: 11px; color: #64748b;">(Pembayaran loket)</span>` : ""}
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
                <div class="signature-name">${foundStudent.parent.name}</div>
              </div>
              
              <div class="signature">
                <div style="font-size: 11px; color: #64748b; margin-bottom: 40px;">Petugas Administrasi</div>
                <div class="signature-space"></div>
                <div class="signature-name">${user?.name || "Admin Kasir"}</div>
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

  // Calculate Net estimation
  const getEstimatedAmount = () => {
    if (!matchingTariff) return 0;
    const discount = foundStudent ? foundStudent.discountAmount : 0;
    return Math.max(0, matchingTariff.amount - discount);
  };

  // Check selected month SPP invoice details
  const getSelectedSPPDetails = () => {
    const inv = studentInvoices.find(
      (i) => i.month === selectedMonth && i.year === selectedYear && i.invoiceType === "SPP"
    );
    if (!inv) return { status: "PENDING", alreadyPaid: 0, remaining: getEstimatedAmount() };
    const paid = inv.transactions && inv.transactions.length > 0 
      ? inv.transactions.reduce((sum, tx) => sum + tx.amount, 0)
      : (inv.status === "PAID" ? inv.amount : 0);
    return {
      status: inv.status,
      alreadyPaid: paid,
      remaining: Math.max(0, inv.amount - paid),
      invoice: inv
    };
  };

  // Check development fund details
  const getDevFundDetails = () => {
    const inv = studentInvoices.find((i) => i.invoiceType === "UANG_PENGEMBANGAN");
    if (!inv) return { status: "PENDING", total: 2000000, alreadyPaid: 0, remaining: 2000000 };
    const paid = inv.transactions && inv.transactions.length > 0 
      ? inv.transactions.reduce((sum, tx) => sum + tx.amount, 0)
      : (inv.status === "PAID" ? inv.amount : 0);
    return {
      status: inv.status,
      total: inv.amount,
      alreadyPaid: paid,
      remaining: Math.max(0, inv.amount - paid),
      invoice: inv
    };
  };

  const sppInfo = getSelectedSPPDetails();
  const devInfo = getDevFundDetails();

  const isCurrentSPPPaid = sppInfo.status === "PAID";
  const isDevFundPaid = devInfo.status === "PAID";

  const getWhatsAppReceiptLink = () => {
    if (!foundStudent || !receiptData) return "#";
    const phone = foundStudent.parent?.phoneNumber || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const targetPhone = cleanPhone.startsWith("0") ? `62${cleanPhone.slice(1)}` : cleanPhone;
    
    const periodStr = receiptData.invoiceType === "SPP" 
      ? `Bulan ${MONTHS.find(m => m.value === receiptData.month)?.name} ${receiptData.year}`
      : `Uang Pengembangan ${receiptData.year}`;
      
    const message = `*KWITANSI BUKTI PEMBAYARAN RESMI*\n` +
      `*SIKUAT - Yayasan Al Uswah Terpadu*\n\n` +
      `Terima kasih, pembayaran SPP/Sekolah putra/putri Anda telah *BERHASIL* dicatat di Kasir Loket.\n\n` +
      `*Rincian Transaksi:*\n` +
      `- *No. Invoice:* #INV-${receiptData.id}\n` +
      `- *Nama Siswa:* ${foundStudent.name}\n` +
      `- *NIS:* ${foundStudent.studentNumber}\n` +
      `- *Unit/Kelas:* ${getUnitName(foundStudent.schoolUnitId)} - ${foundStudent.className}\n` +
      `- *Pembayaran:* ${receiptData.invoiceType} (${periodStr})\n` +
      `- *Nominal Dibayar:* ${formatRupiah(Number(paymentAmount))}\n` +
      `- *Status:* ${receiptData.status === "PAID" ? "LUNAS" : "TERBAYAR SEBAGIAN"}\n` +
      `- *Tanggal:* ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}\n\n` +
      `_Pesan ini dikirim otomatis oleh Sistem Informasi Keuangan SIKUAT Al Uswah Terpadu._`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-400" />
          Kasir Pembayaran Sekolah (Offline)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Formulir pelunasan tagihan SPP bulanan atau cicilan Uang Pengembangan siswa secara tunai di loket.
        </p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg text-xs text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {receiptData && (
            <button
              onClick={() => setShowReceiptModal(true)}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold rounded text-[11px] border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" /> Lihat Nota Pembayaran
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Layout Split: Left search/form, Right result receipt card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Input Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Step 1: Student Lookup */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-md">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 font-bold text-xs">
                1
              </span>
              Cari & Verifikasi Siswa
            </h2>

            <form onSubmit={handleSearchStudent} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Masukkan Nomor Induk Siswa (NIS)..."
                  value={nisQuery}
                  onChange={(e) => setNisQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-700"
                  disabled={searchLoading || submitLoading}
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading || submitLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {searchLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  "Cari"
                )}
              </button>
            </form>

            {/* Verified Student Details Card */}
            {foundStudent && (
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-4 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                      Siswa Terverifikasi
                    </p>
                    <h3 className="text-sm font-extrabold text-white">
                      {foundStudent.name}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-505">
                      NIS: {foundStudent.studentNumber} • Kelas: {foundStudent.className}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                    Unit {getUnitName(foundStudent.schoolUnitId)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-3 text-[11px] text-slate-400">
                  <div className="space-y-1">
                    <p className="text-slate-500 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-600" /> Angkatan Masuk
                    </p>
                    <p className="font-semibold text-slate-300">
                      Tahun {foundStudent.enrollmentYear}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-600" /> Wali / Orang Tua
                    </p>
                    <p className="font-semibold text-slate-300">
                      {foundStudent.parent.name} ({foundStudent.parent.phoneNumber})
                    </p>
                  </div>
                </div>

                {/* Potongan SPP Alert */}
                {foundStudent.discountAmount > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-[11px] text-amber-400 flex items-center gap-2">
                    <Calculator className="w-4 h-4 shrink-0" />
                    <span>Siswa ini mendapatkan potongan tarif SPP sebesar <b>{formatRupiah(foundStudent.discountAmount)}</b>.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Payment Form */}
          {foundStudent && (
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-md animate-fade-in">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 font-bold text-xs">
                  2
                </span>
                Detail & Input Pembayaran Tunai
              </h2>

              <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
                {/* Select Invoice Type */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Jenis Pembayaran</label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SPP">SPP Bulanan (SPP)</option>
                    <option value="UANG_PENGEMBANGAN">Cicilan Uang Pengembangan</option>
                  </select>
                </div>

                {/* Select Month and Year for SPP */}
                {invoiceType === "SPP" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Bulan SPP</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Tahun SPP</label>
                      <input
                        type="number"
                        min="2000"
                        max="9999"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">Tahun Uang Pengembangan</label>
                    <input
                      type="number"
                      min="2000"
                      max="9999"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Status & Billing summary card */}
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl space-y-2 text-[11px]">
                  {invoiceType === "SPP" ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Status SPP Bulan Terpilih</span>
                        <span className={`font-bold ${
                          sppInfo.status === "PAID"
                            ? "text-emerald-400"
                            : sppInfo.status === "PARTIALLY_PAID"
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}>
                          {sppInfo.status === "PAID" ? "Lunas" : sppInfo.status === "PARTIALLY_PAID" ? "Dicicil" : "Belum Dibayar"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Tarif Dasar SPP Angkatan</span>
                        <span className="text-slate-200 font-mono">
                          {matchingTariff ? formatRupiah(matchingTariff.amount) : "Belum Diatur"}
                        </span>
                      </div>
                      {foundStudent.discountAmount > 0 && (
                        <div className="flex justify-between items-center text-amber-400 font-semibold">
                          <span>Potongan Diskon SPP</span>
                          <span className="font-mono">
                            -{formatRupiah(foundStudent.discountAmount)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-slate-900 pt-2 flex justify-between items-center text-xs font-bold">
                        <span className="text-white">Total Yang Harus Dibayar</span>
                        <span className="text-emerald-400 font-mono">{formatRupiah(sppInfo.remaining)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Status Uang Pengembangan</span>
                        <span className={`font-bold ${
                          devInfo.status === "PAID"
                            ? "text-emerald-400"
                            : devInfo.status === "PARTIALLY_PAID"
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}>
                          {devInfo.status === "PAID" ? "Lunas" : devInfo.status === "PARTIALLY_PAID" ? "Tercicil" : "Belum Dibayar"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Sudah Dibayar</span>
                        <span className="text-slate-200 font-mono">{formatRupiah(devInfo.alreadyPaid)}</span>
                      </div>
                      <div className="border-t border-slate-900 pt-2 flex justify-between items-center text-xs font-bold">
                        <span className="text-white">Sisa Tagihan Uang Pengembangan</span>
                        <span className="text-amber-400 font-mono">{formatRupiah(devInfo.remaining)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Amount input field */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Nominal Uang Tunai Diterima (IDR)</label>
                  <input
                    type="number"
                    placeholder="Masukkan nominal bayar..."
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                    disabled={invoiceType === "SPP"}
                  />
                  {invoiceType === "SPP" && (
                    <span className="text-[9px] text-slate-500 block italic">Nominal SPP terkunci otomatis sesuai tarif dasar unit & persentase diskon siswa.</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    submitLoading ||
                    (invoiceType === "SPP" ? (!matchingTariff || sppInfo.status === "PAID") : devInfo.status === "PAID") ||
                    !paymentAmount || Number(paymentAmount) <= 0
                  }
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  {submitLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>
                        {invoiceType === "SPP" 
                          ? (sppInfo.status === "PAID" ? "Tagihan SPP Sudah Lunas" : "Proses Pembayaran Tunai") 
                          : (devInfo.status === "PAID" ? "Uang Pengembangan Sudah Lunas" : "Proses Bayar Cicilan")}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Receipt output card */}
        <div className="lg:col-span-5">
          {receiptData ? (
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-md text-xs relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

              <div className="text-center space-y-2 pb-4 border-b border-slate-800/50">
                <img src="/logo-sikuat.png" alt="Logo SIKUAT" className="w-12 h-12 mx-auto object-contain mb-1" />
                <h3 className="text-sm font-extrabold text-white tracking-wide">
                  NOTA PEMBAYARAN RESMI SIKUAT
                </h3>
                <p className="text-[10px] text-amber-400 font-semibold tracking-wide">
                  Sistem Informasi Keuangan Al Uswah Terpadu
                </p>
              </div>

              {/* Receipt Details */}
              <div className="space-y-3 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Invoice ID</span>
                  <span className="font-mono font-bold text-white">#INV-{receiptData.id || receiptData.invoiceId || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Siswa</span>
                  <span className="font-semibold text-slate-300">{foundStudent?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIS / Kelas</span>
                  <span className="font-mono text-slate-300">{foundStudent?.studentNumber} ({foundStudent?.className})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Sekolah</span>
                  <span className="font-semibold text-slate-300">
                    {foundStudent ? getUnitName(foundStudent.schoolUnitId) : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis Pembayaran</span>
                  <span className="font-semibold text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15">
                    {receiptData.invoiceType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Periode</span>
                  <span className="font-semibold text-white">
                    {MONTHS.find((m) => m.value === receiptData.month)?.name} {receiptData.year}
                  </span>
                </div>
                
                <div className="border-t border-slate-850 pt-3 flex justify-between">
                  <span className="text-slate-500">Total Tagihan</span>
                  <span className="text-slate-300 font-mono">{formatRupiah(receiptData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Bayar</span>
                  <span className={`font-bold ${receiptData.status === "PAID" ? "text-emerald-400" : "text-amber-400"}`}>
                    {receiptData.status === "PAID" ? "Lunas (Kasir Tunai)" : "Sebagian (Cicilan)"}
                  </span>
                </div>
                
                <div className="border-t border-slate-850 pt-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase">Uang Tunai Diterima</span>
                  <span className="text-base font-black text-emerald-400 font-mono">{formatRupiah(Number(paymentAmount))}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800/50 flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-4 h-4" /> Buka Modal Nota
                  </button>
                  <a
                    href={getWhatsAppReceiptLink()}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                    title="Kirim Bukti Pembayaran ke WhatsApp Ortu"
                  >
                    <MessageCircle className="w-4 h-4" /> WA Ortu
                  </a>
                </div>
                
                <button
                  onClick={() => {
                    setFoundStudent(null);
                    setReceiptData(null);
                    setShowReceiptModal(false);
                    setNisQuery("");
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all text-center cursor-pointer text-xs"
                >
                  + Transaksi Baru
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/20 border border-slate-800/50 border-dashed p-12 rounded-2xl text-center text-slate-650 flex flex-col items-center justify-center h-full min-h-[300px]">
              <Receipt className="w-12 h-12 text-slate-700 mb-3" />
              <p className="font-semibold text-slate-500">Kuitansi / Nota Pembayaran</p>
              <p className="text-[10px] text-slate-600 max-w-xs mt-1 leading-normal">
                Cari siswa berdasarkan NIS dan tentukan jenis pembayaran untuk mencatat transaksi serta mencetak kwitansi nota resmi.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Daftar Tagihan Siswa Section */}
      {foundStudent && (
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-4 backdrop-blur-md">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" />
            Daftar Tagihan & Status Pembayaran (Tahun Ajaran/Kalender {selectedYear})
          </h2>
          <p className="text-xs text-slate-400">
            Daftar seluruh tagihan aktif untuk siswa ini. Admin dapat secara langsung mengubah status pembayaran atau menghapus data pembayaran untuk melakukan reset.
          </p>

          <div className="overflow-x-auto border border-slate-800/60 rounded-xl">
            {studentInvoices.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">Tidak ada tagihan yang ditemukan untuk tahun {selectedYear}.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Tagihan</th>
                    <th className="px-4 py-3">Bulan/Tahun</th>
                    <th className="px-4 py-3 text-right">Nominal Tagihan</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi Administrasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {studentInvoices.map((inv) => {
                    const isPaid = inv.status === "PAID";
                    return (
                      <tr key={`${inv.invoiceType}-${inv.month}-${inv.year}`} className="hover:bg-slate-800/10">
                        <td className="px-4 py-3 font-semibold text-white">
                          {inv.invoiceType === "SPP" ? "SPP Bulanan" : "Uang Pengembangan"}
                        </td>
                        <td className="px-4 py-3">
                          {inv.invoiceType === "SPP" ? `${MONTHS.find(m => m.value === inv.month)?.name} ${inv.year}` : `Tahun ${inv.year}`}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">
                          {formatRupiah(inv.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : inv.status === "PARTIALLY_PAID"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {inv.status === "PAID" ? "Lunas" : inv.status === "PARTIALLY_PAID" ? "Dicicil" : "Belum Lunas"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!isPaid ? (
                              <button
                                onClick={async () => {
                                  if (confirm(`Apakah Anda yakin ingin menandai tagihan ini sebagai LUNAS?`)) {
                                    try {
                                      if (inv.id) {
                                        await api.put(`/invoices/${inv.id}/status`, { status: "PAID" });
                                      } else {
                                        // Virtual invoice, create by paying offline
                                        await api.post("/invoices/pay-offline", {
                                          studentNumber: foundStudent.studentNumber,
                                          month: inv.month,
                                          year: inv.year,
                                          invoiceType: inv.invoiceType,
                                          paymentAmount: inv.amount,
                                        });
                                      }
                                      // Refresh student invoices for selected year
                                      fetchStudentInvoices(foundStudent.studentNumber, selectedYear);
                                      setSuccessMsg("Status pembayaran berhasil diubah menjadi Lunas!");
                                    } catch (err: any) {
                                      alert(err.response?.data?.message || "Gagal mengubah status");
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer"
                              >
                                Set Lunas
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handlePrintReceiptForInvoice(inv)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer flex items-center gap-1 inline-flex"
                                  title="Cetak kwitansi pembayaran"
                                >
                                  <Printer className="w-3 h-3" /> Kwitansi
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Apakah Anda yakin ingin membatalkan pelunasan tagihan ini (Set Belum Lunas)? Semua riwayat transaksi kasir untuk tagihan ini akan terhapus.`)) {
                                      try {
                                        await api.put(`/invoices/${inv.id}/status`, { status: "PENDING" });
                                        fetchStudentInvoices(foundStudent.studentNumber, selectedYear);
                                        setSuccessMsg("Status pembayaran berhasil diubah menjadi Belum Lunas!");
                                      } catch (err: any) {
                                        alert(err.response?.data?.message || "Gagal mengubah status");
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer"
                                >
                                  Set Belum Lunas
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Apakah Anda yakin ingin MENGHAPUS data tagihan beserta riwayat transaksinya dari database? Tindakan ini tidak dapat dibatalkan.`)) {
                                      try {
                                        await api.delete(`/invoices/${inv.id}`);
                                        fetchStudentInvoices(foundStudent.studentNumber, selectedYear);
                                        setSuccessMsg("Data tagihan berhasil dihapus sepenuhnya!");
                                      } catch (err: any) {
                                        alert(err.response?.data?.message || "Gagal menghapus tagihan");
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer"
                                >
                                  Hapus Tagihan
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
        </div>
      )}

      {/* Pop-Up Modal Official Nota Pembayaran SIKUAT */}
      {showReceiptModal && receiptData && foundStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in no-print">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative text-slate-100 animate-scale-up">
            
            {/* Modal Top Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm text-white">Kwitansi Nota Pembayaran Resmi</span>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Body - Formal Indonesian Kwitansi Format */}
            <div id="printable-receipt" className="p-6 space-y-5 text-xs bg-slate-900">
              
              {/* Kop Surat Resmi */}
              <div className="flex items-center justify-between border-b-2 border-slate-700 pb-3 print-header-line">
                <div className="flex items-center gap-3">
                  <img src="/logo-sikuat.png" alt="SIKUAT Logo" className="w-14 h-14 object-contain" />
                  <div>
                    <h2 className="text-base font-black text-white tracking-tight uppercase leading-tight">
                      YAYASAN AL USWAH TERPADU
                    </h2>
                    <p className="text-xs font-extrabold text-amber-400">
                      SISTEM INFORMASI KEUANGAN AL USWAH TERPADU (SIKUAT)
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Jl. Al Uswah Terpadu • Telp: (031) 8900-123 • Email: sikuat@aluswah.sch.id
                    </p>
                  </div>
                </div>
                <div className="text-right border-l border-slate-800 pl-4">
                  <span className="inline-block px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {receiptData.status === "PAID" ? "LUNAS / SAH" : "TERBAYAR SEBAGIAN"}
                  </span>
                  <p className="text-[10px] font-mono text-slate-300 font-bold mt-1">
                    No. Kwitansi: #KW-2026-{receiptData.id || receiptData.invoiceId || "-"}
                  </p>
                </div>
              </div>

              {/* Judul Dokumen */}
              <div className="text-center pt-1 pb-1">
                <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-indigo-500/30 inline-block pb-0.5">
                  KUITANSI BUKTI PEMBAYARAN RESMI
                </h3>
              </div>

              {/* Tabel Detail Kwitansi Formal */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5 text-[11px] print-border-box">
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-400 font-semibold">Telah Diterima Dari</span>
                  <span className="col-span-1 text-slate-500">:</span>
                  <span className="col-span-7 font-bold text-white">{foundStudent.parent.name}</span>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-400 font-semibold">Nama Siswa / NIS</span>
                  <span className="col-span-1 text-slate-500">:</span>
                  <span className="col-span-7 font-semibold text-slate-200">
                    {foundStudent.name} <span className="font-mono text-indigo-400">({foundStudent.studentNumber})</span>
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-400 font-semibold">Unit Sekolah & Kelas</span>
                  <span className="col-span-1 text-slate-500">:</span>
                  <span className="col-span-7 text-slate-200">
                    Unit {getUnitName(foundStudent.schoolUnitId)} • Kelas {foundStudent.className}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-400 font-semibold">Guna Pembayaran</span>
                  <span className="col-span-1 text-slate-500">:</span>
                  <span className="col-span-7 font-bold text-emerald-400">
                    {receiptData.invoiceType === "SPP" 
                      ? `Pembayaran SPP Bulanan - ${MONTHS.find(m => m.value === receiptData.month)?.name} ${receiptData.year}`
                      : `Cicilan Uang Pengembangan ${receiptData.year}`}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-2 border-t border-slate-850 pt-2.5">
                  <span className="col-span-4 text-slate-400 font-semibold">Terbilang</span>
                  <span className="col-span-1 text-slate-500">:</span>
                  <span className="col-span-7 italic font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {formatTerbilang(Number(paymentAmount))}
                  </span>
                </div>
              </div>

              {/* Banner Total Jumlah Rp */}
              <div className="bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-slate-950 border-2 border-emerald-500/40 p-4 rounded-xl flex items-center justify-between print-border-box">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Jumlah Nominal Tunai Diterima
                  </p>
                  <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                    Metode: Tunai / Pembayaran Loket Offline
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                    {formatRupiah(Number(paymentAmount))}
                  </span>
                </div>
              </div>

              {/* Tanda Tangan & Stempel Legalisasi */}
              <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 items-end text-[11px]">
                <div className="space-y-1 text-[10px] text-slate-500">
                  <p className="italic">Catatan:</p>
                  <p className="text-slate-400">• Simpan kuitansi ini sebagai bukti pembayaran tunai sah.</p>
                  <p className="text-slate-400">• Kuitansi ini dicetak secara digital oleh SIKUAT Al Uswah Terpadu.</p>
                </div>

                <div className="text-center space-y-3">
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Surabaya, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <div className="inline-block border-2 border-emerald-500/50 bg-emerald-500/10 px-4 py-1.5 rounded-lg text-center shadow-inner">
                    <p className="text-xs font-black text-emerald-400 tracking-wider">TERBAYAR LUNAS</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">KASIR SIKUAT</p>
                  </div>
                  <p className="text-xs font-extrabold text-white underline decoration-slate-600">
                    {user?.name || "Admin Kasir Keuangan"}
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Bottom Buttons */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center gap-3 no-print">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" /> Cetak Kwitansi Nota
              </button>
              <a
                href={getWhatsAppReceiptLink()}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <MessageCircle className="w-4 h-4" /> Kirim Bukti via WA
              </a>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
