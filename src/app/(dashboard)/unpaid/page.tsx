"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  AlertCircle,
  Calendar,
  Filter,
  Users,
  DollarSign,
  MessageCircle,
  FileSpreadsheet,
  CheckCircle2,
  TrendingDown,
  Layers,
  Sparkles
} from "lucide-react";
import { SCHOOL_UNITS, ALL_PRESET_CLASSES, getClassesByUnitId } from "@/lib/classConstants";

interface UnpaidStudent {
  id: number;
  studentNumber: string;
  name: string;
  className: string;
  schoolUnitId: number;
  schoolUnitName: string;
  parentName: string;
  parentPhoneNumber: string;
  parentEmail: string | null;
  invoiceType?: string;
  baseAmount?: number;
  discountApplied?: number;
  totalAmount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  status?: string;
  unpaidMonths: {
    month: number;
    status: string;
    totalAmount: number;
    unpaidAmount: number;
  }[];
  totalUnpaidAmount: number;
  totalUnpaidCount: number;
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

const INVOICE_TYPES = [
  { value: "SPP", label: "SPP Bulanan" },
  { value: "UANG_PENGEMBANGAN", label: "Uang Pengembangan" },
  { value: "EKSTRAKURIKULER", label: "Ekstrakurikuler" },
  { value: "DAFTAR_ULANG", label: "Daftar Ulang" },
  { value: "UANG_PERALATAN", label: "Uang Peralatan" },
  { value: "SERAGAM", label: "Uang Seragam" },
  { value: "FULLDAY", label: "Fullday Bulanan" },
];

export default function UnpaidPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [unpaidData, setUnpaidData] = useState<UnpaidStudent[]>([]);
  const [summary, setSummary] = useState({
    grandTotalUnpaidAmount: 0,
    grandTotalUnpaidMonthsCount: 0,
    totalStudentsCount: 0,
    totalStudentsUnpaidCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [filterInvoiceType, setFilterInvoiceType] = useState<string>("SPP");
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterUnitId, setFilterUnitId] = useState<string>(searchParams.get("schoolUnitId") || "all");
  const [filterClass, setFilterClass] = useState<string>(searchParams.get("className") || "");

  const isUnitAdmin = user?.role === "UNIT_ADMIN";
  const isWaliKelas = user?.role === "WALI_KELAS";

  const isMonthlyType = filterInvoiceType === "SPP" || filterInvoiceType === "FULLDAY";

  // Sync state if searchParams change
  useEffect(() => {
    const qUnitId = searchParams.get("schoolUnitId");
    const qClassName = searchParams.get("className");
    if (qUnitId) setFilterUnitId(qUnitId);
    if (qClassName) setFilterClass(qClassName);
  }, [searchParams]);

  const fetchUnpaidInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        invoiceType: filterInvoiceType,
        year: filterYear,
      };

      if (isMonthlyType) {
        params.upToMonth = filterMonth;
      }

      // Role boundary constraints passed as query params
      if (isWaliKelas) {
        params.schoolUnitId = user?.schoolUnitId;
        params.className = user?.className;
      } else if (isUnitAdmin) {
        params.schoolUnitId = user?.schoolUnitId;
        if (filterClass.trim()) params.className = filterClass.trim();
      } else {
        if (filterUnitId !== "all") params.schoolUnitId = Number(filterUnitId);
        if (filterClass.trim()) params.className = filterClass.trim();
      }

      const response = await api.get("/invoices/unpaid", { params });
      setUnpaidData(response.data.data.unpaidList || []);
      setSummary(response.data.data.summary || {
        grandTotalUnpaidAmount: 0,
        grandTotalUnpaidMonthsCount: 0,
        totalStudentsCount: 0,
        totalStudentsUnpaidCount: 0,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil daftar tunggakan siswa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnpaidInvoices();
  }, [filterInvoiceType, filterYear, filterMonth, filterUnitId, filterClass]);

  const getMonthName = (m: number) => {
    return MONTHS.find((item) => item.value === m)?.name || m.toString();
  };

