import styles from "./Chat.module.css";

export interface TypingIndicatorProps {
  label?: string;
}

export function TypingIndicator({ label = "печатает" }: TypingIndicatorProps) {
  return (
    <div className={styles.typing} role="status" aria-label={label}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  );
}
