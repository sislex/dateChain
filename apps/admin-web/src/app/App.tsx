import { UserRole } from "@datechain/types";
import { Navigate, Route, Routes } from "react-router-dom";

import { DashboardPage } from "../features/DashboardPage";
import { LoginPage } from "../features/LoginPage";
import { UsersPage } from "../features/UsersPage";

import { AdminLayout } from "./AdminLayout";
import { RoleGuard } from "./RoleGuard";

function Stub({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

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
              <Stub title="Модерация" />
            </RoleGuard>
          }
        />
        <Route
          path="audit"
          element={
            <RoleGuard min={UserRole.Admin}>
              <Stub title="Аудит" />
            </RoleGuard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
