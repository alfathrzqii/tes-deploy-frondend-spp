import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./app/login/page";
import CekTagihanPage from "./app/cek-tagihan/page";
import DashboardPage from "./app/(dashboard)/dashboard/page";
import CategoriesPage from "./app/(dashboard)/categories/page";
import SppTariffsPage from "./app/(dashboard)/spp-tariffs/page";
import StudentsPage from "./app/(dashboard)/students/page";
import PaymentsPage from "./app/(dashboard)/payments/page";
import UnpaidPage from "./app/(dashboard)/unpaid/page";
import ClassRecapPage from "./app/(dashboard)/class-recap/page";
import TransactionsPage from "./app/(dashboard)/transactions/page";
import UsersPage from "./app/(dashboard)/users/page";
import DashboardLayout from "./app/(dashboard)/layout";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cek-tagihan" element={<CekTagihanPage />} />
        
        {/* Protected Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/spp-tariffs" element={<SppTariffsPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/unpaid" element={<UnpaidPage />} />
          <Route path="/class-recap" element={<ClassRecapPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>

        {/* Redirect from root or fallback to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
