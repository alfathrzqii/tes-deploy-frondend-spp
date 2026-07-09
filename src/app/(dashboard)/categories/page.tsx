"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  AlertCircle,
  X,
  CheckCircle2
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  type: "INCOME" | "EXPENSE";
  schoolUnitId: number | null;
}

const SCHOOL_UNITS = [
  { id: 1, name: "KB" },
  { id: 2, name: "RA" },
  { id: 3, name: "SD" },
  { id: 4, name: "TPA" },
];

export default function CategoriesPage() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [formUnitId, setFormUnitId] = useState<string>("global"); // "global" or number string

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/categories");
      setCategories(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil data kategori keuangan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedCategory(null);
    setFormName("");
    setFormType("INCOME");
    // If UNIT_ADMIN, default unit is their own unit, otherwise "global"
    setFormUnitId(user?.role === "UNIT_ADMIN" ? String(user.schoolUnitId) : "global");
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setModalMode("edit");
    setSelectedCategory(category);
    setFormName(category.name);
    setFormType(category.type);
    setFormUnitId(category.schoolUnitId ? String(category.schoolUnitId) : "global");
    setIsModalOpen(false); // reset
    setTimeout(() => setIsModalOpen(true), 50);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formName.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }

    const payload = {
      name: formName.trim(),
      type: formType,
      schoolUnitId: formUnitId === "global" ? null : Number(formUnitId),
    };

    try {
      if (modalMode === "create") {
        const response = await api.post("/categories", payload);
        setSuccessMsg(response.data.message || "Kategori berhasil ditambahkan");
      } else if (modalMode === "edit" && selectedCategory) {
        // In backend, PUT payload contains { name, type } only. schoolUnitId is not modified.
        const response = await api.put(`/categories/${selectedCategory.id}`, {
          name: payload.name,
          type: payload.type,
        });
        setSuccessMsg(response.data.message || "Kategori berhasil diperbarui");
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan data kategori");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kategori keuangan ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/categories/${id}`);
      setSuccessMsg(response.data.message || "Kategori berhasil dihapus");
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus kategori");
    }
  };

  const getUnitName = (unitId: number | null) => {
    if (unitId === null) return "Global (Semua Unit)";
    return SCHOOL_UNITS.find((u) => u.id === unitId)?.name || `Unit ${unitId}`;
  };

  // Helper to check if user can modify a category
  const canModify = (category: Category) => {
    if (user?.role === "SUPER_ADMIN") return true;
    if (user?.role === "UNIT_ADMIN") {
      // UNIT_ADMIN can only edit categories that are explicitly linked to their unit
      return category.schoolUnitId === user.schoolUnitId;
    }
    return false;
  };

  return (
    <div className="space-y-6 relative">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-indigo-400" />
            Kategori Keuangan
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftar alokasi pos pemasukan dan pengeluaran dana sekolah.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Kategori
        </button>
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

      {/* Main Categories Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
              Memuat data kategori keuangan...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Tidak ada data kategori keuangan.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="px-6 py-4">Nama Kategori</th>
                  <th className="px-6 py-4">Tipe Transaksi</th>
                  <th className="px-6 py-4">Unit Sekolah</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="hover:bg-slate-800/10 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-white">
                      {category.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        category.type === "INCOME"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {category.type === "INCOME" ? "PEMASUKAN" : "PENGELUARAN"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                        category.schoolUnitId === null
                          ? "bg-slate-800/60 text-slate-300 border-slate-700/65"
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      }`}>
                        {getUnitName(category.schoolUnitId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canModify(category) ? (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openEditModal(category)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Edit Kategori"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Hapus Kategori"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">
                          Hanya Baca
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal CRUD Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-6">
              {modalMode === "create" ? "Tambah Kategori Keuangan" : "Edit Kategori Keuangan"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Name field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Nama Kategori</label>
                <input
                  type="text"
                  placeholder="Contoh: BOS, Gaji Guru, Operasional"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Type field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Tipe Transaksi</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as "INCOME" | "EXPENSE")}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="INCOME">PEMASUKAN (Income)</option>
                  <option value="EXPENSE">PENGELUARAN (Expense)</option>
                </select>
              </div>

              {/* Unit field (Only SUPER_ADMIN can configure global/unit, UNIT_ADMIN is locked) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Unit Sekolah</label>
                {user?.role === "SUPER_ADMIN" ? (
                  modalMode === "create" ? (
                    <select
                      value={formUnitId}
                      onChange={(e) => setFormUnitId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="global">Global (Semua Unit)</option>
                      {SCHOOL_UNITS.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          Unit {u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    // In edit mode, unit cannot be updated (restricted by backend API)
                    <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                      {getUnitName(selectedCategory?.schoolUnitId || null)}
                      <p className="text-[10px] text-slate-500 mt-1 italic">
                        Unit sekolah tidak dapat diubah setelah dibuat.
                      </p>
                    </div>
                  )
                ) : (
                  // Locked for UNIT_ADMIN
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                    {getUnitName(user?.schoolUnitId || null)}
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      Locked to your assigned unit.
                    </p>
                  </div>
                )}
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
                  {modalMode === "create" ? "Tambah Kategori" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
