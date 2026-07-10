import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "../../utils/cn";
import fieldStyles from "../Input/field.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, placeholder, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-error`;

  return (
    <div className={fieldStyles.wrapper}>
      {label && (
        <label htmlFor={selectId} className={fieldStyles.label}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(fieldStyles.control, error && fieldStyles.invalid, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} role="alert" className={fieldStyles.error}>
          {error}
        </span>
      )}
    </div>
  );
});
