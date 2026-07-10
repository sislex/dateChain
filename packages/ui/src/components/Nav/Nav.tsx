import type { ReactNode } from "react";

import { cn } from "../../utils/cn";
import { Badge } from "../Badge/Badge";

import styles from "./nav.module.css";

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Unread/notification count. */
  count?: number;
}

export interface NavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
  /** Accessible label for the nav landmark. */
  ariaLabel?: string;
}

function NavButtons({ items, activeId, onSelect }: Omit<NavProps, "className" | "ariaLabel">) {
  return (
    <>
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(styles.item, active && styles.active)}
            onClick={() => onSelect(item.id)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
            {item.count ? (
              <span className={styles.badge}>
                <Badge>{item.count}</Badge>
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );
}

export function BottomNav({
  items,
  activeId,
  onSelect,
  className,
  ariaLabel = "Навигация",
}: NavProps) {
  return (
    <nav aria-label={ariaLabel} className={cn(styles.bottomNav, className)}>
      <NavButtons items={items} activeId={activeId} onSelect={onSelect} />
    </nav>
  );
}

export function SideNav({
  items,
  activeId,
  onSelect,
  className,
  ariaLabel = "Навигация",
}: NavProps) {
  return (
    <nav aria-label={ariaLabel} className={cn(styles.sideNav, className)}>
      <NavButtons items={items} activeId={activeId} onSelect={onSelect} />
    </nav>
  );
}
