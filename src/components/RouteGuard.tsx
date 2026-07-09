"use client";

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: ("SUPER_ADMIN" | "UNIT_ADMIN" | "WALI_KELAS" | "PARENT")[];
}

export default function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { user, isAuthenticated, loading, fetchMe } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      let currentUser = user;
      
      // If we don't have user info in state, try to fetch it from backend session
      if (!currentUser) {
        currentUser = await fetchMe();
      }

      // If user is still not authenticated, redirect to login page
      if (!currentUser) {
        if (pathname !== "/login") {
          navigate(`/login?redirect=${encodeURIComponent(pathname)}`, { replace: true });
        }
        return;
      }

      // If user is authenticated but doesn't have the required role, redirect to dashboard root
      if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
        console.warn(`User does not have access permission: ${currentUser.role}`);
        navigate("/dashboard", { replace: true });
      }
    };

    checkAuth();
  }, [user, fetchMe, navigate, pathname, allowedRoles]);

  // Premium glassmorphism loading state
  if (loading || (!isAuthenticated && pathname !== "/login")) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="relative flex items-center justify-center">
          {/* Animated pulsing outer rings */}
          <div className="absolute w-24 h-24 rounded-full border border-indigo-500/35 animate-ping duration-1000"></div>
          <div className="absolute w-16 h-16 rounded-full border border-indigo-500/20 animate-pulse"></div>
          {/* Spinner */}
          <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin"></div>
        </div>
        <p className="mt-6 text-sm font-medium tracking-widest text-indigo-400 uppercase animate-pulse">
          Memuat Sesi...
        </p>
      </div>
    );
  }

  // If authenticated, render children
  return <>{children}</>;
}
