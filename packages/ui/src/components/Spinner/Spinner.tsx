import { cn } from "../../utils/cn";

import styles from "./Spinner.module.css";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function Spinner({ size = "md", label = "Загрузка", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(styles.spinner, styles[size], className)}
    />
  );
}
