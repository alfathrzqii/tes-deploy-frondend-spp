"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Search,
  AlertCircle,
  X,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  Shield,
  KeyRound
} from "lucide-react";
import RouteGuard from "@/components/RouteGuard";

interface UserItem {
  id: number;
  name: string;
  email: string | null;
  phoneNumber: string;
  role: "SUPER_ADMIN" | "UNIT_ADMIN" | "WALI_KELAS" | "PARENT";
  schoolUnitId: number | null;
  className: string | null;
  schoolUnit?: {
    name: string;
  } | null;
}

const SCHOOL_UNITS = [
  { id: 1, name: "KB" },
  { id: 2, name: "RA" },
  { id: 3, name: "SD" },
  { id: 4, name: "TPA" },
];

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "UNIT_ADMIN", label: "Admin Unit Sekolah" },
  { value: "WALI_KELAS", label: "Wali Kelas" },
  { value: "PARENT", label: "Orang Tua / Wali Murid" },
];

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"SUPER_ADMIN" | "UNIT_ADMIN" | "WALI_KELAS" | "PARENT">("WALI_KELAS");
  const [formUnitId, setFormUnitId] = useState<string>("global"); // "global" or number string
  const [formClass, setFormClass] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (roleFilter !== "all") {
        params.role = roleFilter;
      }
      const response = await api.get("/users", { params });
      
      let data: UserItem[] = response.data.data;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        data = data.filter(u => 
          u.name.toLowerCase().includes(query) || 
          u.phoneNumber.includes(query) || 
          (u.email && u.email.toLowerCase().includes(query))
        );
      }
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil daftar data pengguna");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedUser(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("WALI_KELAS");
    setFormUnitId("global");
    setFormClass("");
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setModalMode("edit");
    setSelectedUser(user);
    setFormName(user.name);
    setFormPhone(user.phoneNumber);
    setFormEmail(user.email || "");
    setFormPassword(""); // Password empty by default on edit
    setFormRole(user.role);
    setFormUnitId(user.schoolUnitId ? String(user.schoolUnitId) : "global");
    setFormClass(user.className || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formName.trim() || !formPhone.trim() || (modalMode === "create" && !formPassword.trim())) {
      setError("Nama lengkap, No HP aktif, dan Kata Sandi wajib diisi");
      return;
    }

    const payload: any = {
      name: formName.trim(),
      email: formEmail.trim() || null,
      phoneNumber: formPhone.trim(),
      role: formRole,
      schoolUnitId: formUnitId === "global" ? null : Number(formUnitId),
      className: formRole === "WALI_KELAS" ? formClass.trim() : null,
    };

    if (formPassword.trim()) {
      payload.password = formPassword;
    }

    try {
      if (modalMode === "create") {
        const response = await api.post("/users", payload);
        setSuccessMsg(response.data.message || "Akun baru berhasil didaftarkan");
      } else if (modalMode === "edit" && selectedUser) {
        const response = await api.put(`/users/${selectedUser.id}`, payload);
        setSuccessMsg(response.data.message || "Data akun berhasil diperbarui");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan data pengguna");
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) {
      alert("Anda tidak diizinkan menghapus akun Anda sendiri yang sedang aktif digunakan.");
      return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus akun pengguna ini? Tindakan ini dapat memutus relasi data murid terkait.")) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/users/${id}`);
      setSuccessMsg(response.data.message || "Akun pengguna berhasil dihapus");
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus akun pengguna");
    }
  };

  const getUnitName = (unitId: number | null) => {
    if (unitId === null) return "";
    return SCHOOL_UNITS.find((u) => u.id === unitId)?.name || `Unit ${unitId}`;
  };

  const getRoleLabel = (role: string) => {
    return ROLES.find((r) => r.value === role)?.label || role;
  };

  // Client-side CSV export of users list
  const handleExportCsv = () => {
    const headers = ["Nama Pengguna", "Nomor HP (ID Login)", "Email", "Peran/Role", "Unit Otoritas", "Kelas Bimbingan"];
    const rows = users.map(u => [
      u.name,
      u.phoneNumber,
      u.email || "",
      getRoleLabel(u.role),
      getUnitName(u.schoolUnitId) || "Global (Semua Unit)",
      u.className || ""
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Daftar_Pengguna_Sekolah_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RouteGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="space-y-6 relative text-xs">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Manajemen Pengguna (Akun)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Konfigurasi akun Administrator, Wali Kelas (disertai pembagian kelas), dan akun Wali Murid.
            </p>
          </div>

          <div className="flex gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportCsv}
              disabled={users.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export CSV
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Akun Baru
            </button>
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg text-xs text-emerald-400 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-400 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters and search area */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
          {/* Search Bar Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari akun berdasarkan nama, no hp, atau email..."
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

          {/* Role Filter */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-400">Filter Peran:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="all">Semua Peran</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-500 animate-pulse">
                Memuat data pengguna...
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Tidak ada data akun pengguna ditemukan.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-6 py-4">Nama Lengkap</th>
                    <th className="px-6 py-4">No. HP (ID Login)</th>
                    <th className="px-6 py-4">Alamat Email</th>
                    <th className="px-6 py-4">Peran (Role)</th>
                    <th className="px-6 py-4">Unit Otoritas / Kelas</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-350">
                  {users.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/10 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-white">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {item.phoneNumber}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {item.email || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.role === "SUPER_ADMIN"
                            ? "bg-red-500/10 text-red-400 border-red-500/15"
                            : item.role === "UNIT_ADMIN"
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15"
                            : item.role === "WALI_KELAS"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/15"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {getRoleLabel(item.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.schoolUnitId ? (
                          <div className="flex gap-1.5 items-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                              Unit {getUnitName(item.schoolUnitId)}
                            </span>
                            {item.className && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                Kelas {item.className}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">
                            Global (Akses Yayasan)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit Akun / Reset Password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {item.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create/Edit Modal Dialog */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-base font-bold text-white mb-6">
                {modalMode === "create" ? "Tambah Akun Pengguna Baru" : "Edit Profil Akun"}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Full name field */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Contoh: Nur Hidayat, S.Pd"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Phone number field */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Nomor Handphone (ID Login)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812345678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Email (Opsional)</label>
                  <input
                    type="email"
                    placeholder="nama@sekolah.sch.id"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-355 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                    {modalMode === "create" ? "Kata Sandi Akun" : "Ganti Kata Sandi (Kosongkan jika tidak diubah)"}
                  </label>
                  <input
                    type="password"
                    placeholder={modalMode === "create" ? "••••••••" : "Isi hanya jika ingin mereset password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Role field */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Hak Akses / Peran (Role)</label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const selected = e.target.value as any;
                      setFormRole(selected);
                      if (selected === "SUPER_ADMIN" || selected === "PARENT") {
                        setFormUnitId("global");
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional school unit field */}
                {(formRole === "WALI_KELAS" || formRole === "UNIT_ADMIN") && (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">Pilih Unit Otoritas</label>
                    <select
                      value={formUnitId}
                      onChange={(e) => setFormUnitId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="global" disabled>Pilih Unit Sekolah...</option>
                      {SCHOOL_UNITS.map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Conditional class field for WALI_KELAS */}
                {formRole === "WALI_KELAS" && (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">Nama Kelas Bimbingan</label>
                    <input
                      type="text"
                      placeholder="Contoh: 6A, RA-A, dll."
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                )}

                {/* Submit buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/60 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-colors cursor-pointer"
                  >
                    {modalMode === "create" ? "Buat Akun" : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  );
}
