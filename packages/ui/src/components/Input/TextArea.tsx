import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

import styles from "./field.module.css";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        className={cn(styles.control, styles.textarea, error && styles.invalid, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && (
        <span id={errorId} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
});
