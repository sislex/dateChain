import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils/cn";

import styles from "./Modal.module.css";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Render as a bottom sheet (mobile pattern). */
  variant?: "center" | "sheet";
  /** Close when the backdrop is clicked. Default true. */
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  variant = "center",
  closeOnBackdrop = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the dialog for keyboard/screen-reader users.
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isSheet = variant === "sheet";

  return (
    // Backdrop is a mouse convenience; keyboard users close via Escape or the
    // close button, so the presentation role is accurate here.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      role="presentation"
      className={cn(styles.overlay, isSheet && styles.sheetOverlay)}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(styles.panel, isSheet && styles.sheet)}
      >
        {title && (
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button type="button" aria-label="Закрыть" className={styles.close} onClick={onClose}>
              ✕
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
