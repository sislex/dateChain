import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

import styles from "./Slider.module.css";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  /** Renders the current value; receives the numeric value. */
  formatValue?: (value: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { label, formatValue, value, defaultValue, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const sliderId = id ?? autoId;
  const current = Number(value ?? defaultValue ?? 0);

  return (
    <div className={styles.wrapper}>
      {label && (
        <div className={styles.header}>
          <label htmlFor={sliderId}>{label}</label>
          <span className={styles.value}>{formatValue ? formatValue(current) : current}</span>
        </div>
      )}
      <input
        ref={ref}
        id={sliderId}
        type="range"
        value={value}
        defaultValue={defaultValue}
        className={cn(styles.input, className)}
        {...rest}
      />
    </div>
  );
});
