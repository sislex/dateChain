import { BottomNav, SideNav, Logo, type NavItem } from "@datechain/ui";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { NotificationsBell } from "../features/notifications/NotificationsBell";
import { useBreakpoint } from "../hooks/useBreakpoint";

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
  const activeId =
    NAV_ITEMS.find((i) => location.pathname.startsWith(`/app/${i.id}`))?.id ?? "discovery";
  const onSelect = (id: string) => navigate(`/app/${id}`);
  const isMobile = bp === "mobile";

  return (
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
  );
}
