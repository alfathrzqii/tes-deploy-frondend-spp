"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  Calendar,
  Shield,
  FolderTree,
  DollarSign,
  Users,
  BookOpen,
  ArrowUpRight,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Loader2,
  TrendingUp,
  ChevronRight
} from "lucide-react";

interface RecentTransaction {
  id: number;
  date: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string | null;
  category: {
    name: string;
  };
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Financial Stats States
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    currentBalance: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "UNIT_ADMIN";

  // Fetch Financial summary if user is Admin
  useEffect(() => {
    if (!isAdmin) return;

    async function loadDashboardStats() {
      setLoadingStats(true);
      try {
        const response = await api.get("/transactions");
        if (response.data.success) {
          setSummary(response.data.summary || { totalIncome: 0, totalExpense: 0, currentBalance: 0 });
          setRecentTransactions(response.data.data.slice(0, 3)); // Get top 3 recent
        }
      } catch (err) {
        console.error("Gagal mengambil statistik dashboard", err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadDashboardStats();
  }, [isAdmin]);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Selamat Pagi";
    if (hrs < 17) return "Selamat Siang";
    return "Selamat Malam";
  };

  const formattedDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "from-red-500/20 to-orange-500/10 text-orange-400 border-orange-500/20";
      case "UNIT_ADMIN":
        return "from-indigo-500/20 to-violet-500/10 text-indigo-400 border-indigo-500/20";
      default:
        return "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatShortDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  const getQuickLinks = (role: string) => {
    const allLinks = [
      {
        name: "Kelola Kategori",
        href: "/categories",
        desc: "Atur jenis pos kas keuangan.",
        icon: FolderTree,
        roles: ["SUPER_ADMIN", "UNIT_ADMIN"],
      },
      {
        name: "Tarif SPP",
        href: "/spp-tariffs",
        desc: "Konfigurasi tarif SPP tahunan.",
        icon: DollarSign,
        roles: ["SUPER_ADMIN"],
      },
      {
        name: "Pendaftaran Siswa",
        href: "/students",
        desc: "Registrasi siswa baru & wali murid.",
        icon: Users,
        roles: ["SUPER_ADMIN", "UNIT_ADMIN"],
      },
      {
        name: "Jurnal Buku Kas",
        href: "/transactions",
        desc: "Catat & pantau kas pemasukan/pengeluaran.",
        icon: BookOpen,
        roles: ["SUPER_ADMIN", "UNIT_ADMIN"],
      },
    ];

    return allLinks.filter((link) => link.roles.includes(role));
  };

  // Spending ratio calculation
  const expensePercentage = summary.totalIncome > 0
    ? Math.min(100, Math.round((summary.totalExpense / summary.totalIncome) * 100))
    : 0;
  const netPercentage = 100 - expensePercentage;

  return (
    <div className="space-y-8 relative">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900/60 to-slate-950/60 border border-slate-800/80 p-8 rounded-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-[-40%] right-[-10%] w-[40%] h-[150%] bg-indigo-500/10 rounded-full blur-[90px] rotate-12 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tracking-wider text-indigo-400 uppercase">
                {getGreeting()}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-gradient-to-br ${
                user ? getRoleBadgeColor(user.role) : ""
              }`}>
                {user?.role.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {user?.name}
            </h1>
            <div className="flex items-center gap-2 text-slate-400 text-xs mt-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/50 p-4 rounded-xl flex items-start gap-3 max-w-sm">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-white">Status Otoritas</p>
              <p className="text-[11px] text-slate-400 leading-normal mt-1">
                {user?.role === "SUPER_ADMIN"
                  ? "Anda memiliki hak akses global penuh (Super Admin). Anda diizinkan untuk mengonfigurasi data master tarif seluruh sekolah, unit sekolah, kategori keuangan, pendaftaran, dan audit kas."
                  : user?.role === "UNIT_ADMIN"
                  ? `Anda bertugas sebagai Admin Unit. Otoritas Anda terbatas untuk memantau, mendaftarkan siswa, dan mengelola kas transaksi pada Unit Sekolah terkait.`
                  : "Anda masuk sebagai Wali Murid. Anda dapat melihat info tagihan dan rincian transaksi SPP untuk anak Anda."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Financial Summary Section (Only visible for Admins) */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Ringkasan & Analisis Keuangan
            </h2>
            {loadingStats && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
          </div>

          {/* Cards Deck */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Saldo */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex items-center justify-between backdrop-blur-md hover:border-indigo-500/20 transition-all">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Saldo Kas Saat Ini
                </p>
                <p className="text-2xl font-black text-indigo-400 tracking-tight">
                  {formatRupiah(summary.currentBalance)}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            {/* Income */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex items-center justify-between backdrop-blur-md hover:border-emerald-500/20 transition-all">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Total Pemasukan
                </p>
                <p className="text-2xl font-black text-emerald-400 tracking-tight">
                  {formatRupiah(summary.totalIncome)}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ArrowUpCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Expense */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex items-center justify-between backdrop-blur-md hover:border-rose-500/20 transition-all">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Total Pengeluaran
                </p>
                <p className="text-2xl font-black text-rose-400 tracking-tight">
                  {formatRupiah(summary.totalExpense)}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <ArrowDownCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Visual Spending Bar & Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Proportional Spending Bar */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md flex flex-col justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Proporsi Arus Kas Keluar vs Bersih
                </h3>
                <p className="text-[11px] text-slate-400">
                  Visualisasi rasio penggunaan kas terhadap total pemasukan yang diterima.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Rasio Pengeluaran</span>
                  <span className="text-rose-400">{expensePercentage}% Terpakai</span>
                </div>
                <div className="h-4 w-full bg-slate-950 border border-slate-800/80 rounded-full overflow-hidden flex">
                  {summary.totalIncome === 0 && summary.totalExpense === 0 ? (
                    <div className="h-full w-full bg-slate-800/40 animate-pulse"></div>
                  ) : (
                    <>
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${netPercentage}%` }}
                        title={`Saldo Bersih: ${netPercentage}%`}
                      ></div>
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-violet-600 transition-all duration-500"
                        style={{ width: `${expensePercentage}%` }}
                        title={`Pengeluaran: ${expensePercentage}%`}
                      ></div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-450 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"></div>
                    <span>Saldo Bersih ({netPercentage}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-rose-500 to-violet-600"></div>
                    <span>Pengeluaran ({expensePercentage}%)</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/50 pt-4 flex items-center justify-between text-xs">
                <span className="text-slate-400">Status Keuangan</span>
                <span className={`font-bold ${netPercentage > 40 ? "text-emerald-450" : "text-amber-400"}`}>
                  {netPercentage > 70
                    ? "Sangat Sehat (Kas Surplus)"
                    : netPercentage > 40
                    ? "Sehat (Kas Stabil)"
                    : "Waspada (Pengeluaran Tinggi)"}
                </span>
              </div>
            </div>

            {/* Recent Activities List */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Jurnal Transaksi Terbaru
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Pencatatan kas masuk/keluar terakhir di buku kas sekolah.
                  </p>
                </div>
                <Link
                  href="/transactions"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5"
                >
                  <span>Detail</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex-1 divide-y divide-slate-800/50">
                {recentTransactions.length === 0 ? (
                  <div className="h-full flex items-center justify-center py-6 text-xs text-slate-500">
                    Belum ada transaksi terdaftar.
                  </div>
                ) : (
                  recentTransactions.map((tr) => (
                    <div key={tr.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center border ${
                          tr.type === "INCOME"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        }`}>
                          {tr.type === "INCOME" ? (
                            <ArrowUpCircle className="w-4 h-4" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white truncate max-w-[160px]">
                            {tr.description || tr.category.name}
                          </p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {formatShortDate(tr.date)} • {tr.category.name}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold ${
                        tr.type === "INCOME" ? "text-emerald-450" : "text-rose-400"
                      }`}>
                        {tr.type === "INCOME" ? "+" : "-"} {formatRupiah(tr.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Menu */}
      {user && getQuickLinks(user.role).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            Akses Cepat Menu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getQuickLinks(user.role).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="bg-slate-900/40 hover:bg-slate-800/35 border border-slate-800/80 hover:border-indigo-500/25 p-5 rounded-xl transition-all group flex flex-col justify-between h-36"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 group-hover:text-indigo-400 group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5 transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
