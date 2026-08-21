"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  Plus,
  BookOpen,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  AlertCircle,
  X,
  CheckCircle2,
  Calendar,
  Filter,
  FileSpreadsheet,
  Edit2,
  Trash2
} from "lucide-react";

interface Transaction {
  id: number;
  date: string;
  type: "INCOME" | "EXPENSE";
  categoryId: number;
  invoiceId: number | null;
  paymentMethod: "CASH" | "TRANSFER" | "MIDTRANS";
  amount: number;
  description: string | null;
  schoolUnitId: number;
  recordedById: number | null;
  category: {
    name: string;
  };
  recordedBy?: {
    name: string;
  } | null;
}

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

export default function TransactionsPage() {
  const { user } = useAuthStore();
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    currentBalance: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters State
  const [filterUnitId, setFilterUnitId] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMethod, setFilterMethod] = useState<string>("all");


  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formMethod, setFormMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDescription, setFormDescription] = useState("");
  const [formUnitId, setFormUnitId] = useState<number>(3); // default SD

  const isUnitAdmin = user?.role === "UNIT_ADMIN";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data.data);
    } catch (err) {
      console.error("Gagal mengambil data kategori", err);
    }
  };

  // Fetch Transactions and Summary
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      
      // Enforce schoolUnitId
      if (isUnitAdmin) {
        params.schoolUnitId = user.schoolUnitId;
      } else if (filterUnitId !== "all") {
        params.schoolUnitId = Number(filterUnitId);
      }

      if (filterType !== "all") {
        params.type = filterType;
      }

      if (filterStartDate) {
        params.startDate = filterStartDate;
      }

      if (filterEndDate) {
        params.endDate = filterEndDate;
      }

      const response = await api.get("/transactions", { params });
      setTransactions(response.data.data);
      setSummary(response.data.summary);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil rekapitulasi buku kas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filterUnitId, filterType, filterStartDate, filterEndDate]);

  // Handle open create modal
  const openCreateModal = () => {
    setModalMode("create");
    setSelectedTransaction(null);
    setFormType("INCOME");
    setFormCategoryId("");
    setFormMethod("CASH");
    setFormAmount("");
    setFormDescription("");
    setFormUnitId(isUnitAdmin ? (user.schoolUnitId || 3) : 3);
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (tr: Transaction) => {
    setModalMode("edit");
    setSelectedTransaction(tr);
    setFormType(tr.type);
    setFormCategoryId(String(tr.categoryId));
    setFormMethod(tr.paymentMethod === "MIDTRANS" ? "TRANSFER" : tr.paymentMethod as "CASH" | "TRANSFER");
    setFormAmount(String(tr.amount));
    setFormDescription(tr.description || "");
    setFormUnitId(tr.schoolUnitId);
    setIsModalOpen(true);
  };

  // Filter categories based on selected transaction type in form
  const filteredCategories = categories.filter(
    (cat) => cat.type === formType
  );

  // Automatically select first available filtered category (only on create mode or if category doesn't belong to list)
  useEffect(() => {
    if (modalMode === "create") {
      if (filteredCategories.length > 0) {
        setFormCategoryId(String(filteredCategories[0]?.id));
      } else {
        setFormCategoryId("");
      }
    }
  }, [formType, categories, modalMode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const amountNum = Number(formAmount);
    if (!formAmount || isNaN(amountNum) || amountNum <= 0) {
      setError("Nominal transaksi harus berupa angka positif");
      return;
    }

    if (!formCategoryId) {
      setError("Silakan pilih kategori transaksi");
      return;
    }

    const payload = {
      type: formType,
      categoryId: Number(formCategoryId),
      paymentMethod: formMethod,
      amount: amountNum,
      description: formDescription.trim() || undefined,
      schoolUnitId: formUnitId,
    };

    try {
      if (modalMode === "create") {
        const response = await api.post("/transactions", payload);
        setSuccessMsg(response.data.message || "Transaksi berhasil dicatat");
      } else if (modalMode === "edit" && selectedTransaction) {
        const response = await api.put(`/transactions/${selectedTransaction.id}`, payload);
        setSuccessMsg(response.data.message || "Transaksi berhasil diperbarui");
      }
      setIsModalOpen(false);
      fetchTransactions();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan pencatatan transaksi");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi buku kas ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/transactions/${id}`);
      setSuccessMsg(response.data.message || "Transaksi berhasil dihapus");
      fetchTransactions();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus transaksi");
    }
  };

  const filteredTransactions = transactions.filter((tr) => {
    if (filterMethod === "all") return true;
    if (filterMethod === "online") return tr.paymentMethod === "MIDTRANS";
    if (filterMethod === "cash") return tr.paymentMethod === "CASH" || tr.paymentMethod === "TRANSFER";
    return true;
  });

  const filteredIncome = filteredTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpense = filteredTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredBalance = filteredIncome - filteredExpense;

  const totalIncome = filterMethod === "all" ? summary.totalIncome : filteredIncome;
  const totalExpense = filterMethod === "all" ? summary.totalExpense : filteredExpense;
  const currentBalance = filterMethod === "all" ? summary.currentBalance : filteredBalance;

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

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExportCsv = () => {
    const headers = ["Tanggal", "Jenis", "Kategori", "Metode", "Nominal", "Deskripsi", "Unit Sekolah"];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString("id-ID"),
      t.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
      t.category?.name || "",
      t.paymentMethod === "MIDTRANS" ? "Online" : t.paymentMethod,
      t.amount,
      t.description || "",
      getUnitName(t.schoolUnitId)
    ]);


    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Kasir_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Jurnal Buku Kas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Rekapitulasi total saldo kas masuk, kas keluar, dan detail jurnal transaksi operasional.
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCsv}
            disabled={transactions.length === 0}
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
            Catat Transaksi Baru
          </button>
        </div>
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

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Income */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Total Pemasukan
            </p>
            <p className="text-xl font-extrabold text-emerald-400">
              {formatRupiah(totalIncome)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Total Pengeluaran
            </p>
            <p className="text-xl font-extrabold text-rose-400">
              {formatRupiah(totalExpense)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Current Balance */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Saldo Saat Ini
            </p>
            <p className="text-xl font-extrabold text-indigo-400">
              {formatRupiah(currentBalance)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>


      {/* Filters Form */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-xl space-y-4 backdrop-blur-md text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white">Filter Jurnal Buku Kas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Unit selection (Only for SUPER_ADMIN) */}
          {!isUnitAdmin && (
            <div className="space-y-1">
              <label className="font-medium text-slate-400 block">Unit Sekolah</label>
              <select
                value={filterUnitId}
                onChange={(e) => setFilterUnitId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
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

          {/* Type selection */}
          <div className="space-y-1">
            <label className="font-medium text-slate-400 block">Tipe Jurnal</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Semua Transaksi</option>
              <option value="INCOME">Hanya Pemasukan</option>
              <option value="EXPENSE">Hanya Pengeluaran</option>
            </select>
          </div>

          {/* Payment Method selection */}
          <div className="space-y-1">
            <label className="font-medium text-slate-400 block">Metode Pembayaran</label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Semua Metode</option>
              <option value="online">Online</option>
              <option value="cash">Cash (Tunai / Manual)</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="font-medium text-slate-400 block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Tanggal Mulai
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="font-medium text-slate-400 block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Tanggal Selesai
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Reset filters button */}
        {(filterUnitId !== "all" || filterType !== "all" || filterStartDate || filterEndDate || filterMethod !== "all") && (
          <button
            onClick={() => {
              setFilterUnitId("all");
              setFilterType("all");
              setFilterStartDate("");
              setFilterEndDate("");
              setFilterMethod("all");
            }}
            className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Reset Semua Filter
          </button>
        )}
      </div>


       {/* Transactions History Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
              Memuat data jurnal kas...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              {transactions.length === 0 
                ? "Tidak ada data transaksi kas yang terdaftar." 
                : "Tidak ada data transaksi yang cocok dengan filter Anda."}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Jenis</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Metode</th>
                  <th className="px-6 py-4">Nominal</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4">Unit Sekolah</th>
                  <th className="px-6 py-4">Dicatat Oleh</th>
                  {isSuperAdmin && <th className="px-6 py-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {filteredTransactions.map((tr) => (
                  <tr
                    key={tr.id}
                    className="hover:bg-slate-800/10 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {formatDate(tr.date)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        tr.type === "INCOME"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {tr.type === "INCOME" ? "MASUK" : "KELUAR"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {tr.category?.name}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                        tr.paymentMethod === "MIDTRANS"
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-fadeIn"
                          : tr.paymentMethod === "TRANSFER"
                          ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                          : "bg-slate-800/40 text-slate-400 border-slate-700/60"
                      }`}>
                        {tr.paymentMethod === "MIDTRANS" ? "ONLINE" : tr.paymentMethod}
                      </span>
                    </td>

                    <td className={`px-6 py-4 font-bold ${
                      tr.type === "INCOME" ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {tr.type === "INCOME" ? "+" : "-"} {formatRupiah(tr.amount)}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-400" title={tr.description || ""}>
                      {tr.description || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {getUnitName(tr.schoolUnitId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {tr.recordedBy?.name || "Sistem"}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(tr)}
                            className="p-1.5 bg-slate-850 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 rounded border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tr.id)}
                            className="p-1.5 bg-slate-850 hover:bg-slate-750 text-rose-400 hover:text-rose-300 rounded border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                            title="Hapus Transaksi"
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
              {modalMode === "create" ? "Pencatatan Transaksi Buku Kas" : "Perbarui Transaksi Buku Kas"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              {/* Type Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormType("INCOME")}
                    className={`py-2 rounded-lg font-bold transition-all border text-center ${
                      formType === "INCOME"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    KAS MASUK (INCOME)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("EXPENSE")}
                    className={`py-2 rounded-lg font-bold transition-all border text-center ${
                      formType === "EXPENSE"
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    KAS KELUAR (EXPENSE)
                  </button>
                </div>
              </div>

              {/* Category Dropdown (Filtered dynamically based on Type) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Kategori Pos Kas</label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {filteredCategories.length === 0 ? (
                    <option value="">-- Tidak ada kategori yang cocok --</option>
                  ) : (
                    filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.schoolUnitId ? `(${getUnitName(cat.schoolUnitId)})` : "(Global)"}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Metode Pembayaran</label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as "CASH" | "TRANSFER")}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="CASH">Tunai (CASH)</option>
                  <option value="TRANSFER">Transfer Bank (TRANSFER)</option>
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Nominal Transaksi (IDR)</label>
                <input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* School Unit selection (Only configured by SUPER_ADMIN, locked for UNIT_ADMIN) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Unit Keuangan Sekolah</label>
                {isUnitAdmin ? (
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
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Deskripsi / Keterangan (Opsional)</label>
                <textarea
                  placeholder="Masukkan keterangan detail transaksi..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
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
                  {modalMode === "create" ? "Catat Transaksi" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
