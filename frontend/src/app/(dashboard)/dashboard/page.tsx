"use client";

import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import {
  Calendar,
  Shield,
  FolderTree,
  DollarSign,
  Users,
  BookOpen,
  ArrowUpRight
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();

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
