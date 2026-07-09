"use client";

import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import RouteGuard from "@/components/RouteGuard";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  FolderTree,
  DollarSign,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ChevronRight,
  CreditCard,
  TrendingDown,
  PieChart,
  Shield
} from "lucide-react";

export default function DashboardLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // Define navigation items with access roles
  const menuItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      allowedRoles: ["SUPER_ADMIN", "UNIT_ADMIN", "WALI_KELAS", "PARENT"],
    },
    {
      name: "Manajemen Pengguna",
      href: "/users",
      icon: Shield,
      allowedRoles: ["SUPER_ADMIN"],
    },
    {
      name: "Kategori Keuangan",
      href: "/categories",
      icon: FolderTree,
      allowedRoles: ["SUPER_ADMIN", "UNIT_ADMIN"],
    },
    {
      name: "Master Tarif SPP",
      href: "/spp-tariffs",
      icon: DollarSign,
      allowedRoles: ["SUPER_ADMIN"], // Only SUPER_ADMIN
    },
    {
      name: "Daftar Siswa",
      href: "/students",
      icon: Users,
      allowedRoles: ["SUPER_ADMIN", "UNIT_ADMIN", "WALI_KELAS"],
    },
    {
      name: "Pembayaran SPP",
      href: "/payments",
      icon: CreditCard,
      allowedRoles: ["SUPER_ADMIN", "UNIT_ADMIN"],
    },
    {
      name: "Tunggakan SPP",
      href: "/unpaid",
      icon: TrendingDown,
      allowedRoles: ["SUPER_ADMIN", "UNIT_ADMIN", "WALI_KELAS"],
    },
    {
      name: "Rekap Kelas",
      href: "/class-recap",
      icon: PieChart,
      allowedRoles: ["SUPER_ADMIN", "UNIT_ADMIN", "WALI_KELAS"],
    },
    {
      name: "Buku Kas",
      href: "/transactions",
      icon: BookOpen,
      allowedRoles: ["SUPER_ADMIN", "UNIT_ADMIN"],
    },
  ];

  // Filter menu items by user role
  const filteredMenuItems = menuItems.filter(
    (item) => user && item.allowedRoles.includes(user.role)
  );

  return (
    <RouteGuard>
      <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[40%] h-[30%] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Sidebar for Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/80 shrink-0 sticky top-0 h-screen z-20">
          {/* Sidebar Header / Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/50">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-base shadow-md shadow-indigo-500/10">
              S
            </div>
            <span className="font-bold tracking-tight text-white text-sm">
              SPP Management
            </span>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/5 text-indigo-400 border border-indigo-500/20 shadow-inner"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/35 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300"
                    }`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer / Logout */}
          <div className="p-4 border-t border-slate-800/50">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-transparent hover:border-red-500/10 transition-all group"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Keluar</span>
            </button>
          </div>
        </aside>

        {/* Sidebar Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar for Mobile */}
        <aside
          className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-slate-900 z-40 transform transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-800 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-base">
                S
              </div>
              <span className="font-bold tracking-tight text-white text-sm">
                SPP Management
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800/80">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 z-10 relative">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-6 bg-slate-900/40 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-20">
            <div className="flex items-center gap-4">
              {/* Mobile hamburger menu toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-400 hover:text-white focus:outline-none"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold text-white tracking-tight capitalize">
                {pathname.replace("/", "").replace("-", " ") || "Dashboard"}
              </h2>
            </div>

            {/* User Profile Info & Theme Toggle */}
            <div className="flex items-center gap-4 relative">
              <ThemeToggle />
              
              {user && (
                <>
                  <div 
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-800/30 p-1.5 rounded-xl transition-all border border-transparent hover:border-slate-800/50"
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold text-white leading-tight">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                        {user.role.replace("_", " ")}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/85 flex items-center justify-center text-slate-300 shadow-inner">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  </div>

                  {profileMenuOpen && (
                    <>
                      {/* Invisible backdrop to dismiss dropdown on click outside */}
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setProfileMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-12 w-52 bg-slate-900 border border-slate-850 p-4 rounded-xl shadow-2xl space-y-3 z-50 animate-fade-in text-[11px]">
                        <div className="space-y-1">
                          <p className="font-extrabold text-white truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{user.phoneNumber}</p>
                          <p className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 font-bold inline-block uppercase mt-1">
                            {user.role.replace("_", " ")}
                          </p>
                        </div>
                        <div className="border-t border-slate-800 pt-2.5">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full text-left font-bold text-rose-450 hover:text-rose-350 transition-colors py-1 cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Keluar dari Akun</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </header>

          {/* Children Pages */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
