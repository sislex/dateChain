import { useId, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils/cn";

import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
  className?: string;
}

export function Tabs({ items, defaultTabId, className }: TabsProps) {
  const baseId = useId();
  const [active, setActive] = useState(defaultTabId ?? items[0]?.id);
  const activeItem = items.find((i) => i.id === active) ?? items[0];

  return (
    <div className={className}>
      <div role="tablist" className={styles.tablist}>
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              className={cn(styles.tab, selected && styles.selected)}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          className={styles.panel}
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
