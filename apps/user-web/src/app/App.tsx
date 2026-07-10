import { Navigate, Route, Routes } from "react-router-dom";

import { OnboardingFlow } from "../features/onboarding/OnboardingFlow";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { WelcomePage } from "../pages/WelcomePage";

import { AppLayout } from "./AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";

export function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/onboarding" element={<OnboardingFlow />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="discovery" replace />} />
        <Route
          path="discovery"
          element={<PlaceholderPage title="Discovery" subtitle="Колода — шаг 4.3" />}
        />
        <Route path="likes" element={<PlaceholderPage title="Лайки" />} />
        <Route
          path="chats"
          element={<PlaceholderPage title="Чаты" subtitle="Real-time — шаг 4.5" />}
        />
        <Route path="profile" element={<PlaceholderPage title="Профиль" subtitle="Шаг 4.6" />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
