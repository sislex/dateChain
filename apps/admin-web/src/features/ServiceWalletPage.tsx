import { Button, Input, Spinner } from "@datechain/ui";
import { useState } from "react";

import styles from "./ServiceWalletPage.module.css";
import {
  useGetServiceWalletQuery,
  useGetTransferFeeQuery,
  useSetServiceWalletMutation,
  useSetTransferFeeMutation,
} from "./adminApi";

export function ServiceWalletPage() {
  const { data, isLoading } = useGetServiceWalletQuery();
  const { data: transferFee } = useGetTransferFeeQuery();
  const [setServiceWallet, { isLoading: saving }] = useSetServiceWalletMutation();
  const [setTransferFee, { isLoading: savingFee }] = useSetTransferFeeMutation();
  const [address, setAddress] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [feeOk, setFeeOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  if (isLoading || !data) {
    return <Spinner size="lg" />;
  }

  async function saveFee() {
    setFeeOk(false);
    const pct = Number(feePercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 50) return;
    await setTransferFee({ feeBps: Math.round(pct * 100) }).unwrap();
    setFeePercent("");
    setFeeOk(true);
  }

  async function save() {
    setError(null);
    setOk(false);
    if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
      setError("Введите корректный адрес 0x…");
      return;
    }
    try {
      await setServiceWallet({ address: address.trim() }).unwrap();
      setAddress("");
      setOk(true);
    } catch (err) {
      const msg = (err as { data?: { message?: string } }).data?.message;
      setError(msg ?? "Не удалось изменить адрес");
    }
  }

  return (
    <div data-testid="service-wallet">
      <h1 className={styles.title}>Сервисный кошелёк</h1>
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Адрес</span>
          <code className={styles.value} data-testid="sw-address">
            {data.address}
          </code>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Баланс комиссий</span>
          <span className={styles.value} data-testid="sw-balance">
            {Number(data.balance)} DATE
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Комиссия за свидания (эскроу)</span>
          <span className={styles.value}>{data.feeBps / 100}%</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Комиссия за переводы</span>
          <span className={styles.value} data-testid="transfer-fee">
            {(transferFee?.feeBps ?? 200) / 100}%
          </span>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.subtitle}>Сменить адрес</h2>
        <Input
          label="Новый адрес кошелька"
          placeholder="0x…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          error={error ?? undefined}
        />
        {ok && <p className={styles.ok}>Адрес обновлён on-chain.</p>}
        <Button disabled={saving} onClick={save}>
          Сохранить
        </Button>
      </div>

      <div className={styles.card}>
        <h2 className={styles.subtitle}>Комиссия за переводы между пользователями</h2>
        <Input
          label="Процент комиссии (%)"
          type="number"
          placeholder={String((transferFee?.feeBps ?? 200) / 100)}
          value={feePercent}
          onChange={(e) => setFeePercent(e.target.value)}
        />
        {feeOk && <p className={styles.ok}>Комиссия обновлена.</p>}
        <Button disabled={savingFee} onClick={saveFee}>
          Сохранить
        </Button>
      </div>
    </div>
  );
}
