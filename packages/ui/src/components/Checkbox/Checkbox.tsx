import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils/cn";

import styles from "./Checkbox.module.css";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, ...rest },
  ref,
) {
  return (
    <label className={cn(styles.root, className)}>
      <input ref={ref} type="checkbox" className={styles.input} {...rest} />
      {label && <span>{label}</span>}
    </label>
  );
});
