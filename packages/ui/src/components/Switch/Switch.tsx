import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils/cn";

import styles from "./Switch.module.css";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, className, ...rest },
  ref,
) {
  return (
    <label className={cn(styles.root, className)}>
      <input ref={ref} type="checkbox" role="switch" className={styles.input} {...rest} />
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
});
