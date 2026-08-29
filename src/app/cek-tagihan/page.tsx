"use client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Search,
  ArrowLeft,
  User,
  School,
  Calendar,
  Percent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  X,
  Copy,
  Check,
  QrCode,
  Building2,
  Wallet,
  ArrowRight,
  Download
} from "lucide-react";

interface StudentInfo {
  id: number;
  studentNumber: string;
  name: string;
  className: string;
  enrollmentYear: number;
  discountAmount: number;
  schoolUnit: {
    name: string;
  };
  parent: {
    name: string;
    email: string;
  };
}

interface Invoice {
  id: number | null;
  studentId: number;
  invoiceType: string;
  month: number;
  year: number;
  baseAmount: number;
  discountApplied: number;
  amount: number;
  status: "PENDING" | "PAID";
  midtransOrderId: string | null;
}

const INDONESIAN_MONTHS = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function CekTagihanPage() {
  const [studentNumber, setStudentNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState("");

  // Midtrans Snap Modal State (Pakasir Integration)
  const [snapOpen, setSnapOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoicesList, setSelectedInvoicesList] = useState<Invoice[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bni_va" | "bri_va" | "cimb_niaga_va" | "tf_manual">("qris");
  const [vaNumber] = useState(() => `89022${Math.floor(1000000000 + Math.random() * 9000000000)}`);
  const [copied, setCopied] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Pakasir specific states
  const [pakasirLoading, setPakasirLoading] = useState(false);
  const [pakasirData, setPakasirData] = useState<any>(null);
  const [realVaNumber, setRealVaNumber] = useState("");
  
  // New Payment Flow Steps
  const [checkoutStep, setCheckoutStep] = useState<"SELECT_METHOD" | "METHOD_PREVIEW" | "PAYMENT_DETAILS">("SELECT_METHOD");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [manualExpiredAt, setManualExpiredAt] = useState<string | null>(null);

  const getPaymentFeeText = (method: string, baseAmount: number) => {
    if (method === "tf_manual") {
      return "Gratis (Sesama BSI) / Rp 2.500 (Bank Lain)";
    }
    if (method === "qris") {
      const fee = Math.round(baseAmount * 0.008);
      return `${formatRupiah(fee)} (0,8%)`;
    }
    return formatRupiah(3500); // VA fee
  };

  const getPaymentTotalText = (method: string, baseAmount: number) => {
    if (method === "tf_manual") {
      const totalOther = baseAmount + 2500;
      return `${formatRupiah(baseAmount)} (Sesama BSI) / ${formatRupiah(totalOther)} (Bank Lain)`;
    }
    if (method === "qris") {
      const total = baseAmount + Math.round(baseAmount * 0.008);
      return formatRupiah(total);
    }
    return formatRupiah(baseAmount + 3500); // VA total
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case "qris": return "QRIS (GoPay/ShopeePay)";
      case "bni_va": return "BNI Virtual Account";
      case "bri_va": return "BRI Virtual Account";
      case "cimb_niaga_va": return "CIMB Niaga Virtual Account";
      case "tf_manual": return "Transfer Manual (BSI)";
      default: return "Metode Pembayaran";
    }
  };

  const getPaymentInstructions = (method: string) => {
    switch (method) {
      case "qris":
        return [
          "Buka aplikasi e-wallet (GoPay, OVO, Dana, LinkAja, ShopeePay) atau m-Banking Anda.",
          "Scan kode QRIS yang muncul di layar pembayaran.",
          "Periksa nominal pembayaran dan pastikan penerima adalah Yayasan Al Uswah / Pakasir.",
          "Masukkan PIN e-wallet/bank Anda untuk menyelesaikan pembayaran.",
          "Selesai! Sistem akan mendeteksi pelunasan secara otomatis."
        ];
      case "bni_va":
      case "bri_va":
      case "cimb_niaga_va":
        const bankName = method.split("_")[0].toUpperCase();
        return [
          `Salin nomor Virtual Account ${bankName} yang tertera di layar.`,
          `Buka aplikasi Mobile Banking Anda atau kunjungi ATM terdekat.`,
          `Pilih menu Transfer > Virtual Account Billing (atau sejenisnya).`,
          `Masukkan nomor Virtual Account ${bankName} yang telah disalin.`,
          `Periksa nominal tagihan yang muncul, lalu masukkan PIN bank Anda untuk konfirmasi.`
        ];
      case "tf_manual":
        return [
          "Lakukan transfer manual ke rekening Bank Syariah Indonesia (BSI) Yayasan Al-Uswah.",
          "Nomor Rekening: 7356970432.",
          "Biaya layanan gratis jika menggunakan sesama rekening BSI, atau dikenakan Rp 2.500 jika transfer dari bank lain.",
          "Setelah transfer selesai, pastikan Anda menyimpan foto atau screenshot bukti transaksi.",
          "Klik tombol 'Kirim Bukti via WhatsApp' di halaman pembayaran untuk konfirmasi ke Admin."
        ];
      default:
        return [];
    }
  };

  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;

    const pad = (num: number) => String(num).padStart(2, "0");

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };


  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim()) {
      setError("Silakan masukkan NIS siswa terlebih dahulu");
      return;
    }

    setLoading(true);
    setError("");
    setStudent(null);
    setInvoices([]);
    setCheckedKeys([]);

    try {
      // 1. Fetch invoices
      const response = await api.get(`/invoices/student/${studentNumber.trim()}?year=${selectedYear}`);
      
      if (response.data.success && response.data.data.length > 0) {
        setInvoices(response.data.data);
        
        // Use student profile returned directly from the public invoices endpoint
        const foundStudent = response.data.student;

        if (foundStudent) {
          setStudent(foundStudent);
        } else {
          // Fallback if student details cannot be fully fetched
          setStudent({
            id: response.data.data[0].studentId,
            studentNumber: studentNumber.trim(),
            name: "Siswa Terdaftar",
            className: "",
            enrollmentYear: response.data.data[0].year,
            discountAmount: 0,
            schoolUnit: { name: "Unit Sekolah" },
            parent: { name: "-", email: "-" }
          });
        }
      } else {
        setError("Siswa tidak ditemukan atau tagihan belum dibuat.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError(
          "Demi menjaga privasi siswa, rincian tagihan keuangan saat ini hanya dapat diakses setelah masuk ke akun Wali Murid terdaftar."
        );
      } else {
        setError(
          err.response?.data?.message ||
          "Gagal menghubungi server. Pastikan database dan server backend aktif."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-refetch when selectedYear changes and student is searched
  useEffect(() => {
    if (student && studentNumber.trim()) {
      api.get(`/invoices/student/${studentNumber.trim()}?year=${selectedYear}`)
        .then((res) => {
          if (res.data.success && res.data.data) {
            setInvoices(res.data.data);
          }
        })
        .catch((err) => console.error("Gagal update invoice per tahun", err));
    }
  }, [selectedYear]);

  const fetchPakasirTransaction = async (method: string, targetInvoices: Invoice[]) => {
    if (method === "tf_manual") {
      setPakasirData(null);
      return;
    }
    setPakasirLoading(true);
    try {
      const response = await api.post("/invoices/pakasir/create", {
        studentNumber: student?.studentNumber || studentNumber,
        paymentMethod: method,
        invoices: targetInvoices.map((inv) => ({
          month: inv.month,
          year: inv.year,
          invoiceType: inv.invoiceType,
        })),
      });

      if (response.data.success) {
        setPakasirData(response.data.data);
        if (method !== "qris") {
          setRealVaNumber(response.data.data.payment.payment_number);
        }
      } else {
        alert(response.data.message || "Gagal membuat pembayaran");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Gagal memproses pembayaran");
    } finally {
      setPakasirLoading(false);
    }
  };

  const toggleInvoiceCheck = (inv: Invoice) => {
    const key = `${inv.invoiceType}-${inv.month}-${inv.year}`;
    setCheckedKeys((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  const isInvoiceChecked = (inv: Invoice) => {
    const key = `${inv.invoiceType}-${inv.month}-${inv.year}`;
    return checkedKeys.includes(key);
  };

  const handleOpenSnap = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSelectedInvoicesList([invoice]);
    setSnapOpen(true);
    setPaymentSuccess(false);
    setProcessingPayment(false);
    setPakasirData(null);
    setRealVaNumber("");
    setCheckoutStep("SELECT_METHOD");
    setSecondsLeft(null);
    setManualExpiredAt(null);
  };

  const handleOpenSnapBatch = () => {
    const selected = invoices.filter((inv) => {
      const key = `${inv.invoiceType}-${inv.month}-${inv.year}`;
      return checkedKeys.includes(key) && inv.status === "PENDING";
    });
    if (selected.length === 0) return;
    setSelectedInvoice(selected[0]);
    setSelectedInvoicesList(selected);
    setSnapOpen(true);
    setPaymentSuccess(false);
    setProcessingPayment(false);
    setPakasirData(null);
    setRealVaNumber("");
    setCheckoutStep("SELECT_METHOD");
    setSecondsLeft(null);
    setManualExpiredAt(null);
  };

  const handleSelectMethod = (method: "qris" | "bni_va" | "bri_va" | "cimb_niaga_va" | "tf_manual") => {
    setPaymentMethod(method);
    setCheckoutStep("METHOD_PREVIEW");
  };

  const handleConfirmPayment = () => {
    setCheckoutStep("PAYMENT_DETAILS");
    if (paymentMethod === "tf_manual") {
      setManualExpiredAt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    } else if (selectedInvoicesList.length > 0) {
      fetchPakasirTransaction(paymentMethod, selectedInvoicesList);
    }
  };


  const handleCheckStatusManual = async () => {
    if (!pakasirData) return;
    setProcessingPayment(true);
    try {
      const response = await api.get(
        `/invoices/pakasir/status?order_id=${pakasirData.orderId}&amount=${pakasirData.amount}`
      );
      if (response.data.success && response.data.status === "completed") {
        setPaymentSuccess(true);
        const updatedInvoices = invoices.map((inv) => {
          const isPart = selectedInvoicesList.some(
            (sel) =>
              sel.invoiceType === inv.invoiceType &&
              sel.month === inv.month &&
              sel.year === inv.year
          );
          if (isPart) {
            return {
              ...inv,
              status: "PAID" as const,
              midtransOrderId: pakasirData.orderId,
            };
          }
          return inv;
        });
        setInvoices(updatedInvoices);
        setCheckedKeys([]);
      } else {
        alert("Pembayaran belum terdeteksi. Silakan lakukan pembayaran terlebih dahulu.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Gagal memeriksa status pembayaran");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSimulatePakasirPayment = async () => {
    if (!pakasirData) return;
    setProcessingPayment(true);
    try {
      const response = await api.post("/invoices/pakasir/simulate", {
        orderId: pakasirData.orderId,
        amount: pakasirData.amount,
      });

      if (response.data.success) {
        await handleCheckStatusManual();
      } else {
        alert(response.data.message || "Gagal memicu simulasi lunas");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Gagal memicu simulasi lunas");
    } finally {
      setProcessingPayment(false);
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
            const updatedInvoices = invoices.map((inv) => {
              const isPart = selectedInvoicesList.some(
                (sel) =>
                  sel.invoiceType === inv.invoiceType &&
                  sel.month === inv.month &&
                  sel.year === inv.year
              );
              if (isPart) {
                return {
                  ...inv,
                  status: "PAID" as const,
                  midtransOrderId: pakasirData.orderId,
                };
              }
              return inv;
            });
            setInvoices(updatedInvoices);
            setCheckedKeys([]);
          }
        } catch (err) {
          console.error("Gagal polling status pembayaran:", err);
        }
      };

      // Run status check immediately and then every 5 seconds
      checkStatus();
      intervalId = setInterval(checkStatus, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [snapOpen, pakasirData, paymentSuccess, paymentMethod, invoices, selectedInvoicesList]);

  // Countdown Timer Effect
  useEffect(() => {
    let timerId: any = null;
    const targetExpiredAt = paymentMethod === "tf_manual" ? manualExpiredAt : pakasirData?.payment?.expired_at;
    
    if (checkoutStep === "PAYMENT_DETAILS" && targetExpiredAt) {
      const calculateSecondsLeft = () => {
        const diffMs = new Date(targetExpiredAt).getTime() - new Date().getTime();
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
        setSecondsLeft(diffSecs);
      };
      
      calculateSecondsLeft();
      timerId = setInterval(() => {
        const diffMs = new Date(targetExpiredAt).getTime() - new Date().getTime();
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
        setSecondsLeft(diffSecs);
        if (diffSecs <= 0) {
          clearInterval(timerId);
        }
      }, 1000);
    } else {
      setSecondsLeft(null);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [checkoutStep, pakasirData, paymentMethod, manualExpiredAt]);

  const handleSimulatePayment = async () => {
    if (selectedInvoicesList.length === 0) return;

    setProcessingPayment(true);
    try {
      const payload = {
        studentNumber: student?.studentNumber || studentNumber,
        invoices: selectedInvoicesList.map((inv) => ({
          month: inv.month,
          year: inv.year,
          invoiceType: inv.invoiceType,
        })),
      };

      const response = await api.post("/invoices/pay-online-simulated", payload);

      if (response.data.success) {
        setPaymentSuccess(true);
        // Refresh invoice list
        const updatedInvoices = invoices.map((inv) => {
          const isPart = selectedInvoicesList.some(
            (sel) =>
              sel.invoiceType === inv.invoiceType &&
              sel.month === inv.month &&
              sel.year === inv.year
          );
          if (isPart) {
            return {
              ...inv,
              status: "PAID" as const,
              midtransOrderId: response.data.data.midtransOrderId,
            };
          }
          return inv;
        });
        setInvoices(updatedInvoices);
        setCheckedKeys([]);
      } else {
        alert(response.data.message || "Gagal memproses pembayaran");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Gagal memproses simulasi pembayaran");
    } finally {
      setProcessingPayment(false);
    }
  };

  const getWhatsAppLink = () => {
    if (selectedInvoicesList.length === 0) return "#";
    const studentName = student?.name || "Siswa";
    const nis = student?.studentNumber || studentNumber;

    let itemsDetailsText = "";
    selectedInvoicesList.forEach((inv) => {
      let typeStr = inv.invoiceType;
      if (inv.invoiceType === "UANG_PENGEMBANGAN") typeStr = "Uang Pengembangan";
      else if (inv.invoiceType === "DAFTAR_ULANG") typeStr = "Daftar Ulang";
      else if (inv.invoiceType === "UANG_PERALATAN") typeStr = "Uang Peralatan";
      else if (inv.invoiceType === "EKSTRAKURIKULER") typeStr = "Ekstrakurikuler";
      else if (inv.invoiceType === "SERAGAM") typeStr = "Seragam";
      else if (inv.invoiceType === "FULLDAY") typeStr = "Uang Fullday";

      const period = (inv.invoiceType === "SPP" || inv.invoiceType === "FULLDAY")
        ? `${INDONESIAN_MONTHS[inv.month]} ${inv.year}`
        : "Pendaftaran Siswa Baru";

      itemsDetailsText += `- *Jenis:* ${typeStr} (${period}) -> *Nominal:* ${formatRupiah(inv.amount)}\n`;
    });

    const totalStr = formatRupiah(selectedInvoicesList.reduce((sum, inv) => sum + inv.amount, 0));

    const message = `Halo Admin, saya ingin mengonfirmasi pembayaran tagihan secara manual.\n\n` +
      `*Data Siswa:*\n` +
      `- *Nama Siswa:* ${studentName}\n` +
      `- *NIS:* ${nis}\n\n` +
      `*Rincian Pembayaran:*\n` +
      itemsDetailsText +
      `\n*Total Nominal:* *${totalStr}*\n\n` +
      `Berikut saya lampirkan bukti transfer. Terima kasih.`;

    return `https://wa.me/6289678331076?text=${encodeURIComponent(message)}`;
  };

  const handleWhatsAppRedirect = () => {
    window.open(getWhatsAppLink(), "_blank");
  };

  const fallbackDirectDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `QRIS_${student?.studentNumber || studentNumber}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const downloadQris = async (qrisDataString: string, totalPayment?: number) => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&format=png&data=${encodeURIComponent(qrisDataString)}`;
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Gagal memuat gambar QRIS"));
        img.src = qrUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 760;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Background Banner
        ctx.fillStyle = "#1e1b4b"; // Dark Indigo
        ctx.fillRect(0, 0, canvas.width, 100);

        // Header Title
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("QRIS - PEMBAYARAN SIKUAT", canvas.width / 2, 45);

        ctx.fillStyle = "#fbbf24"; // Amber
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("Yayasan Al Uswah Terpadu", canvas.width / 2, 75);

        // Student Info
        ctx.fillStyle = "#334155";
        ctx.font = "14px sans-serif";
        const studentInfo = student ? `${student.name} (${student.studentNumber})` : `NIS: ${studentNumber}`;
        ctx.fillText(studentInfo, canvas.width / 2, 130);

        // Draw QR Code (with ample quiet zone padding)
        const qrSize = 420;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 150;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // Footer Card: Total Amount
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(40, 590, canvas.width - 80, 80);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.strokeRect(40, 590, canvas.width - 80, 80);

        ctx.fillStyle = "#64748b";
        ctx.font = "12px sans-serif";
        ctx.fillText("TOTAL PEMBAYARAN", canvas.width / 2, 615);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 24px monospace";
        const totalText = totalPayment ? formatRupiah(totalPayment) : (selectedInvoice ? formatRupiah(selectedInvoice.amount) : "Sesuai Tagihan");
        ctx.fillText(totalText, canvas.width / 2, 650);

        // Scan Instructions
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px sans-serif";
        ctx.fillText("Scan menggunakan BCA, Mandiri, BRI, BSI, GoPay, OVO, Dana, ShopeePay", canvas.width / 2, 705);
        ctx.fillText("atau aplikasi Mobile Banking / e-Wallet lainnya", canvas.width / 2, 725);

        canvas.toBlob((blob) => {
          if (!blob) {
            fallbackDirectDownload(qrUrl);
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `QRIS_${student?.studentNumber || studentNumber}_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, "image/png");
      } else {
        fallbackDirectDownload(qrUrl);
      }
    } catch (err) {
      console.error("Gagal generate QRIS canvas", err);
      const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&format=png&data=${encodeURIComponent(qrisDataString)}`;
      fallbackDirectDownload(fallbackUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        
        {/* Top Navbar */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800/60">
          <Link
            to="/login"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Login</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                Portal Publik Wali Murid
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-10">
          <img
            src="/logo-sikuat.png"
            alt="SIKUAT Logo"
            className="w-24 h-24 mx-auto object-contain mb-3 drop-shadow-lg"
          />
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            SIKUAT - Pembayaran SPP Online
          </h1>
          <p className="text-amber-400 font-semibold text-xs mt-1">
            Sistem Informasi Keuangan Al Uswah Terpadu
          </p>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Masukkan Nomor Induk Siswa (NIS) untuk melihat rincian tagihan bulanan dan melakukan pembayaran SPP secara instant.
          </p>
        </div>

        {/* Search Box Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-xl mb-8">
          <form onSubmit={handleSearch} className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Masukkan NIS Siswa (contoh: TK-2025-001)"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white pl-11 pr-4 py-3.5 rounded-xl text-sm placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono tracking-wide"
                disabled={loading}
              />
            </div>

            <div className="flex gap-2 sm:gap-0">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-white px-4 py-3.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={loading}
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Cek Tagihan</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 flex flex-col gap-3.5 bg-red-950/45 border border-red-500/35 p-4 rounded-xl text-sm text-red-400">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {error.includes("akun") && (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md w-full sm:w-auto self-start cursor-pointer"
                >
                  <span>Masuk ke Portal Wali Murid</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Student Profile Card & Invoices */}
        {student && (
          <div className="space-y-6 animate-fadeIn">
            {/* Student Profile Details */}
            <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/40 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{student.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      NIS: <span className="text-slate-200">{student.studentNumber}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-slate-500" />
                      {student.schoolUnit?.name || "Unit Sekolah"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Angkatan {student.enrollmentYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discount / Parent Info */}
              <div className="flex flex-col gap-1.5 md:text-right border-t border-slate-800 md:border-t-0 pt-4 md:pt-0">
                <p className="text-xs text-slate-400">
                  Wali: <span className="text-slate-200 font-medium">{student.parent?.name}</span> ({student.parent?.email})
                </p>
                {student.discountAmount > 0 && (
                  <div className="inline-flex md:self-end items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400">
                    <Percent className="w-3 h-3" />
                    Potongan SPP {formatRupiah(student.discountAmount)}
                  </div>
                )}
              </div>
            </div>

            {/* Invoices Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-slate-300 tracking-wide uppercase">
                  {student.className.toUpperCase() === "PPDB"
                    ? "Daftar Tagihan Penerimaan Siswa Baru (PPDB)"
                    : `Daftar Tagihan SPP Bulanan - Tahun ${selectedYear}`}
                </h4>
                <span className="text-xs text-slate-400">
                  Total {invoices.length} tagihan ditemukan
                </span>
              </div>

              <div className="grid gap-3.5">
                {invoices.map((invoice) => {
                  const isPaid = invoice.status === "PAID";
                  const key = `${invoice.invoiceType}-${invoice.month}-${invoice.year}`;
                  return (
                    <div
                      key={key}
                      className={`bg-slate-900/40 border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-900/60 ${
                        isPaid ? "border-emerald-500/20" : "border-slate-800/80"
                      }`}
                    >
                      {/* Left: Invoice Month & Year */}
                      <div className="flex items-center gap-4 flex-1">
                        {!isPaid && (
                          <input
                            type="checkbox"
                            checked={isInvoiceChecked(invoice)}
                            onChange={() => toggleInvoiceCheck(invoice)}
                            className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                        )}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {invoice.invoiceType === "SPP"
                            ? "SP"
                            : invoice.invoiceType === "UANG_PENGEMBANGAN"
                            ? "UP"
                            : invoice.invoiceType === "DAFTAR_ULANG"
                            ? "DU"
                            : invoice.invoiceType === "UANG_PERALATAN"
                            ? "PR"
                            : invoice.invoiceType === "EKSTRAKURIKULER"
                            ? "EK"
                            : invoice.invoiceType === "SERAGAM"
                            ? "SG"
                            : invoice.invoiceType === "FULLDAY"
                            ? "FD"
                            : "LN"}
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-white">
                            {invoice.invoiceType === "SPP"
                              ? `SPP Bulan ${INDONESIAN_MONTHS[invoice.month]}`
                              : invoice.invoiceType === "FULLDAY"
                              ? `Program Fullday Bulan ${INDONESIAN_MONTHS[invoice.month]}`
                              : invoice.invoiceType === "UANG_PENGEMBANGAN"
                              ? "Uang Pengembangan"
                              : invoice.invoiceType === "DAFTAR_ULANG"
                              ? "Daftar Ulang"
                              : invoice.invoiceType === "UANG_PERALATAN"
                              ? "Uang Peralatan"
                              : invoice.invoiceType === "EKSTRAKURIKULER"
                              ? "Biaya Ekstrakurikuler"
                              : invoice.invoiceType === "SERAGAM"
                              ? "Biaya Seragam"
                              : "Tagihan Lainnya"}
                          </h5>
                          <span className="text-xs text-slate-400">
                            {(invoice.invoiceType === "SPP" || invoice.invoiceType === "FULLDAY")
                              ? `Tahun ${invoice.year}`
                              : "Pendaftaran Siswa Baru"}
                          </span>
                        </div>
                      </div>

                      {/* Center: Financial Details */}
                      <div className="flex flex-col sm:text-right">
                        <span className="text-xs text-slate-400">Total Tagihan</span>
                        <div className="flex items-baseline gap-2 justify-start sm:justify-end">
                          <span className="font-bold text-white text-base">
                            {formatRupiah(invoice.amount)}
                          </span>
                          {invoice.discountApplied > 0 && (
                            <span className="text-[10px] text-slate-500 line-through">
                              {formatRupiah(invoice.baseAmount)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Status / Pay Button */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {isPaid ? (
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-400 shadow-sm shadow-emerald-500/5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Lunas</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenSnap(invoice)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Bayar Online</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Batch Action Bar */}
              {checkedKeys.length > 0 && (
                <div className="mt-6 bg-indigo-950/40 border border-indigo-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-slideIn">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                      Terpilih {checkedKeys.length} Tagihan
                    </p>
                    <h4 className="text-xl font-extrabold text-white mt-1">
                      Total: {formatRupiah(invoices.filter(isInvoiceChecked).reduce((sum, inv) => sum + inv.amount, 0))}
                    </h4>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setCheckedKeys([])}
                      className="flex-1 sm:flex-initial px-4 py-2 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleOpenSnapBatch}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Bayar Online Terpilih</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Midtrans Snap Modal Overlay */}
      {snapOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          {/* Snap Container */}
          <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-scaleUp max-h-[92vh]">
            
            {/* Header: Midtrans Logo & Total */}
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[8px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">
                  GATEWAY PEMBAYARAN ONLINE
                </span>
                <h3 className="font-extrabold text-indigo-600 text-sm flex items-center gap-1">
                  SIKUAT <span className="text-slate-500 font-medium text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded ml-1">Pembayaran Resmi</span>
                </h3>
              </div>
              <button
                onClick={() => setSnapOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                disabled={processingPayment}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentSuccess ? (
              /* Success screen */
              <div className="p-8 flex flex-col items-center justify-center text-center animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border-2 border-emerald-400 animate-pulse mb-6">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h4 className="font-extrabold text-xl text-slate-900">Pembayaran Sukses!</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-xs">
                  Pembayaran untuk {selectedInvoicesList.length} tagihan telah berhasil diproses secara lunas.
                </p>

                <div className="w-full bg-slate-50 rounded-xl p-4 my-4 text-left border border-slate-100 space-y-2 text-xs max-h-[220px] overflow-y-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order ID</span>
                    <span className="font-mono font-medium text-slate-700">
                      {pakasirData?.orderId || "BATCH-MOCK-MIDTRANS"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nama Siswa</span>
                    <span className="font-medium text-slate-700">{student?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="text-slate-400">Metode</span>
                    <span className="font-bold text-indigo-600 uppercase">
                      {paymentMethod === "tf_manual" ? "Transfer Manual (BSI)" : paymentMethod.replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Item Lunas:</span>
                    {selectedInvoicesList.map((inv, idx) => {
                      let typeStr = inv.invoiceType;
                      if (inv.invoiceType === "SPP") typeStr = `SPP ${INDONESIAN_MONTHS[inv.month]}`;
                      else if (inv.invoiceType === "FULLDAY") typeStr = `Uang Fullday ${INDONESIAN_MONTHS[inv.month]}`;
                      else if (inv.invoiceType === "UANG_PENGEMBANGAN") typeStr = "Uang Pengembangan";
                      else if (inv.invoiceType === "DAFTAR_ULANG") typeStr = "Daftar Ulang";
                      else if (inv.invoiceType === "UANG_PERALATAN") typeStr = "Uang Peralatan";
                      else if (inv.invoiceType === "EKSTRAKURIKULER") typeStr = "Ekstrakurikuler";
                      else if (inv.invoiceType === "SERAGAM") typeStr = "Seragam";

                      return (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-600 pl-2 border-l border-indigo-400/30">
                          <span>{typeStr}</span>
                          <span>{formatRupiah(inv.amount)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between border-t border-slate-200/80 pt-2 font-bold text-slate-800 text-sm">
                    <span>Total Pembayaran</span>
                    <span>{formatRupiah(selectedInvoicesList.reduce((sum, inv) => sum + inv.amount, 0))}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSnapOpen(false)}
                  className="w-full bg-slate-950 text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-850 transition-all shadow-lg shadow-slate-900/10 cursor-pointer"
                >
                  Kembali Ke Halaman Tagihan
                </button>
              </div>
            ) : (
              /* Checkout screens */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {/* Total Billing Info */}
                  <div className="bg-indigo-50/70 px-5 py-3 flex flex-col border-b border-indigo-100 shrink-0">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-[8px]">
                      Rincian Item Pembayaran ({selectedInvoicesList.length} Item)
                    </span>
                    <div className="max-h-[80px] overflow-y-auto mt-1 space-y-1">
                      {selectedInvoicesList.map((inv, idx) => {
                        let typeStr = inv.invoiceType;
                        if (inv.invoiceType === "SPP") typeStr = `SPP ${INDONESIAN_MONTHS[inv.month]} ${inv.year}`;
                        else if (inv.invoiceType === "FULLDAY") typeStr = `Uang Fullday ${INDONESIAN_MONTHS[inv.month]} ${inv.year}`;
                        else if (inv.invoiceType === "UANG_PENGEMBANGAN") typeStr = "Uang Pengembangan";
                        else if (inv.invoiceType === "DAFTAR_ULANG") typeStr = "Daftar Ulang";
                        else if (inv.invoiceType === "UANG_PERALATAN") typeStr = "Uang Peralatan";
                        else if (inv.invoiceType === "EKSTRAKURIKULER") typeStr = "Ekstrakurikuler";
                        else if (inv.invoiceType === "SERAGAM") typeStr = "Seragam";

                        return (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                            <span className="font-medium">{typeStr}</span>
                            <span className="font-bold text-slate-900">{formatRupiah(inv.amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center border-t border-indigo-200/50 pt-1.5 mt-1.5">
                      <span className="text-[9px] uppercase font-bold text-indigo-600">Total Tagihan</span>
                      <span className="font-extrabold text-indigo-700 text-base">
                        {pakasirData ? formatRupiah(pakasirData.payment.total_payment) : formatRupiah(selectedInvoicesList.reduce((sum, inv) => sum + inv.amount, 0))}
                      </span>
                    </div>
                  </div>

                  {/* Main panel - Methods */}
                  <div className="px-5 py-4 space-y-4">
                    {checkoutStep === "SELECT_METHOD" ? (
                      <>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Pilih Metode Pembayaran
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          {/* QRIS */}
                          <button
                            onClick={() => handleSelectMethod("qris")}
                            className="flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-slate-100 hover:border-slate-350 hover:bg-slate-50 text-slate-655 bg-slate-50/30 transition-all gap-1 cursor-pointer"
                          >
                            <QrCode className="w-4.5 h-4.5 text-indigo-600" />
                            <span className="text-[11px] font-bold text-slate-800">QRIS (GoPay/SPay)</span>
                          </button>

                          {/* BNI VA */}
                          <button
                            onClick={() => handleSelectMethod("bni_va")}
                            className="flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-slate-100 hover:border-slate-350 hover:bg-slate-50 text-slate-655 bg-slate-50/30 transition-all gap-1 cursor-pointer"
                          >
                            <Building2 className="w-4.5 h-4.5 text-indigo-600" />
                            <span className="text-[11px] font-bold text-slate-800">BNI VA</span>
                          </button>

                          {/* BRI VA */}
                          <button
                            onClick={() => handleSelectMethod("bri_va")}
                            className="flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-slate-100 hover:border-slate-350 hover:bg-slate-50 text-slate-655 bg-slate-50/30 transition-all gap-1 cursor-pointer"
                          >
                            <Building2 className="w-4.5 h-4.5 text-indigo-600" />
                            <span className="text-[11px] font-bold text-slate-800">BRI VA</span>
                          </button>

                          {/* CIMB VA */}
                          <button
                            onClick={() => handleSelectMethod("cimb_niaga_va")}
                            className="flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-slate-100 hover:border-slate-350 hover:bg-slate-50 text-slate-655 bg-slate-50/30 transition-all gap-1 cursor-pointer"
                          >
                            <Building2 className="w-4.5 h-4.5 text-indigo-600" />
                            <span className="text-[11px] font-bold text-slate-800">CIMB Niaga VA</span>
                          </button>

                          {/* Transfer Manual BSI */}
                          <button
                            onClick={() => handleSelectMethod("tf_manual")}
                            className="flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-slate-100 hover:border-slate-350 hover:bg-slate-50 text-slate-655 bg-slate-50/30 transition-all gap-1 cursor-pointer col-span-2"
                          >
                            <Building2 className="w-4.5 h-4.5 text-indigo-600" />
                            <span className="text-[11px] font-bold text-slate-800">Transfer Manual (BSI)</span>
                          </button>
                        </div>
                      </>
                    ) : checkoutStep === "METHOD_PREVIEW" ? (
                      <div className="space-y-4 animate-fadeIn text-slate-805">
                        {/* Selected Method Summary Header */}
                        <div className="flex justify-between items-center bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-200/70 shadow-xs">
                          <div className="flex items-center gap-1.5">
                            {paymentMethod === "qris" ? (
                              <QrCode className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Building2 className="w-4 h-4 text-indigo-600" />
                            )}
                            <span className="text-[11px] font-bold text-slate-800">
                              Metode: {getPaymentMethodName(paymentMethod)}
                            </span>
                          </div>
                          <button
                            onClick={() => setCheckoutStep("SELECT_METHOD")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-400 rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3 text-indigo-600" />
                            <span>Ubah Metode</span>
                          </button>
                        </div>

                        {/* Preview Rincian Biaya */}
                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70 space-y-2 text-xs">
                          <div className="font-bold text-slate-850 text-[10px] uppercase tracking-wider">Preview Rincian Biaya</div>
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal Tagihan ({selectedInvoicesList.length} item)</span>
                            <span>
                              {formatRupiah(selectedInvoicesList.reduce((sum, inv) => sum + inv.amount, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-655 font-medium">
                            <span>Biaya Layanan</span>
                            <span>
                              {getPaymentFeeText(paymentMethod, selectedInvoicesList.reduce((sum, inv) => sum + inv.amount, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200/80 pt-2 font-bold text-slate-800 text-sm">
                            <span>Total Pembayaran (Estimasi)</span>
                            <span className="text-indigo-650 font-extrabold text-base">
                              {getPaymentTotalText(paymentMethod, selectedInvoicesList.reduce((sum, inv) => sum + inv.amount, 0))}
                            </span>
                          </div>
                        </div>

                        {/* Cara Pembayaran */}
                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70 space-y-2 text-xs">
                          <div className="font-bold text-slate-850 text-[10px] uppercase tracking-wider">Cara Pembayaran</div>
                          <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                            {getPaymentInstructions(paymentMethod).map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                        </div>

                        {/* Action buttons inside the panel */}
                        <div className="flex gap-2.5 pt-2">
                          <button
                            onClick={() => setCheckoutStep("SELECT_METHOD")}
                            className="flex-1 px-4 py-2.5 border border-slate-350 hover:bg-slate-100 text-slate-655 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                          >
                            Kembali
                          </button>
                          <button
                            onClick={handleConfirmPayment}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer text-center"
                          >
                            Lanjutkan Pembayaran
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Active Method Header & Back Button */}
                        <div className="flex justify-between items-center bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-200/70 mb-1 shadow-xs">
                          <div className="flex items-center gap-1.5">
                            {paymentMethod === "qris" ? (
                              <QrCode className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Building2 className="w-4 h-4 text-indigo-600" />
                            )}
                            <span className="text-[11px] font-bold text-slate-800">
                              Metode: {paymentMethod === "tf_manual" ? "Transfer Manual (BSI)" : paymentMethod.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setPakasirData(null);
                              setCheckoutStep("SELECT_METHOD");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>Ubah Metode Pembayaran</span>
                          </button>
                        </div>

                        {/* Countdown expired timer */}
                        {secondsLeft !== null && secondsLeft > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between animate-pulse">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                              Sisa Waktu Pembayaran
                            </span>
                            <span className="font-mono font-bold text-xs bg-amber-600 text-white px-2 py-0.5 rounded shadow-sm">
                              {formatCountdown(secondsLeft)}
                            </span>
                          </div>
                        )}

                        {secondsLeft === 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center text-red-700 font-bold text-[10px] uppercase">
                            ⚠️ Batas Waktu Pembayaran Habis. Silakan buat transaksi baru.
                          </div>
                        )}

                        {/* Payment Details Container */}
                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 min-h-[120px] flex flex-col justify-center">
                          {pakasirLoading ? (
                            <div className="flex flex-col items-center justify-center py-4 space-y-2">
                              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                              <span className="text-[11px] text-slate-500 font-medium">Membuat Transaksi Pakasir...</span>
                            </div>
                          ) : secondsLeft === 0 ? (
                            <div className="text-center text-xs text-red-500 py-3">Transaksi ini telah kedaluwarsa. Silakan kembali untuk memilih metode lagi.</div>
                          ) : paymentMethod === "qris" ? (
                            pakasirData ? (
                              <div className="flex flex-col items-center text-center space-y-1.5 py-1 animate-fadeIn">
                                <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-inner">
                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&format=png&data=${encodeURIComponent(pakasirData.payment.payment_number)}`}
                                    alt="QRIS Pakasir"
                                    className="w-32 h-32"
                                  />
                                </div>
                                <button
                                  onClick={() => downloadQris(pakasirData.payment.payment_number, pakasirData.payment.total_payment)}
                                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Unduh QRIS Resmi (PNG)</span>
                                </button>
                                <p className="text-[9px] text-slate-500 font-medium pt-0.5 max-w-xs">
                                  Pindai kode QRIS di atas langsung dari aplikasi Mobile Banking atau e-Wallet pilihan Anda.
                                </p>
                              </div>
                            ) : (
                              <div className="text-center text-xs text-red-500 py-3">Gagal memuat QRIS. Silakan pilih metode lain.</div>
                            )
                          ) : paymentMethod !== "tf_manual" ? (
                            pakasirData ? (
                              <div className="space-y-2 text-xs text-slate-700 animate-fadeIn">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                                  Detail Virtual Account ({paymentMethod.replace("_va", "").toUpperCase()})
                                </span>
                                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                  <span className="font-mono font-bold text-slate-800 text-xs tracking-wide">
                                    {realVaNumber}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(realVaNumber)}
                                    className="text-indigo-600 hover:text-indigo-800 p-1 flex items-center gap-0.5 cursor-pointer font-bold text-[9px]"
                                  >
                                    {copied ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span className="font-semibold">Salin</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                                  <span>Biaya Layanan</span>
                                  <span>{formatRupiah(pakasirData.payment.fee)}</span>
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-500 font-medium border-t border-slate-200/50 pt-1">
                                  <span>Total Pembayaran</span>
                                  <span className="font-bold text-slate-800">{formatRupiah(pakasirData.payment.total_payment)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-xs text-red-500 py-3">Gagal memuat Virtual Account. Silakan pilih metode lain.</div>
                            )
                          ) : (
                            /* Transfer Manual BSI */
                            <div className="space-y-2 text-xs text-slate-700 animate-fadeIn">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                                Rekening Transfer Manual
                              </span>
                              <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-1.5">
                                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                                  <span className="text-slate-400 text-[10px]">Bank</span>
                                  <span className="font-bold text-slate-800 text-[10px]">BSI (Bank Syariah Indonesia)</span>
                                </div>
                                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                                  <span className="text-slate-400 text-[10px]">Nomor Rekening</span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono font-bold text-slate-800 tracking-wide text-xs">
                                      7356970432
                                    </span>
                                    <button
                                      onClick={() => copyToClipboard("7356970432")}
                                      className="text-indigo-650 hover:text-indigo-805 p-0.5 flex items-center gap-0.5 cursor-pointer text-[9px]"
                                    >
                                      {copied ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span className="font-semibold">Salin</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">Atas Nama</span>
                                  <span className="font-bold text-slate-800">Yayasan Al-Uswah</span>
                                </div>
                              </div>
                              <p className="text-[9px] text-slate-500 leading-normal">
                                Silakan transfer sesuai nominal ke rekening BSI di atas. Setelah transfer, klik tombol di bawah untuk mengirimkan bukti transfer via WhatsApp ke nomor +62 896-7833-1076.
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Pay Button */}
                {checkoutStep === "PAYMENT_DETAILS" && (
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-1.5 shrink-0">
                    {paymentMethod === "tf_manual" ? (
                      <button
                        onClick={handleWhatsAppRedirect}
                        disabled={processingPayment || secondsLeft === 0}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {processingPayment ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengirim & Mengonfirmasi...</span>
                          </>
                        ) : (
                          <>
                            <span>Kirim Bukti & Konfirmasi via WhatsApp</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleCheckStatusManual}
                          disabled={processingPayment || pakasirLoading || !pakasirData || secondsLeft === 0}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {processingPayment ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Memeriksa Status...</span>
                            </>
                          ) : (
                            <span>Cek Status Pembayaran</span>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
