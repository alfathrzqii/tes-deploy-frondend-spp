import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor to handle session expiration or network errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized (401), we can optionally clear local storage/session in the frontend store
    if (error.response?.status === 401) {
      console.warn("Session expired or unauthorized request. Redirecting...");
      // Let individual store or component handle actual redirection if needed
    }
    return Promise.reject(error);
  }
);
