import { Spinner } from "@datechain/ui";

import styles from "./AuditPage.module.css";
import { useAuditQuery } from "./adminApi";

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function AuditPage() {
  const { data, isLoading } = useAuditQuery();

  if (isLoading || !data) {
    return <Spinner size="lg" />;
  }

  return (
    <div data-testid="audit">
      <h1 className={styles.title}>Аудит</h1>
      {data.length === 0 && <p className={styles.muted}>Записей аудита пока нет.</p>}
      {data.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Время</th>
              <th>Действие</th>
              <th>Актор</th>
              <th>Объект</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} data-testid="audit-row">
                <td>{new Date(row.createdAt).toLocaleString("ru")}</td>
                <td>
                  <code className={styles.action}>{row.action}</code>
                </td>
                <td className={styles.mono}>{shortId(row.actorId)}</td>
                <td className={styles.mono}>
                  {row.targetType ? `${row.targetType}: ${shortId(row.targetId)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
