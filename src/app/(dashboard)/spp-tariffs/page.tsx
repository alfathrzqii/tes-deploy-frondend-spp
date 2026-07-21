"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  AlertCircle,
  X,
  CheckCircle2
} from "lucide-react";

interface SppTariff {
  id: number;
  schoolUnitId: number;
  enrollmentYear: number;
  amount: number;
}

const SCHOOL_UNITS = [
  { id: 1, name: "KB" },
  { id: 2, name: "RA" },
  { id: 3, name: "SD" },
  { id: 4, name: "TPA" },
];

export default function SppTariffsPage() {
  const { user } = useAuthStore();
  const [tariffs, setTariffs] = useState<SppTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTariff, setSelectedTariff] = useState<SppTariff | null>(null);

  // Form Fields
  const [formUnitId, setFormUnitId] = useState<number>(1);
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formAmount, setFormAmount] = useState<string>("");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isUnitAdmin = user?.role === "UNIT_ADMIN";
  const canManage = isSuperAdmin || isUnitAdmin;

  const fetchTariffs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/spp-tariffs");
      setTariffs(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil daftar tarif SPP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, []);

  const openCreateModal = () => {
    if (!canManage) return;
    setModalMode("create");
    setSelectedTariff(null);
    setFormUnitId(1);
    setFormYear(new Date().getFullYear());
    setFormAmount("");
    setIsModalOpen(true);
  };

  const openEditModal = (tariff: SppTariff) => {
    if (!canManage) return;
    setModalMode("edit");
    setSelectedTariff(tariff);
    setFormUnitId(tariff.schoolUnitId);
    setFormYear(tariff.enrollmentYear);
    setFormAmount(String(tariff.amount));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setSuccessMsg(null);

    const amountNum = Number(formAmount);
    if (!formAmount || isNaN(amountNum) || amountNum <= 0) {
      setError("Nominal tarif SPP harus berupa angka positif");
      return;
    }

    try {
      const payload = {
        schoolUnitId: formUnitId,
        enrollmentYear: formYear,
        amount: amountNum,
      };

      if (modalMode === "create") {
        const response = await api.post("/spp-tariffs", payload);
        setSuccessMsg(response.data.message || "Tarif SPP berhasil ditambahkan");
      } else if (modalMode === "edit" && selectedTariff) {
        const response = await api.put(`/spp-tariffs/${selectedTariff.id}`, payload);
        setSuccessMsg(response.data.message || "Tarif SPP berhasil diperbarui");
      }
      setIsModalOpen(false);
      fetchTariffs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan tarif SPP");
    }
  };

  const handleDelete = async (id: number) => {
    if (!canManage) return;
    if (!confirm("Apakah Anda yakin ingin menghapus tarif SPP ini? Siswa yang terdaftar pada angkatan ini mungkin akan terdampak.")) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/spp-tariffs/${id}`);
      setSuccessMsg(response.data.message || "Tarif SPP berhasil dihapus");
      fetchTariffs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus tarif SPP");
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

  return (
    <div className="space-y-6 relative">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-400" />
            Master Tarif SPP
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftar harga nominal tarif bulanan SPP per angkatan tahun masuk dan unit sekolah.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Tarif SPP
          </button>
        )}
      </div>

      {/* Feedback Alerts */}
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

      {/* Main Tariffs Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
              Memuat data tarif dasar SPP...
            </div>
          ) : tariffs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Tidak ada data konfigurasi tarif dasar SPP.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="px-6 py-4">Unit Sekolah</th>
                  <th className="px-6 py-4">Tahun Angkatan</th>
                  <th className="px-6 py-4">Tarif Bulanan</th>
                  {isSuperAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {tariffs.map((tariff) => (
                  <tr
                    key={tariff.id}
                    className="hover:bg-slate-800/10 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-white">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        {getUnitName(tariff.schoolUnitId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-300">
                      Angkatan {tariff.enrollmentYear}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {formatRupiah(tariff.amount)}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openEditModal(tariff)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Edit Tarif"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tariff.id)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Hapus Tarif"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal CRUD Dialog */}
      {isModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-6">
              {modalMode === "create" ? "Konfigurasi Tarif SPP Baru" : "Edit Nominal Tarif SPP"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Unit field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Unit Sekolah</label>
                {modalMode === "create" ? (
                  <select
                    value={formUnitId}
                    onChange={(e) => setFormUnitId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {SCHOOL_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                    {getUnitName(formUnitId)}
                  </div>
                )}
              </div>

              {/* Enrollment Year field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Tahun Angkatan</label>
                {modalMode === "create" ? (
                  <input
                    type="number"
                    min="2000"
                    max="9999"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                    Angkatan {formYear}
                  </div>
                )}
              </div>

              {/* Amount field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Tarif Bulanan (IDR)</label>
                <input
                  type="number"
                  placeholder="Contoh: 150000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md shadow-indigo-500/10 transition-colors"
                >
                  {modalMode === "create" ? "Tambah Tarif" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
