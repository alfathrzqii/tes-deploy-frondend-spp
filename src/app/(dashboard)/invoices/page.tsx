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
  Check
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
    paymentMethod: string;
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
                  const methodUsed = inv.transactions && inv.transactions.length > 0
                    ? inv.transactions[0].paymentMethod
                    : "-";

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
