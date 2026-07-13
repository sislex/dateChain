import { Spinner } from "@datechain/ui";

import { useGetWalletQuery, useGetWalletTransactionsQuery } from "../dates/datesApi";

import styles from "./WalletPage.module.css";

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function WalletPage() {
  const { data: wallet, isLoading } = useGetWalletQuery();
  const { data: txs } = useGetWalletTransactionsQuery();

  if (isLoading || !wallet) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

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
      {(!txs || txs.length === 0) && <p className={styles.muted}>Транзакций пока нет.</p>}
      <ul className={styles.list}>
        {(txs ?? []).map((t) => (
          <li key={`${t.hash}-${t.direction}`} className={styles.tx} data-testid="wallet-tx">
            <div className={styles.txMain}>
              <span className={styles.txLabel}>{t.label}</span>
              <span className={styles.txCounter}>{shortAddr(t.counterparty)}</span>
            </div>
            <span className={t.direction === "in" ? styles.in : styles.out}>
              {t.direction === "in" ? "+" : "−"}
              {Number(t.amount)} DATE
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
