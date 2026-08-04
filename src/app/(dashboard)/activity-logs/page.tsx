"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  History,
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
  User as UserIcon,
  Globe
} from "lucide-react";
import RouteGuard from "@/components/RouteGuard";

interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  description: string;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    role: string;
    email: string | null;
  };
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (currentPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        limit: 25,
      };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (actionFilter) {
        params.action = actionFilter;
      }

      const response = await api.get("/activity-logs", { params });
      setLogs(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil log aktivitas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    setPage(1);
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchLogs(newPage);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATE")) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (action.includes("UPDATE")) return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    if (action.includes("DELETE")) return "bg-red-500/10 text-red-400 border border-red-500/20";
    return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "UNIT_ADMIN":
        return "Admin Unit";
      case "WALI_KELAS":
        return "Wali Kelas";
      case "PARENT":
        return "Wali Murid";
      default:
        return role;
    }
  };

  return (
    <RouteGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Log Aktivitas Pengguna
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Catatan riwayat audit tindakan administratif penting yang dilakukan di dalam sistem.
            </p>
          </div>

          <button
            onClick={() => fetchLogs(page)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-450" : ""}`} />
            Refresh Log
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-400 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters and search area */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari berdasarkan tindakan, nama, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-20 py-2 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-md text-[10px] font-semibold border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              Cari
            </button>
          </form>

          {/* Action Filter */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-400">Filter Tipe Aksi:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Semua Aksi</option>
              <option value="CREATE_TRANSACTION">Create Transaksi</option>
              <option value="UPDATE_TRANSACTION">Update Transaksi</option>
              <option value="DELETE_TRANSACTION">Delete Transaksi</option>
              <option value="CREATE_STUDENT">Create Siswa</option>
              <option value="UPDATE_STUDENT">Update Siswa</option>
              <option value="DELETE_STUDENT">Delete Siswa</option>
              <option value="CREATE_USER">Create User</option>
              <option value="UPDATE_USER">Update User</option>
              <option value="DELETE_USER">Delete User</option>
              <option value="CREATE_SPP_TARIFF">Create Tarif SPP</option>
              <option value="UPDATE_SPP_TARIFF">Update Tarif SPP</option>
              <option value="DELETE_SPP_TARIFF">Delete Tarif SPP</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            {loading && logs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 animate-pulse">
                Memuat data log aktivitas...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Tidak ada log aktivitas yang ditemukan.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4">Aktor / Pengguna</th>
                    <th className="px-6 py-4">Tipe Aksi</th>
                    <th className="px-6 py-4">Deskripsi Aktivitas</th>
                    <th className="px-6 py-4">Alamat IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-350">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-medium">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{log.user?.name || "Sistem"}</div>
                            <div className="text-[9px] text-indigo-400">{getRoleLabel(log.user?.role || "")}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-normal text-slate-200">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-slate-500" />
                          {log.ipAddress || "Local/WebHook"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-800/60 bg-slate-950/20 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-md text-[10px] font-semibold text-slate-350 disabled:opacity-50 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-md text-[10px] font-semibold text-slate-350 disabled:opacity-50 cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
