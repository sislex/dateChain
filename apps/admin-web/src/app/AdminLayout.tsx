import { UserRole } from "@datechain/types";
import { Logo, SideNav, type NavItem } from "@datechain/ui";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAppSelector } from "../store";
import { hasRank, selectRole } from "../store/authSlice";

import styles from "./AdminLayout.module.css";

interface AdminNavItem extends NavItem {
  path: string;
  min: UserRole;
}

const ITEMS: AdminNavItem[] = [
  { id: "dashboard", label: "Дашборд", icon: "📊", path: "/admin", min: UserRole.Analyst },
  { id: "users", label: "Пользователи", icon: "👤", path: "/admin/users", min: UserRole.Support },
  {
    id: "moderation",
    label: "Модерация",
    icon: "🛡️",
    path: "/admin/moderation",
    min: UserRole.Moderator,
  },
  {
    id: "service-wallet",
    label: "Кошелёк сервиса",
    icon: "💰",
    path: "/admin/service-wallet",
    min: UserRole.Admin,
  },
  { id: "audit", label: "Аудит", icon: "📜", path: "/admin/audit", min: UserRole.Admin },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAppSelector(selectRole);

  const visible = ITEMS.filter((i) => hasRank(role, i.min));
  const active =
    [...visible]
      .reverse()
      .find((i) => location.pathname === i.path || location.pathname.startsWith(`${i.path}/`))
      ?.id ?? "dashboard";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo size={28} />
          <span className={styles.brandName}>Admin</span>
        </div>
        <SideNav
          items={visible}
          activeId={active}
          onSelect={(id) => {
            const item = ITEMS.find((i) => i.id === id);
            if (item) navigate(item.path);
          }}
        />
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
