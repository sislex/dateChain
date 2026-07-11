import { UserRole } from "@datechain/types";
import { Badge, Button, Checkbox, Input, Spinner } from "@datechain/ui";
import { useState } from "react";

import { useAppSelector } from "../store";
import { hasRank, selectRole } from "../store/authSlice";

import styles from "./ModerationPage.module.css";
import {
  useGetSettingsQuery,
  useReportsQuery,
  useResolveReportMutation,
  useSetSettingMutation,
} from "./adminApi";

function SettingsSection() {
  const { data: settings } = useGetSettingsQuery();
  const [setSetting] = useSetSettingMutation();
  const [key, setKey] = useState("dailyLikeLimit");
  const [value, setValue] = useState("100");

  return (
    <section className={styles.section} data-testid="settings-section">
      <h2 className={styles.h2}>Конфигурация</h2>
      <ul className={styles.settingsList}>
        {(settings ?? []).map((s) => (
          <li key={s.key}>
            <code>{s.key}</code>: {JSON.stringify(s.value)}
          </li>
        ))}
      </ul>
      <div className={styles.settingForm}>
        <Input aria-label="Ключ" value={key} onChange={(e) => setKey(e.target.value)} />
        <Input aria-label="Значение" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button
          onClick={() =>
            setSetting({ key, value: Number.isNaN(Number(value)) ? value : Number(value) })
          }
        >
          Сохранить
        </Button>
      </div>
    </section>
  );
}

export function ModerationPage() {
  const role = useAppSelector(selectRole);
  const { data: reports, isLoading } = useReportsQuery();
  const [resolve] = useResolveReportMutation();
  const [ban, setBan] = useState<Record<string, boolean>>({});

  return (
    <div data-testid="moderation-page">
      <h1 className={styles.title}>Модерация</h1>

      {isLoading || !reports ? (
        <Spinner size="lg" />
      ) : reports.length === 0 ? (
        <p className={styles.muted} data-testid="queue-empty">
          Очередь пуста
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Категория</th>
              <th>Приоритет</th>
              <th>Причина</th>
              <th>Решение</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} data-testid={`report-${r.id}`}>
                <td>{r.category}</td>
                <td>
                  <Badge>{r.priority}</Badge>
                </td>
                <td>{r.reason ?? "—"}</td>
                <td className={styles.actions}>
                  <Checkbox
                    label="бан"
                    checked={Boolean(ban[r.id])}
                    onChange={(e) => setBan((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => resolve({ id: r.id, status: "RESOLVED", ban: ban[r.id] })}
                  >
                    Решить
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => resolve({ id: r.id, status: "DISMISSED" })}
                  >
                    Отклонить
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {hasRank(role, UserRole.Admin) && <SettingsSection />}
    </div>
  );
}
