import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils/cn";

import styles from "./IconButton.module.css";

export type IconButtonAccent = "neutral" | "nope" | "like" | "superlike" | "boost" | "rewind";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required, since the button has no visible text. */
  label: string;
  accent?: IconButtonAccent;
  size?: IconButtonSize;
  icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, accent = "neutral", size = "md", icon, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(styles.iconButton, styles[accent], styles[size], className)}
      {...rest}
    >
      {icon}
    </button>
  );
});
