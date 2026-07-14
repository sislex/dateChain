import { Spinner } from "@datechain/ui";

import {
  useGetWalletHistoryQuery,
  useGetWalletQuery,
  type WalletHistoryItem,
} from "../dates/datesApi";

import styles from "./WalletPage.module.css";

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

const TYPE_LABEL: Record<WalletHistoryItem["type"], string> = {
  date: "Свидание",
  transfer: "Перевод",
  topup: "Пополнение",
};

function operationLabel(item: WalletHistoryItem): string {
  const name = item.counterpart.displayName ?? "Пользователь";
  if (item.type === "topup") return "Пополнение сервисом";
  if (item.type === "transfer") {
    return item.direction === "out" ? `Отправлено: ${name}` : `Получено от: ${name}`;
  }
  const frozen = item.status === "PROPOSED" || item.status === "ACCEPTED";
  if (item.direction === "out") {
    return frozen ? `Свидание с ${name} (заморожено)` : `Свидание с ${name}`;
  }
  return `Свидание с ${name}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WalletPage() {
  const { data: wallet, isLoading } = useGetWalletQuery();
  const { data: history } = useGetWalletHistoryQuery();

  if (isLoading || !wallet) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  const items = history ?? [];

  return (
    <div className={styles.page} data-testid="wallet-page">
      <h2 className={styles.title}>Кошелёк</h2>

      <div className={styles.balanceCard}>
        <div className={styles.balanceValue} data-testid="wallet-balance">
          {Number(wallet.balance)} <span className={styles.symbol}>{wallet.symbol}</span>
        </div>
        <div className={styles.address} title={wallet.address}>
          {shortAddr(wallet.address)}
        </div>
      </div>

      <h3 className={styles.subtitle}>Транзакции</h3>
      {items.length === 0 && <p className={styles.muted}>Транзакций пока нет.</p>}
      {items.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table} data-testid="wallet-history">
            <thead>
              <tr>
                <th>Операция</th>
                <th className={styles.num}>Сумма</th>
                <th className={styles.num}>Комиссия</th>
                <th>Время</th>
                <th>Тип</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} data-testid="wallet-history-row">
                  <td>{operationLabel(t)}</td>
                  <td className={`${styles.num} ${t.direction === "in" ? styles.in : styles.out}`}>
                    {t.direction === "in" ? "+" : "−"}
                    {Number(t.amount)} DATE
                  </td>
                  <td className={styles.num}>
                    {Number(t.fee) > 0 ? `${Number(t.fee)} DATE` : "—"}
                  </td>
                  <td className={styles.time}>{formatTime(t.createdAt)}</td>
                  <td>{TYPE_LABEL[t.type]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
