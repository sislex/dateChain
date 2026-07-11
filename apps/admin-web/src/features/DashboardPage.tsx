import { Spinner } from "@datechain/ui";

import styles from "./DashboardPage.module.css";
import { useMetricsQuery } from "./adminApi";

const LABELS: Record<string, string> = {
  totalUsers: "Пользователи",
  bannedUsers: "Забанено",
  totalMatches: "Мэтчи",
  totalMessages: "Сообщения",
  totalSwipes: "Свайпы",
  openReports: "Открытые жалобы",
};

export function DashboardPage() {
  const { data, isLoading } = useMetricsQuery();

  if (isLoading || !data) {
    return <Spinner size="lg" />;
  }

  return (
    <div data-testid="dashboard">
      <h1 className={styles.title}>Дашборд</h1>
      <div className={styles.grid}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className={styles.card} data-testid={`metric-${key}`}>
            <div className={styles.value}>{value}</div>
            <div className={styles.label}>{LABELS[key] ?? key}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
