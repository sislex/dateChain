import styles from "./PlaceholderPage.module.css";

/** Temporary page shell used until each feature screen lands (Phases 4.2–4.6). */
export function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className={styles.page}>
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
