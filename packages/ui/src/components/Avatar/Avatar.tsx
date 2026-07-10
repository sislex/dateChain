import { cn } from "../../utils/cn";

import styles from "./Avatar.module.css";

export interface AvatarProps {
  src?: string;
  /** Name used for alt text and initials fallback. */
  name: string;
  size?: "sm" | "md" | "lg";
  /** Flame ring, e.g. to highlight a new match. */
  ring?: boolean;
  className?: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ src, name, size = "md", ring = false, className }: AvatarProps) {
  return (
    <span className={cn(styles.avatar, styles[size], ring && styles.ring, className)}>
      {src ? (
        <img className={styles.img} src={src} alt={name} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