  const getInvoiceTypeLabel = (val: string) => {
    return INVOICE_TYPES.find((t) => t.value === val)?.label || val;
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // WhatsApp reminder message builder
  const handleSendReminder = (student: UnpaidStudent) => {
    const rawPhoneNumber = student.parentPhoneNumber.trim();
    let formattedPhone = rawPhoneNumber.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.slice(1);
    }

    const typeLabel = getInvoiceTypeLabel(student.invoiceType || filterInvoiceType);
    let messageText = "";

    if (isMonthlyType) {
      const monthsText = student.unpaidMonths
        .map((item) => `${getMonthName(item.month)} ${filterYear}`)
        .join(", ");

      messageText = `Halo Bapak/Ibu ${student.parentName},

Mengingatkan kembali perihal tagihan *${typeLabel}* sekolah putra/putri Anda yang bernama *${student.name}* (Kelas ${student.className} - Unit ${student.schoolUnitName}).

Saat ini terdapat tunggakan ${typeLabel} untuk periode *${monthsText}* dengan total tagihan sebesar *${formatRupiah(student.totalUnpaidAmount)}*.

Pembayaran dapat segera diselesaikan di loket administrasi sekolah secara tunai, atau melalui transfer bank online. Jika Bapak/Ibu memerlukan kelonggaran waktu atau informasi detail, silakan hubungi bendahara sekolah.

Terima kasih atas perhatian dan kerja samanya.
_Sistem Keuangan Sekolah_`;
    } else {
      const totalAmountVal = student.totalAmount || student.totalUnpaidAmount;
      const paidVal = student.paidAmount || 0;
      const remainingVal = student.totalUnpaidAmount;

      const rincianText = paidVal > 0
        ? `• Total Biaya: *${formatRupiah(totalAmountVal)}*\n• Sudah Dibayar: *${formatRupiah(paidVal)}*\n• Sisa Tunggakan: *${formatRupiah(remainingVal)}*`
        : `• Total Tagihan: *${formatRupiah(remainingVal)}*`;

      messageText = `Halo Bapak/Ibu ${student.parentName},

Mengingatkan kembali perihal tagihan *${typeLabel}* putra/putri Anda yang bernama *${student.name}* (Kelas ${student.className} - Unit ${student.schoolUnitName}) Tahun ${filterYear}.

Rincian status pembayaran:
${rincianText}

Pembayaran dapat segera diselesaikan di loket administrasi sekolah secara tunai atau melalui transfer online. Jika Bapak/Ibu membutuhkan informasi mengenai cicilan atau konfirmasi pembayaran, silakan hubungi pihak sekolah.

Terima kasih atas perhatian dan kerja samanya.
_Sistem Keuangan Sekolah_`;
    }

    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;
    window.open(waUrl, "_blank");
  };

  // Client-side CSV export for unpaid list
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    const typeLabel = getInvoiceTypeLabel(filterInvoiceType);

