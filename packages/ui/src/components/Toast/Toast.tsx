import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils/cn";

import styles from "./Toast.module.css";

export type ToastTone = "default" | "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: ReactNode;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: ReactNode, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Auto-dismiss delay in ms. */
  duration?: number;
}

export function ToastProvider({ children, duration = 3500 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: ReactNode, tone: ToastTone = "default") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss, duration],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} role="region" aria-label="Уведомления">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(styles.toast, t.tone !== "default" && styles[t.tone])}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
