import { Button, Input, Modal, Spinner } from "@datechain/ui";
import { useState } from "react";

import {
  useGetWalletHistoryQuery,
  useGetWalletQuery,
  useTopUpWalletMutation,
  type WalletHistoryItem,
  type WalletHistoryType,
} from "../dates/datesApi";

import styles from "./WalletPage.module.css";

const PAGE_SIZE = 10;

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

const TYPE_LABEL: Record<WalletHistoryType, string> = {
  date: "Свидание",
  transfer: "Перевод",
  topup: "Пополнение",
};

const FILTERS: Array<{ key: WalletHistoryType | "all"; label: string }> = [
  { key: "all", label: "Все" },
  { key: "date", label: "Свидания" },
  { key: "transfer", label: "Переводы" },
  { key: "topup", label: "Пополнения" },
];

function operationLabel(item: WalletHistoryItem): string {
  const name = item.counterpart.displayName ?? "Пользователь";
  if (item.type === "topup") return "Пополнение сервисом";
  if (item.type === "transfer") {
    return item.direction === "out" ? `Отправлено: ${name}` : `Получено от: ${name}`;
  }
  if (item.status === "CANCELLED") return `Отмена свидания с ${name} — штраф`;
  const frozen = item.status === "PROPOSED" || item.status === "ACCEPTED";
  if (item.direction === "out") {
    return frozen ? `Свидание с ${name} (заморожено)` : `Свидание с ${name}`;
  }
  return `Свидание с ${name}`;
}

function shortHash(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
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
  const [topUp, { isLoading: toppingUp }] = useTopUpWalletMutation();
  const [filter, setFilter] = useState<WalletHistoryType | "all">("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("100");
  const [topUpError, setTopUpError] = useState<string | null>(null);

  if (isLoading || !wallet) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  const items = (history ?? []).filter((t) => filter === "all" || t.type === filter);
  const visible = items.slice(0, shown);

  const submitTopUp = async () => {
    setTopUpError(null);
    const amt = Number(topUpAmount);
    if (!Number.isInteger(amt) || amt < 1 || amt > 10_000) {
      return setTopUpError("Введите сумму от 1 до 10000");
    }
    try {
      await topUp({ amount: amt }).unwrap();
      setTopUpOpen(false);
    } catch (err) {
      const msg = (err as { data?: { message?: string } }).data?.message;
      setTopUpError(msg ?? "Не удалось пополнить кошелёк");
    }
  };

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
        <div className={styles.topupRow}>
          <Button size="sm" variant="secondary" onClick={() => { setTopUpError(null); setTopUpOpen(true); }}>
            ➕ Пополнить
          </Button>
        </div>
      </div>

      <h3 className={styles.subtitle}>Транзакции</h3>
      <div className={styles.filters} role="tablist" aria-label="Фильтр транзакций">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`${styles.filter} ${filter === f.key ? styles.filterActive : ""}`}
            onClick={() => {
              setFilter(f.key);
              setShown(PAGE_SIZE);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

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
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
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
                  <td className={styles.hash}>
                    {t.txHash ? <span title={t.txHash}>{shortHash(t.txHash)}</span> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > shown && (
            <div className={styles.moreRow}>
              <Button size="sm" variant="ghost" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                Показать ещё ({items.length - shown})
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal open={topUpOpen} onClose={() => setTopUpOpen(false)} title="Пополнить кошелёк">
        <Input
          label="Сумма (DATE)"
          type="number"
          inputMode="numeric"
          value={topUpAmount}
          onChange={(e) => setTopUpAmount(e.target.value)}
          error={topUpError ?? undefined}
        />
        <p className={styles.muted}>Демо-пополнение: токены начисляются сервисом мгновенно.</p>
        <Button fullWidth size="lg" disabled={toppingUp} onClick={submitTopUp}>
          Пополнить
        </Button>
      </Modal>
    </div>
  );
}
