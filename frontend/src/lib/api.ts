import axios from "axios";

export const api = axios.create({
  // Use /api prefix – all Next.js API Route Handlers live under /api/*
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor to handle session expiration or network errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Session expired or unauthorized request. Redirecting...");
    }
    return Promise.reject(error);
  }
);
