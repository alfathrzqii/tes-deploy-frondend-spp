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
  Upload,
  Info
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
  birthDate?: string | null;
  parent: {
    name: string;
    email: string | null;
    phoneNumber: string;
  };
}

const SCHOOL_UNITS = [
  { id: 1, name: "KB" },
  { id: 2, name: "RA" },
  { id: 3, name: "SD" },
  { id: 4, name: "TPA" },
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
  const [filterClass, setFilterClass] = useState("");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // CSV Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);

  // Form Fields
  const [formNis, setFormNis] = useState("");
  const [formName, setFormName] = useState("");
  const [formClassName, setFormClassName] = useState("");
  const [formUnitId, setFormUnitId] = useState<number>(3); // Default to SD (3)
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formBirthDate, setFormBirthDate] = useState(""); // Birth date (YYYY-MM-DD)
  const [formParentName, setFormParentName] = useState("");
  const [formParentEmail, setFormParentEmail] = useState("");
  const [formParentPhoneNumber, setFormParentPhoneNumber] = useState("");

  const isUnitAdmin = user?.role === "UNIT_ADMIN";
  const isWaliKelas = user?.role === "WALI_KELAS";

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Filter limits based on role
      if (isWaliKelas) {
        params.schoolUnitId = user?.schoolUnitId;
        params.className = user?.className;
      } else {
        if (isUnitAdmin) {
          params.schoolUnitId = user?.schoolUnitId;
        } else if (filterUnitId !== "all") {
          params.schoolUnitId = Number(filterUnitId);
        }
        if (filterClass.trim()) {
          params.className = filterClass.trim();
        }
      }

      const response = await api.get("/students", { params });
      setStudents(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil daftar data siswa");
    } finally {
      setLoading(false);
    }
  };

  // Fetch unique classes once at load (or when data is modified)
  const fetchUniqueClasses = async () => {
    try {
      const response = await api.get("/students");
      const classes = Array.from(
        new Set(response.data.data.map((s: any) => s.className))
      ).filter(Boolean) as string[];
      setAvailableClasses(classes.sort((a, b) => a.localeCompare(b)));
    } catch (err) {
      console.error("Gagal mengambil daftar kelas", err);
    }
  };

  useEffect(() => {
    fetchUniqueClasses();
  }, []);

  // Fetch on filters change
  useEffect(() => {
    fetchStudents();
  }, [filterUnitId, filterClass]);

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
    setFormUnitId(isUnitAdmin || isWaliKelas ? (user?.schoolUnitId || 3) : 3);
    setFormYear(new Date().getFullYear());
    setFormDiscount(0);
    setFormBirthDate("");
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
    setFormBirthDate(student.birthDate || "");
    setFormParentName(student.parent.name);
    setFormParentEmail(student.parent.email || "");
    setFormParentPhoneNumber(student.parent.phoneNumber || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validate details
    if (!formName.trim() || !formParentName.trim() || !formParentPhoneNumber.trim()) {
      setError("Nama siswa, nama orang tua, dan nomor HP orang tua wajib diisi");
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
          birthDate: formBirthDate || null,
          parentName: formParentName.trim(),
          parentEmail: formParentEmail.trim() || null,
          parentPhoneNumber: formParentPhoneNumber.trim(),
        };
        const response = await api.post("/students", payload);
        setSuccessMsg(response.data.message || "Data siswa berhasil didaftarkan");
      } else if (modalMode === "edit" && selectedStudent) {
        const payload = {
          name: formName.trim(),
          className: formClassName.trim(),
          discountPercentage: Number(formDiscount),
          birthDate: formBirthDate || null,
        };
        const response = await api.put(`/students/${selectedStudent.id}`, payload);
        setSuccessMsg(response.data.message || "Data siswa berhasil diperbarui");
      }
      setIsModalOpen(false);
      fetchStudents();
      fetchUniqueClasses();
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
      fetchUniqueClasses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus data siswa");
    }
  };

  // Parsing CSV manually
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportResult(null);
    setError(null);

    if (!csvText.trim()) {
      setError("Silakan tempel teks CSV terlebih dahulu");
      return;
    }

    setImportLoading(true);
    try {
      // Split lines
      const lines = csvText.split("\n").map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        throw new Error("CSV minimal harus memiliki baris header dan satu baris data");
      }

      // Read header
      const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
      
      const parsedRows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = columns[index] || "";
        });
        parsedRows.push(rowData);
      }

      const response = await api.post("/students/import", { rows: parsedRows });
      
      if (response.data.success) {
        setImportResult(response.data.data);
        setSuccessMsg(response.data.message);
        setCsvText("");
        fetchStudents();
        fetchUniqueClasses();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Gagal melakukan import data CSV");
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  // Client-side CSV export
  const handleExportCsv = () => {
    const headers = ["NIS", "Nama Siswa", "Kelas", "Unit Sekolah", "Angkatan", "Diskon SPP (%)", "Tanggal Lahir", "Nama Wali", "No HP Wali", "Email Wali"];
    const rows = students.map(s => [
      s.studentNumber,
      s.name,
      s.className,
      getUnitName(s.schoolUnitId),
      s.enrollmentYear,
      s.discountPercentage,
      s.birthDate || "",
      s.parent.name,
      s.parent.phoneNumber || "",
      s.parent.email || ""
    ]);

    // Create CSV content
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Data_Siswa_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            Daftar Siswa {isWaliKelas && `Bimbingan Kelas ${user?.className}`}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manajemen pendaftaran siswa baru, wali murid, tanggal lahir (password default), dan migrasi kelas.
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleExportCsv}
            disabled={students.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>
          
          {!isWaliKelas && (
            <button
              onClick={() => {
                setImportResult(null);
                setIsImportModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-950/45 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-500/20 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              Import CSV
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Pendaftaran Baru
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
            placeholder="Cari siswa berdasarkan NIS atau Nama..."
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

        <div className="flex flex-wrap items-center gap-4 shrink-0 self-start md:self-auto">
          {/* School Unit filter (Hidden for Wali Kelas who is locked to their unit) */}
          {!isUnitAdmin && !isWaliKelas && (
            <div className="flex items-center gap-2">
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

          {/* Class filter (Hidden for Wali Kelas who is locked to their class) */}
          {!isWaliKelas && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-medium text-slate-400">Filter Kelas:</span>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-350 px-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Semua Kelas</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
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
                  <th className="px-6 py-4">Unit / Kelas / Lahir</th>
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
                            Unit {getUnitName(student.schoolUnitId)}
                          </span>
                          {student.className && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              Kelas {student.className}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Angkatan {student.enrollmentYear} {student.birthDate ? `| Lahir: ${student.birthDate}` : ""}
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
                        <span className="text-[10px] text-slate-500/80 font-mono mt-0.5">{student.parent?.phoneNumber}</span>
                        {student.parent?.email && (
                          <span className="text-[10px] text-slate-600 mt-0.5">{student.parent?.email}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
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

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              Import Data Siswa via CSV
            </h2>

            <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl mb-4 space-y-2">
              <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" /> Format Kolom CSV (Pemisah Koma):
              </p>
              <p className="font-mono bg-slate-900 p-2 rounded text-[11px] text-indigo-300 select-all overflow-x-auto whitespace-nowrap">
                nis,nama,kelas,unit,angkatan,diskon,tanggal_lahir,nama_ortu,hp_ortu,email_ortu
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                <li><b>nis</b>: Nomor Induk Siswa (Unik - Kunci Sinkronisasi Tahunan).</li>
                <li><b>unit</b>: Diisi "KB", "RA", "SD", atau "TPA" (case-insensitive).</li>
                <li><b>tanggal_lahir</b>: Digunakan sebagai password default wali murid (format: <b>DD-MM-YYYY</b>). Contoh: `10-05-2015` -&gt; password: `10052015`.</li>
                <li><b>hp_ortu</b>: Nomor handphone wali murid sebagai ID Login akun (Unik).</li>
              </ul>
            </div>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <label className="w-full sm:w-auto px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-300 rounded-lg text-center font-semibold transition-all cursor-pointer inline-flex items-center justify-center gap-2">
                  <Upload className="w-3.5 h-3.5" /> Pilih File CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[10px] text-slate-500">Atau langsung tempel data CSV Anda di bawah ini.</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Teks CSV Data Siswa</label>
                <textarea
                  rows={8}
                  placeholder="nis,nama,kelas,unit,angkatan,diskon,tanggal_lahir,nama_ortu,hp_ortu,email_ortu&#10;SD-2026-999,Ananda Pradana,6A,SD,2024,0,12-10-2014,Agus Pradana,089999999999,agus@test.com"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-lg font-mono placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {importResult && (
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                  <p className="font-bold text-white">Hasil Import:</p>
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold">
                    <span className="text-emerald-400">Berhasil: {importResult.successCount} baris</span>
                    <span className="text-red-400">Gagal: {importResult.failedCount} baris</span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="pt-2 border-t border-slate-900 mt-2 max-h-40 overflow-y-auto text-[10px] text-red-400 font-mono space-y-1">
                      {importResult.errors.map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-350 rounded-lg font-semibold transition-colors cursor-pointer"
                  disabled={importLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  disabled={importLoading}
                >
                  {importLoading ? "Memproses..." : "Mulai Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal CRUD Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-6">
              {modalMode === "create" ? "Pendaftaran Siswa Baru" : "Edit Informasi Siswa"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              
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
                {isWaliKelas && modalMode === "create" ? (
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                    {user?.className}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Contoh: 6A, RA-A, dll."
                    value={formClassName}
                    onChange={(e) => setFormClassName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                )}
              </div>

              {/* School Unit selection (Only configured on create) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Unit Sekolah</label>
                {modalMode === "create" ? (
                  isUnitAdmin || isWaliKelas ? (
                    <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                      Unit {getUnitName(formUnitId)}
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

              {/* Student birthdate field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Tanggal Lahir Siswa (Password Wali default)</label>
                <input
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                />
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
                      <label className="font-semibold text-slate-300">No. HP Wali (ID Login)</label>
                      <input
                        type="text"
                        placeholder="Contoh: 08123456789"
                        value={formParentPhoneNumber}
                        onChange={(e) => setFormParentPhoneNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Email Wali (Opsional)</label>
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
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400 space-y-1.5">
                    <p className="font-semibold text-slate-350">{formParentName}</p>
                    <p className="text-[10px] text-slate-500">No. HP: <span className="font-mono text-slate-400">{formParentPhoneNumber}</span></p>
                    {formParentEmail && (
                      <p className="text-[10px] text-slate-500">Email: <span className="font-mono text-slate-400">{formParentEmail}</span></p>
                    )}
                    <p className="text-[10px] text-slate-500/80 italic pt-1 border-t border-slate-900 mt-2">
                      Catatan: Info akun login wali murid dapat dikelola melalui menu Manajemen Pengguna.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md shadow-indigo-500/10 transition-colors cursor-pointer"
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
