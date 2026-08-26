import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login          from "./pages/Login";
import Dashboard      from "./pages/Dashboard";
import Hierarchy      from "./pages/Hierarchy";
import Workers        from "./pages/Workers";
import WorkerProfile  from "./pages/WorkerProfile";
import Attendance     from "./pages/Attendance";
import Reports        from "./pages/Reports";
import Approvals      from "./pages/Approvals";
import AuditLogs      from "./pages/AuditLogs";
import PendingReports from "./pages/PendingReports";
import Users          from "./pages/Users";

// Convenience array for the two admin tiers
const ADMIN_ROLES = ["administrator", "division_admin"];
const ALL_ROLES   = ["administrator", "division_admin", "supervisor"];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Default redirect — ProtectedRoute handles role-based redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Admin-tier routes (administrator + division_admin) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hierarchy"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <Hierarchy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <Workers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workers/:id"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <WorkerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <Approvals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pending-reports"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <PendingReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* General Administrator only */}
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={["administrator"]}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />

          {/* Shared — all authenticated roles */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={ALL_ROLES}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={ALL_ROLES}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
