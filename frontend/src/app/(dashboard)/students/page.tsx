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
  Filter
} from "lucide-react";

interface Student {
  id: number;
  studentNumber: string;
  name: string;
  className: string;
  schoolUnitId: number;
  parentId: number;
  enrollmentYear: number;
  discountPercentage: number;
  parent: {
    name: string;
    email: string;
    phoneNumber?: string | null;
  };
}

const SCHOOL_UNITS = [
  { id: 1, name: "RA/KB" },
  { id: 2, name: "TK" },
  { id: 3, name: "SD" },
];

export default function StudentsPage() {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnitId, setFilterUnitId] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form Fields
  const [formNis, setFormNis] = useState("");
  const [formName, setFormName] = useState("");
  const [formClassName, setFormClassName] = useState("");
  const [formUnitId, setFormUnitId] = useState<number>(3); // Default to SD
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formParentName, setFormParentName] = useState("");
  const [formParentEmail, setFormParentEmail] = useState("");
  const [formParentPhoneNumber, setFormParentPhoneNumber] = useState("");

  const isUnitAdmin = user?.role === "UNIT_ADMIN";

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      // If UNIT_ADMIN, backend forces their schoolUnitId. If SUPER_ADMIN, we can pass it
      if (isUnitAdmin) {
        // Automatically handled by backend or we can be explicit
        params.schoolUnitId = user.schoolUnitId;
      } else if (filterUnitId !== "all") {
        params.schoolUnitId = Number(filterUnitId);
      }

      const response = await api.get("/students", { params });
      setStudents(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil daftar data siswa");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on filters change
  useEffect(() => {
    fetchStudents();
  }, [filterUnitId]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedStudent(null);
    setFormNis("");
    setFormName("");
    setFormClassName("");
    setFormUnitId(isUnitAdmin ? (user.schoolUnitId || 3) : 3);
    setFormYear(new Date().getFullYear());
    setFormDiscount(0);
    setFormParentName("");
    setFormParentEmail("");
    setFormParentPhoneNumber("");
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setModalMode("edit");
    setSelectedStudent(student);
    setFormNis(student.studentNumber);
    setFormName(student.name);
    setFormClassName(student.className);
    setFormUnitId(student.schoolUnitId);
    setFormYear(student.enrollmentYear);
    setFormDiscount(student.discountPercentage);
    setFormParentName(student.parent.name);
    setFormParentEmail(student.parent.email);
    setFormParentPhoneNumber(student.parent.phoneNumber || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validate name and parent details
    if (!formName.trim() || !formParentName.trim() || !formParentEmail.trim()) {
      setError("Nama siswa, nama orang tua, dan email orang tua wajib diisi");
      return;
    }

    try {
      if (modalMode === "create") {
        if (!formNis.trim()) {
          setError("Nomor induk siswa (NIS) wajib diisi");
          return;
        }

        const payload = {
          studentNumber: formNis.trim(),
          name: formName.trim(),
          className: formClassName.trim(),
          schoolUnitId: formUnitId,
          enrollmentYear: formYear,
          discountPercentage: Number(formDiscount),
          parentName: formParentName.trim(),
          parentEmail: formParentEmail.trim(),
          parentPhoneNumber: formParentPhoneNumber.trim(),
        };
        const response = await api.post("/students", payload);
        setSuccessMsg(response.data.message || "Data siswa berhasil didaftarkan");
      } else if (modalMode === "edit" && selectedStudent) {
        // Backend PUT /api/students/:id allows updating { name, className, discountPercentage }
        const payload = {
          name: formName.trim(),
          className: formClassName.trim(),
          discountPercentage: Number(formDiscount),
        };
        const response = await api.put(`/students/${selectedStudent.id}`, payload);
        setSuccessMsg(response.data.message || "Data siswa berhasil diperbarui");
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan data siswa");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data siswa ini? Semua invoice/tagihan terkait akan terpengaruh.")) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/students/${id}`);
      setSuccessMsg(response.data.message || "Data siswa berhasil dihapus");
      fetchStudents();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus data siswa");
    }
  };

  const getUnitName = (unitId: number) => {
    return SCHOOL_UNITS.find((u) => u.id === unitId)?.name || `Unit ${unitId}`;
  };

  return (
    <div className="space-y-6 relative">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Daftar Siswa
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manajemen pendaftaran siswa baru, wali murid, dan konfigurasi diskon SPP.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Pendaftaran Siswa Baru
        </button>
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

      {/* Filters and search area */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
        {/* Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari siswa berdasarkan NIS atau Nama..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-20 py-2 rounded-lg text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-md text-[10px] font-semibold border border-slate-800 hover:border-slate-700 transition-all"
          >
            Cari
          </button>
        </form>

        {/* School Unit filter (Only rendered for SUPER_ADMIN) */}
        {!isUnitAdmin && (
          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
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

      {/* Main Students Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
              Memuat data siswa...
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Tidak ada data siswa ditemukan.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="px-6 py-4">NIS (Student Number)</th>
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4">Unit / Angkatan</th>
                  <th className="px-6 py-4">Diskon SPP (%)</th>
                  <th className="px-6 py-4">Wali Murid (Parent)</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-800/10 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-medium text-slate-400">
                      {student.studentNumber}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {student.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex gap-1.5 items-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {getUnitName(student.schoolUnitId)}
                          </span>
                          {student.className && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              {student.className}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Angkatan {student.enrollmentYear}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        student.discountPercentage > 0
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-slate-800/60 text-slate-500 border-slate-700/60"
                      }`}>
                        {student.discountPercentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-300">{student.parent?.name}</span>
                        <span className="text-[10px] text-slate-500">{student.parent?.email}</span>
                        {student.parent?.phoneNumber && (
                          <span className="text-[10px] text-slate-500/70 mt-0.5">{student.parent?.phoneNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-6">
              {modalMode === "create" ? "Pendaftaran Siswa Baru" : "Edit Informasi Siswa"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              {/* NIS field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Nomor Induk Siswa (NIS)</label>
                {modalMode === "create" ? (
                  <input
                    type="text"
                    placeholder="Contoh: SD-2025-098"
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400 font-mono">
                    {formNis}
                  </div>
                )}
              </div>

              {/* Student Name field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  placeholder="Nama Siswa"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Class Name field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Kelas</label>
                <input
                  type="text"
                  placeholder="Contoh: 10A, TK A1, dll."
                  value={formClassName}
                  onChange={(e) => setFormClassName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* School Unit selection (Only configured on create) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Unit Sekolah</label>
                {modalMode === "create" ? (
                  isUnitAdmin ? (
                    <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                      {getUnitName(formUnitId)}
                    </div>
                  ) : (
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
                  )
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                    {getUnitName(formUnitId)}
                  </div>
                )}
              </div>

              {/* Enrollment Year field (Only configured on create) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Tahun Angkatan Masuk</label>
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

              {/* SPP Discount Percentage field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Diskon Potongan SPP (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formDiscount}
                  onChange={(e) => setFormDiscount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Parent Info Section */}
              <div className="pt-2 border-t border-slate-800/80 mt-4 space-y-3">
                <p className="font-bold text-white">Informasi Orang Tua / Wali Murid</p>
                
                {modalMode === "create" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Nama Lengkap Wali</label>
                      <input
                        type="text"
                        placeholder="Nama Orang Tua"
                        value={formParentName}
                        onChange={(e) => setFormParentName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">No. HP Aktif Wali</label>
                      <input
                        type="text"
                        placeholder="Contoh: 08123456789"
                        value={formParentPhoneNumber}
                        onChange={(e) => setFormParentPhoneNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Email Aktif Wali</label>
                      <input
                        type="email"
                        placeholder="wali@example.com"
                        value={formParentEmail}
                        onChange={(e) => setFormParentEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                    <p className="font-semibold text-slate-300">{formParentName}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{formParentEmail}</p>
                    {formParentPhoneNumber && (
                      <p className="text-[10px] text-slate-400 mt-1">No. HP: {formParentPhoneNumber}</p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-2 italic">
                      Informasi wali murid dapat diubah melalui menu manajemen pengguna jika diperlukan.
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
                  {modalMode === "create" ? "Daftarkan Siswa" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
