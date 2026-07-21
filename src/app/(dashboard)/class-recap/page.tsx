"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import {
  Calendar,
  Filter,
  DollarSign,
  TrendingDown,
  ChevronRight,
  FileSpreadsheet,
  AlertCircle,
  FolderOpen,
  PieChart,
  Grid
} from "lucide-react";

interface ClassRecap {
  className: string;
  schoolUnitId: number;
  schoolUnitName?: string;
  schoolUnit?: string;
  totalStudents: number;
  unpaidStudentsCount: number;
  totalUnpaidMonths: number;
  totalUnpaidAmount?: number;
  totalUnpaidNominal?: number;
}

const getRecapNominal = (c: ClassRecap) => Number(c.totalUnpaidAmount ?? c.totalUnpaidNominal ?? 0);
const getRecapUnitName = (c: ClassRecap) => c.schoolUnitName || c.schoolUnit || "-";

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

import { SCHOOL_UNITS } from "@/lib/classConstants";

export default function ClassRecapPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [recapData, setRecapData] = useState<ClassRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterUnitId, setFilterUnitId] = useState<string>("all");

  const isUnitAdmin = user?.role === "UNIT_ADMIN";
  const isWaliKelas = user?.role === "WALI_KELAS";

  const fetchClassRecap = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        year: filterYear,
        upToMonth: filterMonth,
      };

      if (isWaliKelas || isUnitAdmin) {
        params.schoolUnitId = user?.schoolUnitId;
      } else if (filterUnitId !== "all") {
        params.schoolUnitId = Number(filterUnitId);
      }

      const response = await api.get("/invoices/class-recap", { params });
      setRecapData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil rekap SPP per kelas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassRecap();
  }, [filterYear, filterMonth, filterUnitId]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  // Client-side CSV export of class recap
  const handleExportCsv = () => {
    const headers = ["Unit Sekolah", "Kelas", "Total Siswa", "Siswa Menunggak", "Total Bulan Tunggakan", "Total Nominal Tunggakan"];
    const rows = recapData.map(c => [
      getRecapUnitName(c),
      c.className,
      c.totalStudents,
      c.unpaidStudentsCount,
      c.totalUnpaidMonths,
      getRecapNominal(c)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Tunggakan_Kelas_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate totals
  const totalClasses = recapData.length;
  const classesWithUnpaid = recapData.filter(c => c.unpaidStudentsCount > 0).length;
  const totalUnpaidMonths = recapData.reduce((sum, c) => sum + c.totalUnpaidMonths, 0);
  const totalUnpaidAmount = recapData.reduce((sum, c) => sum + getRecapNominal(c), 0);

  // Navigate to detailed unpaid list prefilled for that class
  const handleViewClassDetail = (className: string, schoolUnitId: number) => {
    // Save filters to session storage or pass via router query
    navigate(`/unpaid?schoolUnitId=${schoolUnitId}&className=${encodeURIComponent(className)}`);
  };

  return (
    <div className="space-y-6 relative text-xs">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-400" />
            Rekap Tunggakan per Kelas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persentase dan nominal tunggakan siswa yang dikelompokkan per kelas (bolongnya berapa bulan).
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={recapData.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Export Rekap Kelas
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Kelas</p>
            <p className="text-lg font-black text-white tracking-tight">{totalClasses} kelas</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-850 text-slate-400">
            <Grid className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Kelas Belum Lunas</p>
            <p className="text-lg font-black text-rose-450 tracking-tight">
              {classesWithUnpaid} <span className="text-xs text-slate-500 font-normal">/ {totalClasses} kelas</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Bulan Bolong</p>
            <p className="text-lg font-black text-amber-400 tracking-tight">{totalUnpaidMonths} bulan</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Nominal Tunggakan</p>
            <p className="text-lg font-black text-indigo-400 tracking-tight">{formatRupiah(totalUnpaidAmount)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Period Selection Box */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
        
        {/* Period Selection */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-400">Hingga Periode:</span>
          </div>

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

          <input
            type="number"
            min="2000"
            max="9999"
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-slate-350 px-2 py-1.5 rounded-lg text-[11px] w-20 text-center focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Unit selection filter */}
        {!isWaliKelas && !isUnitAdmin && (
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-400">Filter Unit:</span>
            <select
              value={filterUnitId}
              onChange={(e) => setFilterUnitId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="all">Semua Unit</option>
              {SCHOOL_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Class Recap Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 animate-pulse">
              Memproses rekapitulasi kelas...
            </div>
          ) : recapData.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Tidak ada data kelas bimbingan ditemukan.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="px-6 py-4">Unit Sekolah</th>
                  <th className="px-6 py-4">Nama Kelas</th>
                  <th className="px-6 py-4">Total Siswa</th>
                  <th className="px-6 py-4">Siswa Menunggak</th>
                  <th className="px-6 py-4">Bulan Bolong (Total)</th>
                  <th className="px-6 py-4">Total Tunggakan (IDR)</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-350">
                {recapData.map((row) => {
                  const unpaidRatio = row.totalStudents > 0 ? (row.unpaidStudentsCount / row.totalStudents) * 100 : 0;
                  return (
                    <tr
                      key={`${row.schoolUnitId}-${row.className}`}
                      className="hover:bg-slate-800/10 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Unit {getRecapUnitName(row)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        Kelas {row.className}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-300">
                        {row.totalStudents} siswa
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`font-semibold ${row.unpaidStudentsCount > 0 ? "text-rose-455" : "text-slate-500"}`}>
                            {row.unpaidStudentsCount} siswa ({Math.round(unpaidRatio)}%)
                          </span>
                          {row.unpaidStudentsCount > 0 && (
                            <div className="w-24 h-1 bg-slate-950 rounded overflow-hidden">
                              <div 
                                className="h-full bg-rose-500 rounded" 
                                style={{ width: `${unpaidRatio}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-amber-450">
                        {row.totalUnpaidMonths} bulan
                      </td>
                      <td className="px-6 py-4 font-mono font-extrabold text-rose-400">
                        {formatRupiah(getRecapNominal(row))}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewClassDetail(row.className, row.schoolUnitId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer group"
                        >
                          <span>Detail Tunggakan</span>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
