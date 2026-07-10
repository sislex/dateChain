import type { CSSProperties } from "react";

import { cn } from "../../utils/cn";

import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ width, height = 16, circle = false, className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(styles.skeleton, circle && styles.circle, className)}
      style={{ width, height, ...style }}
    />
  );
}
