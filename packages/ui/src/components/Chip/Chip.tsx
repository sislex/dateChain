import type { ReactNode } from "react";

import { cn } from "../../utils/cn";

import styles from "./Chip.module.css";

export interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  /** When false, renders a non-interactive tag (span). */
  interactive?: boolean;
  onToggle?: (selected: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function Chip({
  children,
  selected = false,
  interactive = true,
  onToggle,
  className,
  disabled,
}: ChipProps) {
  if (!interactive) {
    return <span className={cn(styles.chip, styles.static, className)}>{children}</span>;
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={cn(styles.chip, selected && styles.selected, className)}
      onClick={() => onToggle?.(!selected)}
    >
      {children}
    </button>
  );
}
