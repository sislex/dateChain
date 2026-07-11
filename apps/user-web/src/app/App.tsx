import { Navigate, Route, Routes } from "react-router-dom";

import { ChatPage } from "../features/chat/ChatPage";
import { MatchesPage } from "../features/chat/MatchesPage";
import { DiscoveryPage } from "../features/discovery/DiscoveryPage";
import { DiscoverySettingsPage } from "../features/discovery/DiscoverySettingsPage";
import { OnboardingFlow } from "../features/onboarding/OnboardingFlow";
import { ProfilePage } from "../features/profile/ProfilePage";
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
        <Route path="discovery" element={<DiscoveryPage />} />
        <Route path="discovery/settings" element={<DiscoverySettingsPage />} />
        <Route path="likes" element={<PlaceholderPage title="Лайки" />} />
        <Route path="chats" element={<MatchesPage />} />
        <Route path="chats/:matchId" element={<ChatPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
