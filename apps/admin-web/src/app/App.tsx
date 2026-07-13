import { UserRole } from "@datechain/types";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuditPage } from "../features/AuditPage";
import { DashboardPage } from "../features/DashboardPage";
import { LoginPage } from "../features/LoginPage";
import { ModerationPage } from "../features/ModerationPage";
import { ServiceWalletPage } from "../features/ServiceWalletPage";
import { UsersPage } from "../features/UsersPage";

import { AdminLayout } from "./AdminLayout";
import { RoleGuard } from "./RoleGuard";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RoleGuard>
            <AdminLayout />
          </RoleGuard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="users"
          element={
            <RoleGuard min={UserRole.Support}>
              <UsersPage />
            </RoleGuard>
          }
        />
        <Route
          path="moderation"
          element={
            <RoleGuard min={UserRole.Moderator}>
              <ModerationPage />
            </RoleGuard>
          }
        />
        <Route
          path="service-wallet"
          element={
            <RoleGuard min={UserRole.Admin}>
              <ServiceWalletPage />
            </RoleGuard>
          }
        />
        <Route
          path="audit"
          element={
            <RoleGuard min={UserRole.Admin}>
              <AuditPage />
            </RoleGuard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
