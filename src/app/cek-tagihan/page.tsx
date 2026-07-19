"use client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Search,
  ArrowLeft,
  User,
  School,
  Calendar,
  Percent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  X,
  Copy,
  Check,
  QrCode,
  Building2,
  Wallet,
  ArrowRight
} from "lucide-react";

interface StudentInfo {
  id: number;
  studentNumber: string;
  name: string;
  enrollmentYear: number;
  discountPercentage: number;
  schoolUnit: {
    name: string;
  };
  parent: {
    name: string;
    email: string;
  };
}

interface Invoice {
  id: number | null;
  studentId: number;
  invoiceType: string;
  month: number;
  year: number;
  baseAmount: number;
  discountApplied: number;
  amount: number;
  status: "PENDING" | "PAID";
  midtransOrderId: string | null;
}

const INDONESIAN_MONTHS = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function CekTagihanPage() {
  const [studentNumber, setStudentNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState("");

  // Pakasir Payment Modal State
  const [snapOpen, setSnapOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"gopay" | "va_mandiri" | "va_bca" | "qris">("qris");
  const [vaNumber, setVaNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [loadingPaymentCode, setLoadingPaymentCode] = useState(false);
  const [pakasirData, setPakasirData] = useState<any | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Map frontend values to backend Pakasir method names
  const getBackendMethod = (method: string) => {
    if (method === "va_mandiri") return "mandiri";
    if (method === "va_bca") return "bca";
    return method;
  };

  useEffect(() => {
    if (!snapOpen || !selectedInvoice || !student) return;

    const fetchPaymentCode = async () => {
      setLoadingPaymentCode(true);
      setPaymentError(null);
      setPakasirData(null);
      try {
        const payload = {
          studentNumber: student.studentNumber,
          month: selectedInvoice.month,
          year: selectedInvoice.year,
          paymentMethod: getBackendMethod(paymentMethod),
        };
        const response = await api.post("/invoices/pakasir/create", payload);
        if (response.data.success) {
          setPakasirData(response.data.data);
          if (response.data.data?.payment?.payment_number) {
            setVaNumber(response.data.data.payment.payment_number);
          }
        } else {
          setPaymentError(response.data.message || "Gagal mendapatkan kode pembayaran");
        }
      } catch (err: any) {
        console.error(err);
        setPaymentError(err.response?.data?.message || "Gagal menghubungi server untuk mendapatkan kode pembayaran");
      } finally {
        setLoadingPaymentCode(false);
      }
    };

    fetchPaymentCode();
  }, [snapOpen, paymentMethod, selectedInvoice, student]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim()) {
      setError("Silakan masukkan NIS siswa terlebih dahulu");
      return;
    }

    setLoading(true);
    setError("");
    setStudent(null);
    setInvoices([]);

    try {
      // 1. Fetch invoices
      const response = await api.get(`/invoices/student/${studentNumber.trim()}?year=${selectedYear}`);
      
      if (response.data.success && response.data.data.length > 0) {
        setInvoices(response.data.data);
        
        // Use student profile returned directly from the public invoices endpoint
        const foundStudent = response.data.student;

        if (foundStudent) {
          setStudent(foundStudent);
        } else {
          // Fallback if student details cannot be fully fetched
          setStudent({
            id: response.data.data[0].studentId,
            studentNumber: studentNumber.trim(),
            name: "Siswa Terdaftar",
            enrollmentYear: response.data.data[0].year,
            discountPercentage: 0,
            schoolUnit: { name: "Unit Sekolah" },
            parent: { name: "-", email: "-" }
          });
        }
      } else {
        setError("Siswa tidak ditemukan atau tagihan belum dibuat.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError(
          "Demi menjaga privasi siswa, rincian tagihan keuangan saat ini hanya dapat diakses setelah masuk ke akun Wali Murid terdaftar."
        );
      } else {
        setError(
          err.response?.data?.message ||
          "Gagal menghubungi server. Pastikan database dan server backend aktif."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSnap = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSnapOpen(true);
    setPaymentSuccess(false);
    setProcessingPayment(false);
    setPaymentError(null);
    setPakasirData(null);
  };

  const handleSimulatePayment = async () => {
    if (!selectedInvoice || !student || !pakasirData) return;

    setProcessingPayment(true);
    setPaymentError(null);
    try {
      const simulatePayload = {
        orderId: pakasirData.orderId,
        amount: pakasirData.payment.total_payment || pakasirData.amount,
      };

      // Call simulation endpoint
      await api.post("/invoices/pakasir/simulate", simulatePayload);

      // Verify payment status
      const statusResponse = await api.get(`/invoices/pakasir/status`, {
        params: { order_id: pakasirData.orderId }
      });

      if (statusResponse.data.success && statusResponse.data.status === "completed") {
        setPaymentSuccess(true);
        // Refresh invoice list
        const updatedInvoices = invoices.map((inv) => {
          if (inv.month === selectedInvoice.month && inv.year === selectedInvoice.year) {
            return {
              ...inv,
              status: "PAID" as const,
              midtransOrderId: pakasirData.orderId,
            };
          }
          return inv;
        });
        setInvoices(updatedInvoices);
      } else {
        setPaymentError(statusResponse.data.message || "Status pembayaran belum selesai");
      }
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.response?.data?.message || "Gagal memproses simulasi pembayaran");
    } finally {
      setProcessingPayment(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        
        {/* Top Navbar */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800/60">
          <Link
            to="/login"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Login</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                Portal Publik Wali Murid
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/20 mb-3">
            S
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Cek Tagihan & Pembayaran SPP Online
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Masukkan Nomor Induk Siswa (NIS) untuk melihat rincian tagihan bulanan dan melakukan pembayaran SPP secara instant.
          </p>
        </div>

        {/* Search Box Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-xl mb-8">
          <form onSubmit={handleSearch} className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Masukkan NIS Siswa (contoh: TK-2025-001)"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white pl-11 pr-4 py-3.5 rounded-xl text-sm placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono tracking-wide"
                disabled={loading}
              />
            </div>

            <div className="flex gap-2 sm:gap-0">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-white px-4 py-3.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={loading}
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Cek Tagihan</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 flex flex-col gap-3.5 bg-red-950/45 border border-red-500/35 p-4 rounded-xl text-sm text-red-400">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {error.includes("akun") && (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md w-full sm:w-auto self-start cursor-pointer"
                >
                  <span>Masuk ke Portal Wali Murid</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Student Profile Card & Invoices */}
        {student && (
          <div className="space-y-6 animate-fadeIn">
            {/* Student Profile Details */}
            <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/40 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{student.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      NIS: <span className="text-slate-200">{student.studentNumber}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-slate-500" />
                      {student.schoolUnit?.name || "Unit Sekolah"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Angkatan {student.enrollmentYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discount / Parent Info */}
              <div className="flex flex-col gap-1.5 md:text-right border-t border-slate-800 md:border-t-0 pt-4 md:pt-0">
                <p className="text-xs text-slate-400">
                  Wali: <span className="text-slate-200 font-medium">{student.parent?.name}</span> ({student.parent?.email})
                </p>
                {student.discountPercentage > 0 && (
                  <div className="inline-flex md:self-end items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400">
                    <Percent className="w-3 h-3" />
                    Potongan SPP {student.discountPercentage}%
                  </div>
                )}
              </div>
            </div>

            {/* Invoices Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-slate-300 tracking-wide uppercase">
                  Daftar Tagihan SPP Bulanan - Tahun {selectedYear}
                </h4>
                <span className="text-xs text-slate-400">
                  Total {invoices.length} tagihan ditemukan
                </span>
              </div>

              <div className="grid gap-3.5">
                {invoices.map((invoice) => {
                  const isPaid = invoice.status === "PAID";
                  return (
                    <div
                      key={invoice.month}
                      className={`bg-slate-900/40 border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-900/60 ${
                        isPaid ? "border-emerald-500/20" : "border-slate-800/80"
                      }`}
                    >
                      {/* Left: Invoice Month & Year */}
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {invoice.month}
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-white">
                            SPP Bulan {INDONESIAN_MONTHS[invoice.month]}
                          </h5>
                          <span className="text-xs text-slate-400">
                            Tahun {invoice.year}
                          </span>
                        </div>
                      </div>

                      {/* Center: Financial Details */}
                      <div className="flex flex-col sm:text-right">
                        <span className="text-xs text-slate-400">Total Tagihan</span>
                        <div className="flex items-baseline gap-2 justify-start sm:justify-end">
                          <span className="font-bold text-white text-base">
                            {formatRupiah(invoice.amount)}
                          </span>
                          {invoice.discountApplied > 0 && (
                            <span className="text-[10px] text-slate-500 line-through">
                              {formatRupiah(invoice.baseAmount)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Status / Pay Button */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {isPaid ? (
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-400 shadow-sm shadow-emerald-500/5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Lunas</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenSnap(invoice)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Bayar Online</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Pakasir Payment Modal Overlay */}
      {snapOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          {/* Snap Container */}
          <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-scaleUp">
            
            {/* Header: Pakasir Logo & Total */}
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">
                  SIMULASI PEMBAYARAN ONLINE
                </span>
                <h3 className="font-extrabold text-indigo-600 text-base flex items-center gap-1">
                  pakasir <span className="text-slate-500 font-light text-[11px] border border-slate-355 px-1 py-0.2 rounded ml-1">Simulasi</span>
                </h3>
              </div>
              <button
                onClick={() => setSnapOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                disabled={processingPayment}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentSuccess ? (
              /* Success screen */
              <div className="p-8 flex flex-col items-center justify-center text-center animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border-2 border-emerald-400 mb-6">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h4 className="font-extrabold text-xl text-slate-900">Pembayaran Sukses!</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-xs">
                  Tagihan SPP bulan {INDONESIAN_MONTHS[selectedInvoice.month]} {selectedInvoice.year} telah berhasil dibayar.
                </p>

                <div className="w-full bg-slate-50 rounded-xl p-4 my-6 text-left border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order ID</span>
                    <span className="font-mono font-medium text-slate-700 text-[10px] break-all select-all">
                      {pakasirData?.orderId || "MOCK-PAKASIR"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nama Siswa</span>
                    <span className="font-medium text-slate-700">{student?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Metode</span>
                    <span className="font-bold text-indigo-650 uppercase">{paymentMethod.replace("_", " ")}</span>
                  </div>
                  {pakasirData?.payment?.fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Biaya Layanan</span>
                      <span className="font-medium text-slate-700">{formatRupiah(pakasirData.payment.fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200/80 pt-2 font-bold text-slate-800 text-sm">
                    <span>Jumlah</span>
                    <span>{formatRupiah(pakasirData?.payment?.total_payment || selectedInvoice.amount)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSnapOpen(false)}
                  className="w-full bg-slate-950 text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-850 transition-all shadow-lg shadow-slate-900/10 cursor-pointer"
                >
                  Kembali Ke Halaman Tagihan
                </button>
              </div>
            ) : (
              /* Checkout screens */
              <div className="flex-1 flex flex-col">
                {/* Total Billing Info */}
                <div className="bg-indigo-50/70 px-6 py-4 flex items-center justify-between border-b border-indigo-100">
                  <div className="text-xs">
                    <span className="text-slate-555">Total Tagihan</span>
                    <h5 className="font-extrabold text-slate-850 text-base mt-0.5">
                      {INDONESIAN_MONTHS[selectedInvoice.month]} {selectedInvoice.year}
                    </h5>
                  </div>
                  <span className="font-extrabold text-indigo-700 text-lg">
                    {formatRupiah(pakasirData?.payment?.total_payment || selectedInvoice.amount)}
                  </span>
                </div>

                {/* Main panel - Methods */}
                <div className="p-6 space-y-5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Pilih Metode Pembayaran
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* QRIS */}
                    <button
                      onClick={() => setPaymentMethod("qris")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 cursor-pointer ${
                        paymentMethod === "qris"
                          ? "border-indigo-600 bg-indigo-50/45 text-indigo-700"
                          : "border-slate-100 hover:border-slate-300 text-slate-655 bg-slate-50/30"
                      }`}
                    >
                      <QrCode className="w-5 h-5" />
                      <span className="text-xs font-bold">QRIS (GoPay/SPay)</span>
                    </button>

                    {/* VA Mandiri */}
                    <button
                      onClick={() => setPaymentMethod("va_mandiri")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 cursor-pointer ${
                        paymentMethod === "va_mandiri"
                          ? "border-indigo-600 bg-indigo-50/45 text-indigo-700"
                          : "border-slate-100 hover:border-slate-350 bg-slate-50/30"
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="text-xs font-bold">Mandiri VA</span>
                    </button>

                    {/* VA BCA */}
                    <button
                      onClick={() => setPaymentMethod("va_bca")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 cursor-pointer ${
                        paymentMethod === "va_bca"
                          ? "border-indigo-600 bg-indigo-50/45 text-indigo-700"
                          : "border-slate-100 hover:border-slate-300 text-slate-655 bg-slate-50/30"
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="text-xs font-bold">BCA VA</span>
                    </button>

                    {/* ShopeePay/Wallet */}
                    <button
                      onClick={() => setPaymentMethod("gopay")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 cursor-pointer ${
                        paymentMethod === "gopay"
                          ? "border-indigo-600 bg-indigo-50/45 text-indigo-700"
                          : "border-slate-100 hover:border-slate-300 text-slate-650 bg-slate-50/30"
                      }`}
                    >
                      <Wallet className="w-5 h-5" />
                      <span className="text-xs font-bold">GoPay Instant</span>
                    </button>
                  </div>

                  {/* Payment Details Container */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 min-h-[100px] flex flex-col justify-center">
                    {loadingPaymentCode ? (
                      <div className="flex flex-col items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        <span className="text-xs text-slate-500 mt-2">Mendapatkan kode pembayaran...</span>
                      </div>
                    ) : paymentError ? (
                      <div className="bg-red-50 text-red-650 p-3 rounded-lg text-xs font-semibold text-center">
                        {paymentError}
                      </div>
                    ) : paymentMethod === "qris" ? (
                      <div className="flex flex-col items-center text-center space-y-2 py-2">
                        <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                          {vaNumber ? (
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(vaNumber)}`}
                              alt="QRIS QR Code"
                              className="w-32 h-32 mx-auto"
                            />
                          ) : (
                            <QrCode className="w-32 h-32 text-slate-800" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Pindai kode QR di atas menggunakan aplikasi e-wallet pilihan Anda.
                        </p>
                      </div>
                    ) : paymentMethod === "va_mandiri" || paymentMethod === "va_bca" ? (
                      <div className="space-y-2.5 text-xs text-slate-750">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Detail Transfer Bank
                        </span>
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                          <span className="font-mono font-bold text-slate-800 text-sm tracking-wide">
                            {vaNumber || "Memuat..."}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(vaNumber)}
                            className="text-indigo-600 hover:text-indigo-800 p-1 flex items-center gap-0.5 cursor-pointer"
                            disabled={!vaNumber}
                          >
                            {copied ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-semibold">Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Gunakan kode di atas sebagai nomor Rekening Tujuan/Virtual Account untuk pembayaran SPP.
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-755 py-2 space-y-1">
                        <p className="font-semibold text-slate-800">GoPay Instant Checkout</p>
                        <p className="text-[10px] text-slate-500">
                          Klik tombol bayar di bawah untuk membuka aplikasi GoPay di ponsel Anda secara otomatis.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Pay Button */}
                <div className="px-6 py-5 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={handleSimulatePayment}
                    disabled={processingPayment || loadingPaymentCode || !!paymentError}
                    className="w-full bg-indigo-600 hover:bg-indigo-755 text-white font-extrabold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Memproses Pembayaran...</span>
                      </>
                    ) : (
                      <>
                        <span>Simulasikan Bayar Lunas</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
