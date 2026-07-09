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
  DollarSign,
  User,
  GraduationCap,
  Receipt,
  ArrowRight,
  Calculator,
  ChevronDown
} from "lucide-react";

interface Student {
  id: number;
  studentNumber: string;
  name: string;
  schoolUnitId: number;
  parentId: number;
  enrollmentYear: number;
  discountPercentage: number;
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

  // Find matching tariff when student is loaded
  useEffect(() => {
    if (foundStudent && tariffs.length > 0) {
      const tariff = tariffs.find(
        (t) =>
          t.schoolUnitId === foundStudent.schoolUnitId &&
          t.enrollmentYear === foundStudent.enrollmentYear
      );
      setMatchingTariff(tariff || null);
    } else {
      setMatchingTariff(null);
    }
  }, [foundStudent, tariffs]);

  // Adjust defaults when invoiceType changes
  useEffect(() => {
    if (!foundStudent) return;
    setError(null);
    setSuccessMsg(null);

    if (invoiceType === "SPP") {
      const net = getEstimatedAmount();
      setPaymentAmount(String(net));
    } else if (invoiceType === "UANG_PENGEMBANGAN") {
      // Find existing dev invoice
      const devInv = studentInvoices.find(inv => inv.invoiceType === "UANG_PENGEMBANGAN");
      if (devInv) {
        const paid = devInv.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const rem = devInv.amount - paid;
        setPaymentAmount(String(rem));
        setSelectedMonth(devInv.month);
        setSelectedYear(devInv.year);
      } else {
        setPaymentAmount("2000000"); // default building fee
        setSelectedMonth(7); // default seed month
        setSelectedYear(foundStudent.enrollmentYear);
      }
    }
  }, [invoiceType, foundStudent, studentInvoices, matchingTariff]);

  const handleSearchStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setFoundStudent(null);
    setReceiptData(null);
    setStudentInvoices([]);

