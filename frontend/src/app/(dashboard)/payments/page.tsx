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
  ArrowRight
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
    email: string;
  };
}

interface SppTariff {
  id: number;
  schoolUnitId: number;
  enrollmentYear: number;
  amount: number;
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
  { value: 10, name: "Oktobeer" }, // typo matches standard backend/indo spelling or we keep standard
  { value: 11, name: "November" },
  { value: 12, name: "Desember" },
];

const SCHOOL_UNITS = [
  { id: 1, name: "RA/KB" },
  { id: 2, name: "TK" },
  { id: 3, name: "SD" },
];

export default function PaymentsPage() {
  const { user } = useAuthStore();
  
  // Search state
  const [nisQuery, setNisQuery] = useState("");
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [tariffs, setTariffs] = useState<SppTariff[]>([]);
  const [matchingTariff, setMatchingTariff] = useState<SppTariff | null>(null);
  
  // Payment states
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
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

  const handleSearchStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setFoundStudent(null);
    setReceiptData(null);

    if (!nisQuery.trim()) {
      setError("Silakan masukkan Nomor Induk Siswa (NIS)");
      return;
    }

    setSearchLoading(true);
    try {
      // Find student using search param matching NIS
      const response = await api.get("/students", {
        params: { search: nisQuery.trim() },
      });
      
      const studentsFound = response.data.data;
      // Find exact NIS match
      const exactMatch = studentsFound.find(
        (s: Student) => s.studentNumber.toLowerCase() === nisQuery.trim().toLowerCase()
      );

      if (exactMatch) {
        // Multi-unit admin checks
        if (user?.role === "UNIT_ADMIN" && exactMatch.schoolUnitId !== user.schoolUnitId) {
          setError("Akses ditolak: Siswa ini terdaftar pada unit sekolah yang tidak berada di bawah otoritas Anda.");
        } else {
          setFoundStudent(exactMatch);
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
        invoiceType: "SPP",
      };

      const response = await api.post("/invoices/pay-offline", payload);
      setSuccessMsg(response.data.message || "Pembayaran tunai SPP offline berhasil diproses");
      setReceiptData(response.data.data.invoice);
      
      // Keep student details but reset lookup query to allow further logging
      // setNisQuery("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal memproses pembayaran SPP");
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

  return (
    <div className="space-y-6 relative">
      {/* Header Section */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-400" />
          Pembayaran SPP Tunai (Offline)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Formulir pencatatan pelunasan tagihan SPP bulanan siswa secara tunai di loket administrasi sekolah.
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
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-md text-xs">
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
                    <p className="text-[10px] font-mono text-slate-500">
                      NIS: {foundStudent.studentNumber}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                    {getUnitName(foundStudent.schoolUnitId)}
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
                      {foundStudent.parent.name}
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
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-md text-xs animate-fade-in">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 font-bold text-xs">
                  2
                </span>
                Tentukan Periode SPP
              </h2>

              <form onSubmit={handleProcessPayment} className="space-y-4">
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

                {/* Estimate amount summary box */}
                <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3">
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
                </div>

                {/* Process Button */}
                <button
                  type="submit"
                  disabled={submitLoading || !matchingTariff}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white py-2.5 rounded-lg font-bold text-xs transition-all shadow-lg shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Proses Pembayaran Tunai</span>
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
                  RESI PEMBAYARAN SPP
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none">
                  Tagihan Tunai Offline Lunas
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
                  <span className="text-slate-500">Unit Pendidikan</span>
                  <span className="font-semibold text-slate-300">
                    {foundStudent ? getUnitName(foundStudent.schoolUnitId) : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bulan Periode</span>
                  <span className="font-semibold text-white">
                    {MONTHS.find((m) => m.value === receiptData.month)?.name} {receiptData.year}
                  </span>
                </div>
                
                <div className="border-t border-slate-900 pt-3 flex justify-between">
                  <span className="text-slate-500">Tarif Dasar SPP</span>
                  <span className="text-slate-300">{formatRupiah(receiptData.baseAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Potongan Diskon</span>
                  <span className="text-amber-500">-{formatRupiah(receiptData.discountApplied)}</span>
                </div>
                
                <div className="border-t border-slate-900 pt-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">TOTAL BAYAR (LUNAS)</span>
                  <span className="text-sm font-extrabold text-emerald-400">{formatRupiah(receiptData.amount)}</span>
                </div>
              </div>

              {/* Print action or restart */}
              <div className="pt-4 border-t border-slate-800/50 flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-800/20 transition-all text-center cursor-pointer"
                >
                  Cetak Resi
                </button>
                <button
                  onClick={() => {
                    setFoundStudent(null);
                    setReceiptData(null);
                    setNisQuery("");
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all text-center cursor-pointer"
                >
                  Bayar Baru
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/20 border border-slate-800/50 border-dashed p-12 rounded-2xl text-center text-slate-600 text-xs flex flex-col items-center justify-center h-full min-h-[300px]">
              <Receipt className="w-12 h-12 text-slate-700 mb-3" />
              <p className="font-semibold text-slate-500">Resi Pembayaran SPP</p>
              <p className="text-[10px] text-slate-600 max-w-xs mt-1">
                Lakukan pencarian siswa dan selesaikan pemrosesan transaksi pembayaran tunai untuk menerbitkan lembar resi kuitansi.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
