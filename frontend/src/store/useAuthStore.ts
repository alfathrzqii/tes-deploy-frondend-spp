import { create } from "zustand";
import { api } from "@/lib/api";

export interface UserProfile {
  id: number;
  name: string;
  email: string | null;
  phoneNumber: string;
  role: "SUPER_ADMIN" | "UNIT_ADMIN" | "WALI_KELAS" | "PARENT";
  schoolUnitId: number | null;
  className: string | null;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (phoneNumber: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<UserProfile | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (phoneNumber, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/auth/login", {
        phoneNumber,
        identifier: phoneNumber,
        password
      });
      const { data } = response.data;
      set({ user: data, isAuthenticated: true, loading: false });
      return data;
    } catch (error: any) {
      const message = error.response?.data?.message || "Nomor HP atau password salah";
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      // Call backend logout endpoint to clear cookie
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Failed backend logout call, clearing local state anyway", error);
    } finally {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  fetchMe: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get("/auth/me");
      const { data } = response.data;
      set({ user: data, isAuthenticated: true, loading: false });
      return data;
    } catch (error) {
      set({ user: null, isAuthenticated: false, loading: false });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
