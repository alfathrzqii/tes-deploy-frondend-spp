"use client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  ChevronRight,
  X,
  Copy,
  Check,
  QrCode,
  Building2,
  CreditCard,
  ArrowRight,
  RefreshCw,
  Layers,
  Zap,
  Printer,
} from "lucide-react";
import { printOfficialReceipt } from "@/lib/receiptPrinter";

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
  const [incomeBreakdown, setIncomeBreakdown] = useState<{ name: string; amount: number; percentage: number; color: string }[]>([]);

  // Parent Dashboard States
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [childrenInvoices, setChildrenInvoices] = useState<Record<string, any>>({});
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Midtrans Snap / Pakasir Modal States for Parent
  const [snapOpen, setSnapOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"gopay" | "va_mandiri" | "va_bca" | "qris" | "tf_manual">("qris");
  const [vaNumber, setVaNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pakasirLoading, setPakasirLoading] = useState(false);
  const [pakasirData, setPakasirData] = useState<any | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [syncingChild, setSyncingChild] = useState<string | null>(null);
  const [simulatingPayment, setSimulatingPayment] = useState<boolean>(false);

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "UNIT_ADMIN";

  // Fetch Financial summary if user is Admin
  useEffect(() => {
    if (!isAdmin) return;

    async function loadDashboardStats() {
      setLoadingStats(true);
      try {
        const response = await api.get("/transactions");
        if (response.data.success) {
          const txs = response.data.data || [];
          setSummary(response.data.summary || { totalIncome: 0, totalExpense: 0, currentBalance: 0 });
          setRecentTransactions(txs.slice(0, 3)); // Get top 3 recent

          // Calculate category breakdown for income
          const incomeTxs = txs.filter((t: any) => t.type === "INCOME");
          const totalInc = incomeTxs.reduce((sum: number, t: any) => sum + t.amount, 0);

          const categoryMap: Record<string, number> = {};
          incomeTxs.forEach((t: any) => {
            const catName = t.category?.name || "Lain-lain";
            categoryMap[catName] = (categoryMap[catName] || 0) + t.amount;
          });

          const colors = [
            "#6366f1", // indigo
            "#10b981", // emerald
            "#f59e0b", // amber
            "#3b82f6", // blue
            "#ec4899", // pink
            "#8b5cf6", // violet
          ];

          const breakdown = Object.entries(categoryMap).map(([name, amount], index) => {
            const percentage = totalInc > 0 ? Math.round((amount / totalInc) * 100) : 0;
            return {
              name,
              amount,
              percentage,
              color: colors[index % colors.length],
            };
          }).sort((a, b) => b.amount - a.amount);

          setIncomeBreakdown(breakdown);
        }
      } catch (err) {
        console.error("Gagal mengambil statistik dashboard", err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadDashboardStats();
  }, [isAdmin]);

  // Fetch Parent children and invoices if role is PARENT
  const loadParentDashboard = async () => {
    if (user?.role !== "PARENT") return;
    setLoadingChildren(true);
    try {
      const res = await api.get("/parent/children");
      if (res.data.success) {
        const children = res.data.data;
        setChildrenList(children);

        const invoicesMap: Record<string, any> = {};
        for (const child of children) {
          const invRes = await api.get(`/invoices/student/${child.studentNumber}`);
          if (invRes.data.success) {
            const allItems = invRes.data.data || [];
            invoicesMap[child.studentNumber] = {
              sppMonths: allItems.filter((inv: any) => !inv.invoiceType || inv.invoiceType === "SPP"),
              otherFees: allItems.filter((inv: any) => inv.invoiceType && inv.invoiceType !== "SPP"),
              allDbInvoices: invRes.data.allInvoices || [],
            };
          }
        }
        setChildrenInvoices(invoicesMap);
      }
    } catch (err) {
      console.error("Gagal memuat data anak & tagihan", err);
    } finally {
      setLoadingChildren(false);
    }
  };

  useEffect(() => {
    loadParentDashboard();
  }, [user]);

  const fetchPakasirTransaction = async (method: string, child: any, invoice: any) => {
    if (method === "tf_manual") {
      setPakasirData(null);
      return;
    }
    setPakasirLoading(true);
    try {
      const response = await api.post("/invoices/pakasir/create", {
        studentNumber: child.studentNumber,
        paymentMethod: method,
        invoices: [{
          month: invoice.month,
          year: invoice.year,
          invoiceType: invoice.invoiceType || "SPP",
        }],
      });

      if (response.data.success) {
        setPakasirData(response.data.data);
        if (method !== "qris" && response.data.data?.payment?.payment_number) {
          setVaNumber(response.data.data.payment.payment_number);
        }
      } else {
        alert(response.data.message || "Gagal membuat transaksi Pakasir");
      }
    } catch (err: any) {
      console.error("Gagal memanggil API Pakasir:", err);
    } finally {
      setPakasirLoading(false);
    }
  };

  const handleSelectPaymentMethod = (method: "gopay" | "va_mandiri" | "va_bca" | "qris" | "tf_manual") => {
    setPaymentMethod(method);
    if (selectedChild && selectedInvoice) {
      fetchPakasirTransaction(method, selectedChild, selectedInvoice);
    }
  };

  const handleOpenSnap = (child: any, invoice: any) => {
    setSelectedChild(child);
    setSelectedInvoice(invoice);
    setSnapOpen(true);
    setPaymentSuccess(false);
    setProcessingPayment(false);
    setPaymentMethod("qris");
    setVaNumber("");
    fetchPakasirTransaction("qris", child, invoice);
  };

  const handleParentSync = async (studentNumber: string) => {
    setSyncingChild(studentNumber);
    try {
      await api.post("/invoices/pakasir/sync", { studentNumber });
      await loadParentDashboard();
    } catch (err) {
      console.error("Gagal menyinkronkan data:", err);
    } finally {
      setSyncingChild(null);
    }
  };

  // Polling status Pakasir
  useEffect(() => {
    let intervalId: any = null;

    if (snapOpen && pakasirData && !paymentSuccess && paymentMethod !== "tf_manual") {
      const checkStatus = async () => {
        try {
          const response = await api.get(
            `/invoices/pakasir/status?order_id=${pakasirData.orderId}&amount=${pakasirData.amount}`
          );
          if (response.data.success && response.data.status === "completed") {
            setPaymentSuccess(true);
            await loadParentDashboard();
          }
        } catch (err) {
          console.error("Gagal polling status pembayaran:", err);
        }
      };

      checkStatus();
      intervalId = setInterval(checkStatus, 4000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [snapOpen, pakasirData, paymentSuccess, paymentMethod]);

  // Countdown Timer Effect
  useEffect(() => {
    if (!snapOpen || !pakasirData?.payment?.expired_at) {
      setSecondsLeft(0);
      return;
    }

    const expiryTime = new Date(pakasirData.payment.expired_at).getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setSecondsLeft(diffSecs);
    };

    updateCountdown();
    const timerId = setInterval(updateCountdown, 1000);
    return () => clearInterval(timerId);
  }, [snapOpen, pakasirData]);

  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getWhatsAppLink = () => {
    if (!selectedInvoice || !selectedChild) return "#";
    const studentName = selectedChild.name || "Siswa";
    const nis = selectedChild.studentNumber;
    const monthName = MONTHS.find((m) => m.value === selectedInvoice.month)?.name || "";
    const year = selectedInvoice.year;
    const amountStr = formatRupiah(selectedInvoice.amount);

    const message = `Halo Admin, saya ingin mengonfirmasi pembayaran SPP secara manual.\n\n` +
      `*Rincian Tagihan:*\n` +
      `- *Nama Siswa:* ${studentName}\n` +
      `- *NIS:* ${nis}\n` +
      `- *Bulan:* ${monthName} ${year}\n` +
      `- *Nominal:* ${amountStr}\n\n` +
      `Berikut saya lampirkan bukti transfer. Terima kasih.`;

    return `https://wa.me/6289678331076?text=${encodeURIComponent(message)}`;
  };

  const handleWhatsAppRedirect = () => {
    window.open(getWhatsAppLink(), "_blank");
  };

  const handleSimulatePakasirPayment = async () => {
    if (!pakasirData?.orderId) return;
    setSimulatingPayment(true);
    try {
      const response = await api.post("/invoices/pakasir/simulate", {
        orderId: pakasirData.orderId,
        amount: pakasirData.amount || (selectedInvoice ? selectedInvoice.amount : 0),
      });

      if (response.data.success) {
        setPaymentSuccess(true);
        await loadParentDashboard();
      } else {
        alert(response.data.message || "Gagal memicu simulasi pembayaran");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Gagal memicu simulasi pembayaran");
    } finally {
      setSimulatingPayment(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintSuccessReceipt = () => {
    if (!selectedInvoice || !selectedChild) return;
    const isSpp = !selectedInvoice.invoiceType || selectedInvoice.invoiceType === "SPP";
    const periodName = isSpp
      ? `SPP Bulanan - ${MONTHS.find((m) => m.value === selectedInvoice.month)?.name} ${selectedInvoice.year}`
      : `${selectedInvoice.invoiceType} - Tahun ${selectedInvoice.year}`;

    const methodLabel = paymentMethod === "tf_manual"
      ? "Transfer Manual (BSI)"
      : paymentMethod === "qris"
      ? "QRIS (Pakasir Gateway)"
      : `${paymentMethod.replace("_", " ").toUpperCase()} (Pakasir Gateway)`;

    const unitName = selectedChild.schoolUnit?.name || "Al Uswah";
    const className = selectedChild.className || "-";

    printOfficialReceipt({
      receiptNo: `KW-${selectedInvoice.year || 2026}-${selectedInvoice.id || selectedChild.studentNumber}`,
      payerName: user?.name || selectedChild.parent?.name || "Wali Murid",
      studentName: selectedChild.name,
      studentNis: selectedChild.studentNumber,
      unitAndClass: `Unit ${unitName} • Kelas ${className}`,
      paymentFor: periodName,
      paymentMethod: methodLabel,
      amount: Number(selectedInvoice.amount || 0),
    });
  };

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
      case "WALI_KELAS":
        return "from-amber-500/20 to-yellow-500/10 text-amber-405 border-amber-500/20";
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
        roles: ["SUPER_ADMIN", "UNIT_ADMIN", "WALI_KELAS"],
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
              <span className="text-xs font-bold tracking-wider text-amber-400 uppercase bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                Dashboard SIKUAT
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-gradient-to-br ${
                user ? getRoleBadgeColor(user.role) : ""
              }`}>
                {user?.role.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dashboard SIKUAT (Sistem Informasi Keuangan Al Uswah Terpadu)
            </h1>
            <p className="text-slate-400 text-xs font-medium">
              {getGreeting()}, <span className="text-white font-semibold">{user?.name}</span>
            </p>
            <div className="flex items-center gap-2 text-slate-400 text-xs mt-1.5">
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
                  : user?.role === "WALI_KELAS"
                  ? `Anda bertugas sebagai Wali Kelas ${user.className} pada unit ${user.schoolUnitId === 3 ? "SD" : `Unit ${user.schoolUnitId}`}. Anda dapat melihat daftar siswa bimbingan, tagihan bolong kelas Anda, dan mengirim pengingat WhatsApp.`
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
            {/* Visual Donut Chart of Revenue Sources */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md flex flex-col justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Analisis Sumber Pendapatan Sekolah
                </h3>
                <p className="text-[11px] text-slate-400">
                  Rasio kontribusi pos pemasukan dana terhadap total penerimaan.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* SVG Donut Chart */}
                <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                  {incomeBreakdown.length === 0 ? (
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800/60 animate-pulse"></div>
                  ) : (
                    <svg className="w-full h-full" viewBox="0 0 128 128">
                      {/* Base Background Circle */}
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        fill="transparent"
                        stroke="#1e293b"
                        strokeWidth="10"
                      />
                      {/* Category Segments */}
                      {(() => {
                        let cumulativePercent = 0;
                        return incomeBreakdown.map((item, idx) => {
                          const dashArray = `${(item.percentage / 100) * 314.16} 314.16`;
                          const dashOffset = -(cumulativePercent / 100) * 314.16;
                          cumulativePercent += item.percentage;
                          return (
                            <circle
                              key={idx}
                              cx="64"
                              cy="64"
                              r="50"
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="10"
                              strokeDasharray={dashArray}
                              strokeDashoffset={dashOffset}
                              transform="rotate(-90 64 64)"
                              className="transition-all duration-500 hover:stroke-[12] cursor-pointer"
                            >
                              <title>{`${item.name}: ${item.percentage}%`}</title>
                            </circle>
                          );
                        });
                      })()}
                    </svg>
                  )}
                  {/* Center Text inside Donut */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <span className="text-[9px] font-bold text-slate-450 uppercase mt-0.5 tracking-wider">Pemasukan</span>
                  </div>
                </div>

                {/* Categories Legend List */}
                <div className="flex-1 space-y-2 w-full">
                  {incomeBreakdown.length === 0 ? (
                    <div className="text-[11px] text-slate-500 animate-pulse">
                      Menghitung persentase kontribusi pemasukan...
                    </div>
                  ) : (
                    incomeBreakdown.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-slate-300 truncate max-w-[120px]">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white block">{formatRupiah(item.amount)}</span>
                          <span className="text-[9px] text-slate-500 block font-mono">{item.percentage}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800/50 pt-4 flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Pendapatan Terkumpul</span>
                <span className="font-bold text-emerald-450">
                  {formatRupiah(summary.totalIncome)}
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
                  to="/transactions"
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

      {/* Parent Child Tagihan Section */}
      {user?.role === "PARENT" && (
        <div className="space-y-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Informasi Keuangan & SPP Putra/Putri Anda
          </h2>

          {loadingChildren ? (
            <div className="bg-slate-900/40 border border-slate-800/80 p-8 rounded-2xl text-center text-xs text-slate-500 animate-pulse">
              Menganalisis data tagihan sekolah putra/putri...
            </div>
          ) : childrenList.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/80 p-8 rounded-2xl text-center text-slate-500 text-xs leading-normal">
              Belum ada data siswa yang ditautkan ke akun Anda. Silakan hubungi administrasi sekolah untuk mendaftarkan nomor HP ini ({user?.phoneNumber}).
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {childrenList.map((child) => {
                const childData = childrenInvoices[child.studentNumber];
                const sppMonths = childData?.sppMonths || [];
                const allDbInvoices = childData?.allDbInvoices || [];
                
                // Calculate development fund details
                const devInv = allDbInvoices.find((i: any) => i.invoiceType === "UANG_PENGEMBANGAN");
                const devPaid = devInv ? devInv.transactions.reduce((sum: number, tx: any) => sum + tx.amount, 0) : 0;
                const devTotal = devInv ? devInv.amount : 2000000;
                const devRemaining = devTotal - devPaid;
                const devPercentage = devTotal > 0 ? Math.round((devPaid / devTotal) * 100) : 0;

                return (
                  <div key={child.id} className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-md text-xs">
                    {/* Child Profile header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/50 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-extrabold text-white">{child.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 uppercase">
                            Unit {child.schoolUnit?.name || `Unit ${child.schoolUnitId}`}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500">
                          NIS: {child.studentNumber} • Kelas: {child.className} • Angkatan: {child.enrollmentYear}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {child.discountAmount > 0 && (
                          <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15 text-[10px] font-bold">
                            Potongan SPP: {formatRupiah(child.discountAmount)}
                          </span>
                        )}
                        <button
                          onClick={() => handleParentSync(child.studentNumber)}
                          disabled={syncingChild === child.studentNumber}
                          className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-indigo-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          title="Perbarui status pembayaran terbaru dari sistem"
                        >
                          <RefreshCw className={`w-3 h-3 ${syncingChild === child.studentNumber ? "animate-spin text-indigo-400" : ""}`} />
                          <span>{syncingChild === child.studentNumber ? "Menyinkronkan..." : "Sinkronkan Status"}</span>
                        </button>
                      </div>
                    </div>

                    {/* SPP 12 Months Grid */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        Status SPP Bulanan (Tahun {new Date().getFullYear()})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {sppMonths.map((m: any) => {
                          const isPaid = m.status === "PAID";
                          const MonthBoxContent = (
                            <>
                              <div className="flex justify-between items-start gap-1 w-full">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                  {MONTHS.find((item) => item.value === m.month)?.name}
                                </span>
                                {!isPaid && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[8px] font-bold tracking-wide transition-all shadow shadow-indigo-500/20 group-hover:bg-indigo-550">
                                    Bayar
                                  </span>
                                )}
                              </div>
                              <div className="space-y-0.5 mt-2 w-full text-left">
                                <p className="text-xs font-black font-mono">
                                  {formatRupiah(m.amount)}
                                </p>
                                <p className="text-[9px] font-semibold opacity-70">
                                  {m.status === "PAID"
                                    ? "Lunas"
                                    : m.status === "PARTIALLY_PAID"
                                    ? "Dicicil (Klik Bayar)"
                                    : "Belum Bayar (Klik Bayar)"}
                                </p>
                              </div>
                            </>
                          );

                          if (isPaid) {
                            return (
                              <div
                                key={m.month}
                                className="p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 text-emerald-400 flex flex-col justify-between min-h-[92px] transition-all"
                              >
                                {MonthBoxContent}
                              </div>
                            );
                          }

                          return (
                            <button
                              key={m.month}
                              onClick={() => handleOpenSnap(child, m)}
                              className={`p-3 rounded-xl border flex flex-col justify-between min-h-[92px] text-left w-full transition-all duration-200 cursor-pointer group hover:scale-[1.03] active:scale-[0.97] hover:shadow-lg hover:shadow-indigo-500/5 ${
                                m.status === "PARTIALLY_PAID"
                                  ? "bg-amber-500/5 border-amber-500/20 text-amber-400 hover:border-indigo-500/50 hover:bg-indigo-500/5"
                                  : "bg-red-500/5 border-red-500/20 text-red-400 hover:border-indigo-500/50 hover:bg-indigo-500/5"
                              }`}
                            >
                              {MonthBoxContent}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Other Fees (Fullday, Seragam, Ekstrakurikuler, dll.) */}
                    {childData?.otherFees && childData.otherFees.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-400" />
                          Tagihan Biaya Pendidikan Lainnya
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {childData.otherFees.map((fee: any) => {
                            const isFeePaid = fee.status === "PAID";
                            let typeLabel = fee.invoiceType;
                            if (fee.invoiceType === "FULLDAY") {
                              const monthName = MONTHS.find((m) => m.value === fee.month)?.name || fee.month;
                              typeLabel = `Biaya Fullday (${monthName} ${fee.year})`;
                            } else if (fee.invoiceType === "DAFTAR_ULANG") {
                              typeLabel = `Daftar Ulang (${fee.year})`;
                            } else if (fee.invoiceType === "SERAGAM") {
                              typeLabel = `Uang Seragam`;
                            } else if (fee.invoiceType === "UANG_PERALATAN") {
                              typeLabel = `Uang Peralatan`;
                            } else if (fee.invoiceType === "EKSTRAKURIKULER") {
                              typeLabel = `Uang Ekstrakurikuler`;
                            }

                            return (
                              <div
                                key={`${fee.invoiceType}-${fee.month}-${fee.year}`}
                                className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[90px] transition-all ${
                                  isFeePaid
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                                    : "bg-slate-950/60 border-slate-800 text-slate-300"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <p className="text-xs font-bold text-white">{typeLabel}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{formatRupiah(fee.amount)}</p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                    isFeePaid 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  }`}>
                                    {isFeePaid ? "Lunas" : "Belum Bayar"}
                                  </span>
                                </div>
                                {!isFeePaid && (
                                  <button
                                    onClick={() => handleOpenSnap(child, fee)}
                                    className="mt-3 w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] transition-all shadow shadow-indigo-600/20 cursor-pointer text-center"
                                  >
                                    Bayar Sekarang
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Development Fund installment status */}
                    <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-indigo-400" />
                            Uang Pengembangan (Dana Pembangunan)
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            Status cicilan nominal sumbangan pembangunan awal tahun ajaran.
                          </p>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border self-start sm:self-auto uppercase tracking-wide ${
                          devInv && devInv.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : devInv && devInv.status === "PARTIALLY_PAID"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-slate-800 text-slate-450 border-slate-700"
                        }`}>
                          {devInv && devInv.status === "PAID" ? "Lunas" : devInv && devInv.status === "PARTIALLY_PAID" ? "Dicicil" : "Belum Bayar"}
                        </span>
                      </div>

                      {/* Visual progress bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Terbayar: <b>{formatRupiah(devPaid)}</b></span>
                          <span>Total Tagihan: <b>{formatRupiah(devTotal)}</b></span>
                        </div>

                        <div className="h-2 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${devPercentage}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[9px] font-bold text-slate-500">
                          <span>Persentase: {devPercentage}%</span>
                          <span className={devRemaining > 0 ? "text-amber-450" : "text-emerald-450"}>
                            {devRemaining > 0 ? `Sisa Tagihan: ${formatRupiah(devRemaining)}` : "Sudah Lunas"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  to={item.href}
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

      {/* Midtrans Snap Modal Overlay for Parents */}
      {snapOpen && selectedInvoice && selectedChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in text-xs text-slate-800">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-scaleUp">
            
            {/* Header: Midtrans Logo & Close */}
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">
                  GATEWAY PEMBAYARAN ONLINE
                </span>
                <h3 className="font-extrabold text-indigo-600 text-base flex items-center gap-1">
                  SIKUAT <span className="text-slate-500 font-medium text-[11px] bg-slate-200/60 px-1.5 py-0.5 rounded ml-1">Pembayaran Resmi</span>
                </h3>
              </div>
              <button
                onClick={() => setSnapOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                disabled={processingPayment}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentSuccess ? (
              /* Success screen */
              <div className="p-8 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-650 border-2 border-emerald-400 mb-4">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900">Pembayaran Berhasil!</h4>
                <p className="text-[11px] text-slate-505 mt-1.5 max-w-xs leading-normal">
                  Pembayaran SPP bulan {MONTHS.find((m) => m.value === selectedInvoice.month)?.name} {selectedInvoice.year} untuk <b>{selectedChild.name}</b> telah sukses terverifikasi.
                </p>

                {/* Banner Pesan: Cetak Kwitansi atau Screenshot */}
                <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl p-3.5 mt-4 mb-2 text-left flex items-start gap-3 shadow-sm">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <h5 className="font-extrabold text-amber-950 text-xs">
                        Penting: Simpan Bukti Pembayaran
                      </h5>
                    </div>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
                      Silakan <strong>cetak kwitansi</strong> atau <strong>screenshot halaman ini</strong> sebagai bukti pembayaran sah Anda.
                    </p>
                  </div>
                </div>

                {/* Detail Ringkasan Transaksi */}
                <div className="w-full bg-slate-50 rounded-xl p-4 my-2 text-left border border-slate-100 space-y-2 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order ID / Ref</span>
                    <span className="font-mono font-medium text-slate-700">
                      {selectedInvoice.midtransOrderId || pakasirData?.orderId || "MOCK-MIDTRANS"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nama Siswa / NIS</span>
                    <span className="font-medium text-slate-700">
                      {selectedChild.name} ({selectedChild.studentNumber})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unit & Kelas</span>
                    <span className="font-medium text-slate-700">
                      Unit {selectedChild.schoolUnit?.name || "Al Uswah"} • Kelas {selectedChild.className || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tagihan</span>
                    <span className="font-medium text-slate-700">
                      {!selectedInvoice.invoiceType || selectedInvoice.invoiceType === "SPP"
                        ? `SPP ${MONTHS.find((m) => m.value === selectedInvoice.month)?.name} ${selectedInvoice.year}`
                        : `${selectedInvoice.invoiceType} ${selectedInvoice.year}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Metode</span>
                    <span className="font-bold text-indigo-650 uppercase">
                      {paymentMethod === "tf_manual" ? "Transfer Manual (BSI)" : paymentMethod.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase text-[9px]">
                      LUNAS / SAH
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-800 text-xs">
                    <span>Jumlah Bayar</span>
                    <span className="font-mono text-emerald-600 font-extrabold">{formatRupiah(selectedInvoice.amount)}</span>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="w-full space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handlePrintSuccessReceipt}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Kwitansi Pembayaran (PDF / Print)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSnapOpen(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Kembali Ke Dashboard
                  </button>
                </div>
              </div>
            ) : (
              /* Checkout screens */
              <div className="flex-1 flex flex-col">
                {/* Total Billing Info */}
                <div className="bg-indigo-50/70 px-6 py-4 flex items-center justify-between border-b border-indigo-100">
                  <div className="text-[11px]">
                    <span className="text-slate-500">
                      {selectedInvoice.invoiceType && selectedInvoice.invoiceType !== "SPP" ? "Tagihan Biaya Sekolah" : "Tagihan SPP"}
                    </span>
                    <h5 className="font-extrabold text-slate-850 text-xs mt-0.5">
                      {selectedInvoice.invoiceType && selectedInvoice.invoiceType !== "SPP" 
                        ? `${selectedInvoice.invoiceType} - ${selectedInvoice.year}`
                        : `Bulan ${MONTHS.find((m) => m.value === selectedInvoice.month)?.name} ${selectedInvoice.year}`}
                    </h5>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-indigo-700 text-base block">
                      {pakasirData?.payment?.total_payment 
                        ? formatRupiah(pakasirData.payment.total_payment)
                        : formatRupiah(selectedInvoice.amount)}
                    </span>
                    {pakasirData?.payment?.fee > 0 && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Biaya layanan: {formatRupiah(pakasirData.payment.fee)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Main panel - Methods */}
                <div className="p-6 space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Metode Pembayaran
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* QRIS */}
                    <button
                      onClick={() => handleSelectPaymentMethod("qris")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 cursor-pointer ${
                        paymentMethod === "qris"
                          ? "border-indigo-600 bg-indigo-50/45 text-indigo-750"
                          : "border-slate-100 hover:border-slate-300 text-slate-655 bg-slate-50/30"
                      }`}
                    >
                      <QrCode className="w-5 h-5" />
                      <span className="text-[10px] font-bold">QRIS (GoPay/OVO/Shopee)</span>
                    </button>

                    {/* VA Mandiri */}
                    <button
                      onClick={() => handleSelectPaymentMethod("va_mandiri")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 cursor-pointer ${
                        paymentMethod === "va_mandiri"
                          ? "border-indigo-600 bg-indigo-50/45 text-indigo-750"
                          : "border-slate-100 hover:border-slate-300 text-slate-655 bg-slate-50/30"
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Mandiri VA</span>
                    </button>

                    {/* VA BCA */}
                    <button
                      onClick={() => handleSelectPaymentMethod("va_bca")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 cursor-pointer ${
                        paymentMethod === "va_bca"
                          ? "border-indigo-600 bg-indigo-50/45 text-indigo-750"
                          : "border-slate-100 hover:border-slate-300 text-slate-655 bg-slate-50/30"
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="text-[10px] font-bold">BCA VA</span>
                    </button>

                    {/* Transfer Manual BSI */}
                    <button
                      onClick={() => handleSelectPaymentMethod("tf_manual")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 cursor-pointer ${
                        paymentMethod === "tf_manual"
                          ? "border-indigo-600 bg-indigo-50/45 text-indigo-755"
                          : "border-slate-100 hover:border-slate-300 text-slate-655 bg-slate-50/30"
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Transfer Manual (BSI)</span>
                    </button>
                  </div>

                  {/* Payment Details Container */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                    {paymentMethod === "qris" ? (
                      <div className="flex flex-col items-center text-center space-y-2.5 py-1">
                        {pakasirLoading ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-[11px] text-slate-500 font-medium">Membuat Transaksi QRIS Pakasir...</span>
                          </div>
                        ) : pakasirData?.payment?.payment_number ? (
                          <>
                            <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pakasirData.payment.payment_number)}`}
                                alt="QRIS Pakasir"
                                className="w-44 h-44 object-contain mx-auto"
                              />
                            </div>
                            {secondsLeft > 0 && (
                              <div className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                                <span>Bayar sebelum {formatCountdown(secondsLeft)}</span>
                              </div>
                            )}
                            <p className="text-[9px] text-slate-500 leading-normal max-w-xs">
                              Pindai kode QRIS di atas dengan GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, atau Mobile Banking lainnya. Status akan terverifikasi otomatis.
                            </p>

                            {/* Trigger Simulasi QRIS Terbayar untuk Testing */}
                            <div className="w-full pt-3 border-t border-slate-200/80 mt-1 space-y-1">
                              <button
                                type="button"
                                onClick={handleSimulatePakasirPayment}
                                disabled={simulatingPayment || pakasirLoading}
                                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                title="Tes Fitur: Simulasikan transaksi QRIS Pakasir ini telah dibayar sukses"
                              >
                                {simulatingPayment ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Memproses Simulasi Lunas...</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4 fill-white" />
                                    <span>⚡ [Tes Fitur] Simulasi QRIS Terbayar (Pakasir Sukses)</span>
                                  </>
                                )}
                              </button>
                              <p className="text-[9.5px] text-slate-400 text-center">
                                Klik tombol di atas untuk menguji alur verifikasi otomatis tanpa perlu transfer uang sungguhan.
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="py-6 text-slate-500 text-xs">
                            Gagal memuat QRIS. Silakan coba klik ulang metode QRIS atau gunakan Transfer Manual BSI.
                          </div>
                        )}
                      </div>
                    ) : paymentMethod === "va_mandiri" || paymentMethod === "va_bca" ? (
                      <div className="space-y-2 text-xs text-slate-750">
                        {pakasirLoading ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-[11px] text-slate-500 font-medium">Membuat Virtual Account Pakasir...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                                Nomor Virtual Account ({paymentMethod === "va_mandiri" ? "Mandiri" : "BCA"})
                              </span>
                              {secondsLeft > 0 && (
                                <span className="text-[10px] text-amber-600 font-bold">
                                  Kedaluwarsa: {formatCountdown(secondsLeft)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between bg-white px-3 py-2.5 rounded-lg border border-slate-200 shadow-sm">
                              <span className="font-mono font-bold text-slate-800 text-sm tracking-wider">
                                {vaNumber || pakasirData?.payment?.payment_number || "Menunggu nomor..."}
                              </span>
                              <button
                                onClick={() => copyToClipboard(vaNumber || pakasirData?.payment?.payment_number || "")}
                                className="text-indigo-650 hover:text-indigo-850 p-1 flex items-center gap-1 cursor-pointer font-bold text-xs"
                              >
                                {copied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-normal">
                              Gunakan nomor Virtual Account di atas untuk transfer melalui ATM, Mobile Banking, atau Internet Banking Anda.
                            </p>

                            {/* Trigger Simulasi VA Terbayar untuk Testing */}
                            <div className="w-full pt-3 border-t border-slate-200/80 mt-1 space-y-1">
                              <button
                                type="button"
                                onClick={handleSimulatePakasirPayment}
                                disabled={simulatingPayment || pakasirLoading}
                                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                title="Tes Fitur: Simulasikan transfer VA Pakasir ini telah dibayar sukses"
                              >
                                {simulatingPayment ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Memproses Simulasi Lunas...</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4 fill-white" />
                                    <span>⚡ [Tes Fitur] Simulasi VA Terbayar (Pakasir Sukses)</span>
                                  </>
                                )}
                              </button>
                              <p className="text-[9.5px] text-slate-400 text-center">
                                Klik tombol di atas untuk menguji alur verifikasi otomatis tanpa perlu transfer uang sungguhan.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ) : paymentMethod === "tf_manual" ? (
                      <div className="space-y-2 text-xs text-slate-750">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                          Rekening Transfer Manual
                        </span>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                          <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 text-[11px]">
                            <span className="text-slate-400">Bank</span>
                            <span className="font-bold text-slate-850">BSI (Bank Syariah Indonesia)</span>
                          </div>
                          <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 text-[11px]">
                            <span className="text-slate-400">Nomor Rekening</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-slate-850 tracking-wide">
                                7356970432
                              </span>
                              <button
                                onClick={() => copyToClipboard("7356970432")}
                                className="text-indigo-650 hover:text-indigo-850 p-0.5 flex items-center gap-0.5 cursor-pointer font-bold"
                              >
                                {copied ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Salin</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">Atas Nama</span>
                            <span className="font-bold text-slate-850">Yayasan Al-Uswah</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-500 leading-normal">
                          Silakan transfer ke rekening BSI di atas. Setelah transfer, klik tombol di bawah untuk mengirimkan bukti transfer via WhatsApp ke admin sekolah agar diverifikasi.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Footer Pay Button */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  {paymentMethod === "tf_manual" ? (
                    <button
                      onClick={handleWhatsAppRedirect}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Kirim Bukti & Konfirmasi via WhatsApp</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                        <span>Menunggu verifikasi pembayaran otomatis...</span>
                      </div>
                      <button
                        onClick={() => setSnapOpen(false)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