    if (isMonthlyType) {
      headers = ["NIS", "Nama Siswa", "Kelas", "Unit", "Jenis Tagihan", "Nama Wali", "No HP Wali", "Bulan Menunggak", "Total Tunggakan"];
      rows = unpaidData.map((s) => [
        s.studentNumber,
        s.name,
        s.className,
        s.schoolUnitName,
        typeLabel,
        s.parentName,
        s.parentPhoneNumber,
        s.unpaidMonths.map((item) => getMonthName(item.month)).join(" | "),
        s.totalUnpaidAmount,
      ]);
    } else {
      headers = ["NIS", "Nama Siswa", "Kelas", "Unit", "Jenis Tagihan", "Nama Wali", "No HP Wali", "Total Biaya", "Sudah Terbayar", "Sisa Tunggakan", "Status"];
      rows = unpaidData.map((s) => [
        s.studentNumber,
        s.name,
        s.className,
        s.schoolUnitName,
        typeLabel,
        s.parentName,
        s.parentPhoneNumber,
        s.totalAmount || s.totalUnpaidAmount,
        s.paidAmount || 0,
        s.totalUnpaidAmount,
        s.status === "PARTIALLY_PAID" ? "Dicicil Sebagian" : "Belum Bayar",
      ]);
    }

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.map((val) => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Daftar_Tunggakan_${filterInvoiceType}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 relative text-xs pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-indigo-400" />
            Laporan Tunggakan Biaya Sekolah (Belum Bayar)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Data rekap siswa yang belum melunasi tagihan {getInvoiceTypeLabel(filterInvoiceType)}, rincian cicilan, serta pengiriman WhatsApp pengingat otomatis.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={unpaidData.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Export Daftar Tunggakan ({getInvoiceTypeLabel(filterInvoiceType)})
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analytics Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Nominal Tunggakan</p>
            <p className="text-lg font-black text-rose-400 tracking-tight">{formatRupiah(summary.grandTotalUnpaidAmount)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Siswa Menunggak</p>
            <p className="text-lg font-black text-white tracking-tight">
              {summary.totalStudentsUnpaidCount} <span className="text-xs text-slate-500 font-normal">/ {summary.totalStudentsCount} siswa</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              {isMonthlyType ? "Total Bulan Tunggakan" : "Jenis Tagihan"}
            </p>
            <p className="text-lg font-black text-amber-400 tracking-tight">
              {isMonthlyType ? `${summary.grandTotalUnpaidMonthsCount} bulan` : getInvoiceTypeLabel(filterInvoiceType)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            {isMonthlyType ? <Calendar className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tingkat Kelunasan</p>
            <p className="text-lg font-black text-emerald-400 tracking-tight">
              {summary.totalStudentsCount > 0
                ? Math.max(0, Math.round(((summary.totalStudentsCount - summary.totalStudentsUnpaidCount) / summary.totalStudentsCount) * 100))
                : 0}%
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Period Selection Box */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col lg:flex-row items-center justify-between gap-4 backdrop-blur-md">
        {/* Period and Type selection filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Jenis Tagihan Dropdown */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] text-slate-300 font-semibold">Jenis Tagihan:</span>
          </div>

          <select
            value={filterInvoiceType}
            onChange={(e) => setFilterInvoiceType(e.target.value)}
            className="bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 font-semibold px-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-indigo-400 transition-colors cursor-pointer"
          >
            {INVOICE_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-slate-900 text-white">
                {t.label}
              </option>
            ))}
          </select>

          {/* Month selector only for monthly bills (SPP / Fullday) */}
          {isMonthlyType ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Hingga:</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded-md border border-slate-800">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Tagihan Berkala / Tahunan</span>
            </div>
          )}

          {/* Year selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Tahun:</span>
            <input
              type="number"
              min="2000"
              max="9999"
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-slate-350 px-2 py-1.5 rounded-lg text-[11px] w-20 text-center focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* School unit / class filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-400">Filter Data:</span>
          </div>

          {/* Unit selection (Hidden for unit admin & homeroom teachers) */}
          {!isUnitAdmin && !isWaliKelas && (
            <select
              value={filterUnitId}
              onChange={(e) => {
                setFilterUnitId(e.target.value);
                setFilterClass(""); // Reset class when unit changes
              }}
              className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="all">Semua Unit</option>
              {SCHOOL_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.name}
                </option>
              ))}
            </select>
          )}

          {/* Class query dropdown (Hidden for Homeroom teacher bimbingan) */}
          {!isWaliKelas && (
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white px-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-indigo-500 transition-colors max-w-[180px]"
            >
              <option value="">Semua Kelas</option>
              {(filterUnitId !== "all"
                ? getClassesByUnitId(Number(filterUnitId))
                : ALL_PRESET_CLASSES
              ).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Unpaid Debts Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 animate-pulse">
              Menganalisis data tunggakan siswa untuk {getInvoiceTypeLabel(filterInvoiceType)}...
            </div>
          ) : unpaidData.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Luar biasa! Tidak ada data tunggakan {getInvoiceTypeLabel(filterInvoiceType)} ditemukan untuk periode filter ini.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="px-6 py-4">NIS</th>
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4">Unit / Kelas</th>
                  {isMonthlyType ? (
                    <>
                      <th className="px-6 py-4">Bulan Menunggak</th>
                      <th className="px-6 py-4">Total Tunggakan</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4">Total Biaya</th>
                      <th className="px-6 py-4">Sudah Terbayar</th>
                      <th className="px-6 py-4">Sisa Tunggakan</th>
                      <th className="px-6 py-4">Status</th>
                    </>
                  )}
                  <th className="px-6 py-4">Wali Murid</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-350">
                {unpaidData.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-800/10 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-medium text-slate-450">
                      {student.studentNumber}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {student.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 items-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                          {student.schoolUnitName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          Kelas {student.className}
                        </span>
                      </div>
                    </td>

                    {isMonthlyType ? (
                      <>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {student.unpaidMonths.map((item) => (
                              <span
                                key={item.month}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                                  item.status === "PARTIALLY_PAID"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}
                                title={item.status === "PARTIALLY_PAID" ? "Telah dicicil sebagian" : "Belum dibayar"}
                              >
                                {getMonthName(item.month)} {item.status === "PARTIALLY_PAID" ? " (Parsial)" : ""}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-rose-400 font-mono">
                          {formatRupiah(student.totalUnpaidAmount)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-300">
                          {formatRupiah(student.totalAmount || student.totalUnpaidAmount)}
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-emerald-400">
                          {formatRupiah(student.paidAmount || 0)}
                        </td>
                        <td className="px-6 py-4 font-mono font-extrabold text-rose-400">
                          {formatRupiah(student.totalUnpaidAmount)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              student.status === "PARTIALLY_PAID"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {student.status === "PARTIALLY_PAID" ? "Dicicil Sebagian" : "Belum Bayar"}
                          </span>
                        </td>
                      </>
                    )}

                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-300">{student.parentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">{student.parentPhoneNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleSendReminder(student)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
                        title="Kirim pengingat tagihan WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-white/10" />
                        <span>Kirim WA</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
