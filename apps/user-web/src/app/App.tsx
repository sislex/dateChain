import { Navigate, Route, Routes } from "react-router-dom";

import { ImpersonatePage } from "../features/auth/ImpersonatePage";
import { ChatPage } from "../features/chat/ChatPage";
import { MatchesPage } from "../features/chat/MatchesPage";
import { DatesPage } from "../features/dates/DatesPage";
import { DiscoveryPage } from "../features/discovery/DiscoveryPage";
import { DiscoverySettingsPage } from "../features/discovery/DiscoverySettingsPage";
import { LikesPage } from "../features/likes/LikesPage";
import { OnboardingFlow } from "../features/onboarding/OnboardingFlow";
import { ProfilePage } from "../features/profile/ProfilePage";
import { WalletPage } from "../features/wallet/WalletPage";
import { WelcomePage } from "../pages/WelcomePage";

import { AppLayout } from "./AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";

export function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/impersonate" element={<ImpersonatePage />} />
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
        <Route path="likes" element={<LikesPage />} />
        <Route path="chats" element={<MatchesPage />} />
        <Route path="chats/:matchId" element={<ChatPage />} />
        <Route path="dates" element={<DatesPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
