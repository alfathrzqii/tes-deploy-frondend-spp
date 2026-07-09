"use client";

import { useState, useEffect, Suspense } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { KeyRound, Phone, AlertCircle, Eye, EyeOff } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, error, clearError, loading } = useAuthStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  // Clear errors on mount or values change
  useEffect(() => {
    clearError();
    setValidationError("");
  }, [phoneNumber, password, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!phoneNumber || !password) {
      setValidationError("Semua kolom input wajib diisi");
      return;
    }

    try {
      await login(phoneNumber.trim(), password);
      // Success will trigger redirect via useEffect
    } catch (err) {
      // Error handled by store
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden px-4">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative Gradient Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
        
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/20 mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            SPP Sekolah
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Sistem Informasi Manajemen Keuangan & SPP
          </p>
        </div>

        {/* Errors Display */}
        {(error || validationError) && (
          <div className="mb-6 flex items-start gap-3 bg-red-950/45 border border-red-500/35 p-3 rounded-lg text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{validationError || error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phone number field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Nomor Handphone (HP)
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Contoh: 081234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg text-sm placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Kata Sandi
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-10 py-2.5 rounded-lg text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-white transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white py-2.5 rounded-lg font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 shadow-lg shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              "Masuk ke Dashboard"
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/cek-tagihan"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold tracking-wide transition-all border-b border-dashed border-indigo-500/30 hover:border-indigo-400 pb-0.5"
          >
            Cek Tagihan & Bayar SPP Online (Tanpa Login) →
          </Link>
        </div>

        {/* Demo Credentials Alert Info */}
        <div className="mt-8 border-t border-slate-800/80 pt-6 text-[11px] text-slate-500">
          <p className="font-semibold text-slate-400 mb-1">Akun Demo Default:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Super Admin: <span className="text-slate-300">0811111111</span> (password: <span className="text-slate-300">admin123</span>)</li>
            <li>Admin SD: <span className="text-slate-300">0822222222</span> (password: <span className="text-slate-300">admin123</span>)</li>
            <li>Wali Kelas 6A: <span className="text-slate-300">0833333333</span> (password: <span className="text-slate-300">admin123</span>)</li>
            <li>Wali Murid Hendra: <span className="text-slate-300">081234567890</span> (password: <span className="text-slate-300">parent123</span>)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
