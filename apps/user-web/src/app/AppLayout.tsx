import { BottomNav, SideNav, Logo, type NavItem } from "@datechain/ui";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { NotificationsBell } from "../features/notifications/NotificationsBell";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useAppDispatch, useAppSelector } from "../store";
import { logout, selectCurrentUser, selectIsImpersonated } from "../store/authSlice";

import styles from "./AppLayout.module.css";

const NAV_ITEMS: NavItem[] = [
  { id: "discovery", label: "Discovery", icon: "🔥" },
  { id: "likes", label: "Лайки", icon: "★" },
  { id: "chats", label: "Чаты", icon: "💬" },
  { id: "dates", label: "Свидания", icon: "💎" },
  { id: "wallet", label: "Кошелёк", icon: "💰" },
  { id: "profile", label: "Профиль", icon: "👤" },
];

/** App shell: bottom nav on mobile, left side nav + three-column feel on desktop. */
export function AppLayout() {
  const bp = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const impersonated = useAppSelector(selectIsImpersonated);
  const user = useAppSelector(selectCurrentUser);
  const activeId =
    NAV_ITEMS.find((i) => location.pathname.startsWith(`/app/${i.id}`))?.id ?? "discovery";
  const onSelect = (id: string) => navigate(`/app/${id}`);
  const isMobile = bp === "mobile";

  const exitImpersonation = () => {
    dispatch(logout());
    window.close();
    // If the browser refuses to close the tab (not script-opened), fall back.
    navigate("/welcome", { replace: true });
  };

  return (
    <div className={styles.shell}>
      {impersonated && (
        <div className={styles.impersonationBanner} data-testid="impersonation-banner">
          ⚠️ Режим администратора: вы вошли как{" "}
          <strong>{user?.phone ?? user?.email ?? user?.id ?? "пользователь"}</strong>
          <button type="button" className={styles.impersonationExit} onClick={exitImpersonation}>
            Выйти
          </button>
        </div>
      )}
      <div className={isMobile ? styles.mobile : styles.desktop}>
      {!isMobile && (
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <Logo size={32} />
            <span className={styles.brandName}>dateChain</span>
          </div>
          <SideNav items={NAV_ITEMS} activeId={activeId} onSelect={onSelect} />
        </aside>
      )}
      <main className={styles.content}>
        <NotificationsBell />
        <Outlet />
      </main>
      {isMobile && (
        <nav className={styles.bottomBar}>
          <BottomNav items={NAV_ITEMS} activeId={activeId} onSelect={onSelect} />
        </nav>
      )}
      </div>
    </div>
  );
}
