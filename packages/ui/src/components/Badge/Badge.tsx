import type { ReactNode } from "react";

import { cn } from "../../utils/cn";

import styles from "./Badge.module.css";

export interface BadgeProps {
  children?: ReactNode;
  variant?: "flame" | "neutral" | "like";
  /** Render as a small dot (no content). */
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = "flame", dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        styles.badge,
        variant !== "flame" && styles[variant],
        dot && styles.dot,
        className,
      )}
    >
      {!dot && children}
    </span>
  );
}