    if (!nisQuery.trim()) {
      setError("Silakan masukkan Nomor Induk Siswa (NIS)");
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get("/students", {
        params: { search: nisQuery.trim() },
      });
      
      const studentsFound = response.data.data;
      const exactMatch = studentsFound.find(
        (s: Student) => s.studentNumber.toLowerCase() === nisQuery.trim().toLowerCase()
      );

      if (exactMatch) {
        // Multi-unit admin checks
        if (user?.role === "UNIT_ADMIN" && exactMatch.schoolUnitId !== user.schoolUnitId) {
          setError("Akses ditolak: Siswa ini terdaftar pada unit sekolah yang tidak berada di bawah otoritas Anda.");
        } else {
          setFoundStudent(exactMatch);
          
          // Fetch student invoices
          const invResponse = await api.get(`/invoices/student/${exactMatch.studentNumber}`);
          setStudentInvoices(invResponse.data.allInvoices || []);
        }
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
      setSuccessMsg(response.data.message || "Pembayaran tunai berhasil diproses");
      setReceiptData(response.data.data.invoice);
      
      // Refresh invoices
      const invResponse = await api.get(`/invoices/student/${foundStudent.studentNumber}`);
      setStudentInvoices(invResponse.data.allInvoices || []);
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

  // Calculate Net estimation
  const getEstimatedAmount = () => {
    if (!matchingTariff) return 0;
    const discount = foundStudent ? foundStudent.discountPercentage : 0;
    return matchingTariff.amount * (1 - discount / 100);
  };

  // Check selected month SPP invoice details
  const getSelectedSPPDetails = () => {
    const inv = studentInvoices.find(
      (i) => i.month === selectedMonth && i.year === selectedYear && i.invoiceType === "SPP"
    );
    if (!inv) return { status: "PENDING", alreadyPaid: 0, remaining: getEstimatedAmount() };
    const paid = inv.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return {
      status: inv.status,
      alreadyPaid: paid,
      remaining: inv.amount - paid,
      invoice: inv
    };
  };

  // Check development fund details
  const getDevFundDetails = () => {
    const inv = studentInvoices.find((i) => i.invoiceType === "UANG_PENGEMBANGAN");
    if (!inv) return { status: "PENDING", total: 2000000, alreadyPaid: 0, remaining: 2000000 };
    const paid = inv.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return {
      status: inv.status,
      total: inv.amount,
      alreadyPaid: paid,
      remaining: inv.amount - paid,
      invoice: inv
    };
  };

  const sppInfo = getSelectedSPPDetails();
  const devInfo = getDevFundDetails();

  const isCurrentSPPPaid = sppInfo.status === "PAID";
  const isDevFundPaid = devInfo.status === "PAID";

  return (
    <div className="space-y-6 relative text-xs">
      {/* Header Section */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-400" />
          Kasir Pembayaran Sekolah (Offline)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Formulir pelunasan tagihan SPP bulanan atau cicilan Uang Pengembangan siswa secara tunai di loket.
        </p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Layout Split: Left search/form, Right result receipt */}
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
                      NIS: {foundStudent.studentNumber}
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
                {foundStudent.discountPercentage > 0 && (
                  <div className="bg-amber-950/30 border border-amber-500/10 p-2.5 rounded-lg flex items-center gap-2 text-[10px] text-amber-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Siswa ini mendapatkan potongan tarif SPP sebesar <b>{foundStudent.discountPercentage}%</b>.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Payment Parameters & Submit */}
          {foundStudent && (
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-md animate-fade-in">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 font-bold text-xs">
                  2
                </span>
                Rincian Transaksi Pembayaran
              </h2>

              <form onSubmit={handleProcessPayment} className="space-y-4">
                
                {/* Select Invoice Type */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Jenis Tagihan Keuangan</label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SPP">SPP Bulanan (SPP)</option>
                    <option value="UANG_PENGEMBANGAN">Uang Pengembangan (Bisa Dicicil)</option>
                  </select>
                </div>

                {invoiceType === "SPP" ? (
                  /* SPP Mode Input fields */
                  <div className="grid grid-cols-2 gap-4">
                    {/* Select Month */}
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> Bulan Tagihan
                      </label>
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

                    {/* Select Year */}
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> Tahun Tagihan
                      </label>
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
                  /* Uang Pengembangan Mode Info block */
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg space-y-1.5">
                    <p className="font-bold text-slate-300">Konfigurasi Uang Pengembangan</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Sesuai kebijakan unit sekolah, Uang Pengembangan diset secara default sebesar Rp 2.000.000 untuk angkatan baru dan dapat dicicil beberapa kali sesuai kesanggupan orang tua.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-center font-mono">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase">Tagihan</p>
                        <p className="font-bold text-white">{formatRupiah(devInfo.total)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase">Sudah Dibayar</p>
                        <p className="font-bold text-emerald-400">{formatRupiah(devInfo.alreadyPaid)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase">Sisa Tagihan</p>
                        <p className="font-bold text-rose-400">{formatRupiah(devInfo.remaining)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Payment Amount Input */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-slate-500" /> Nominal Pembayaran Saat Ini (Tunai)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-bold font-mono">Rp</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-mono font-bold"
                      placeholder="Masukkan nominal uang..."
                      disabled={invoiceType === "SPP"} // SPP is fixed based on tariff/discount
                    />
                  </div>
                  {invoiceType === "SPP" && (
                    <span className="text-[9px] text-slate-550 block italic">Nominal SPP terkunci otomatis sesuai tarif dasar unit & persentase diskon siswa.</span>
                  )}
                </div>

                {/* Status and summary details */}
                <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3">
                  {invoiceType === "SPP" ? (
                    <>
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>Status SPP Bulan Terpilih</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          sppInfo.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : sppInfo.status === "PARTIALLY_PAID"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {sppInfo.status === "PAID" ? "Lunas" : sppInfo.status === "PARTIALLY_PAID" ? "Dicicil" : "Belum Dibayar"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>Tarif Dasar SPP Angkatan</span>
                        <span className="font-semibold text-white">
                          {matchingTariff ? formatRupiah(matchingTariff.amount) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>Potongan Diskon ({foundStudent.discountPercentage}%)</span>
                        <span className="font-semibold text-amber-400">
                          {matchingTariff
                            ? `-${formatRupiah((matchingTariff.amount * foundStudent.discountPercentage) / 100)}`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-900 pt-2.5">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-indigo-400" /> Bersih yang Dibayarkan
                        </span>
                        <span className="text-base font-extrabold text-indigo-400">
                          {matchingTariff ? formatRupiah(getEstimatedAmount()) : "N/A"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>Status Uang Pengembangan</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          devInfo.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : devInfo.status === "PARTIALLY_PAID"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {devInfo.status === "PAID" ? "Lunas" : devInfo.status === "PARTIALLY_PAID" ? "Dicicil Sebagian" : "Belum Dibayar"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-900 pt-2.5">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-indigo-400" /> Sisa Tunggakan Uang Pengembangan
                        </span>
                        <span className="text-base font-extrabold text-indigo-400">
                          {formatRupiah(devInfo.remaining)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Process Button */}
                <button
                  type="submit"
                  disabled={
                    submitLoading || 
                    (invoiceType === "SPP" ? (!matchingTariff || isCurrentSPPPaid) : isDevFundPaid) ||
                    Number(paymentAmount) <= 0
                  }
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white py-2.5 rounded-lg font-bold text-xs transition-all shadow-lg shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>
                        {invoiceType === "SPP" 
                          ? (isCurrentSPPPaid ? "Tagihan SPP Sudah Lunas" : "Proses Pembayaran SPP") 
                          : (isDevFundPaid ? "Uang Pengembangan Sudah Lunas" : "Proses Bayar Cicilan")}
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
              {/* Decorative Receipt Cut line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

              <div className="text-center space-y-2 pb-5 border-b border-slate-800/50">
                <Receipt className="w-8 h-8 text-indigo-400 mx-auto" />
                <h3 className="text-sm font-extrabold text-white tracking-wide">
                  KUITANSI TRANSAKSI SEKOLAH
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none">
                  KASIR TUNAI OFFLINE ({receiptData.status === "PAID" ? "LUNAS" : "TERCICIL"})
                </p>
              </div>

              {/* Receipt Fields */}
              <div className="space-y-3.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Invoice ID</span>
                  <span className="font-mono font-bold text-white">#INV-{receiptData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Siswa</span>
                  <span className="font-semibold text-slate-300">{foundStudent?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIS Siswa</span>
                  <span className="font-mono text-slate-300">{foundStudent?.studentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Sekolah</span>
                  <span className="font-semibold text-slate-300">
                    {foundStudent ? getUnitName(foundStudent.schoolUnitId) : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis Tagihan</span>
                  <span className="font-semibold text-white font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/15">
                    {receiptData.invoiceType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Periode Tagihan</span>
                  <span className="font-semibold text-white">
                    {MONTHS.find((m) => m.value === receiptData.month)?.name} {receiptData.year}
                  </span>
                </div>
                
                <div className="border-t border-slate-900 pt-3 flex justify-between">
                  <span className="text-slate-500">Tarif / Total Tagihan</span>
                  <span className="text-slate-350">{formatRupiah(receiptData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Pembayaran</span>
                  <span className={`font-bold ${receiptData.status === "PAID" ? "text-emerald-400" : "text-amber-400"}`}>
                    {receiptData.status === "PAID" ? "Lunas" : "Sebagian (Cicilan)"}
                  </span>
                </div>
                
                <div className="border-t border-slate-900 pt-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200 uppercase">Uang Tunai Diterima</span>
                  <span className="text-sm font-extrabold text-emerald-400">{formatRupiah(Number(paymentAmount))}</span>
                </div>
              </div>

              {/* Print action or restart */}
              <div className="pt-4 border-t border-slate-800/50 flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-800/20 transition-all text-center cursor-pointer"
                >
                  Cetak Kuitansi
                </button>
                <button
                  onClick={() => {
                    setFoundStudent(null);
                    setReceiptData(null);
                    setNisQuery("");
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all text-center cursor-pointer"
                >
                  Transaksi Baru
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/20 border border-slate-800/50 border-dashed p-12 rounded-2xl text-center text-slate-650 flex flex-col items-center justify-center h-full min-h-[300px]">
              <Receipt className="w-12 h-12 text-slate-700 mb-3" />
              <p className="font-semibold text-slate-500">Kuitansi Pembayaran</p>
              <p className="text-[10px] text-slate-600 max-w-xs mt-1 leading-normal">
                Cari siswa berdasarkan NIS dan tentukan jenis pembayaran untuk mencatat transaksi serta mencetak kuitansi resmi.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
