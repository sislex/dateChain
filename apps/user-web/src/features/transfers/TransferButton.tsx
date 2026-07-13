import { Button, Input, Modal } from "@datechain/ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useGetTransferFeeQuery, useSendTransferMutation } from "./transfersApi";

interface Props {
  recipientId: string;
  recipientName: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

/** Reusable "send DATE to another user" button + amount modal. */
export function TransferButton({
  recipientId,
  recipientName,
  label = "↗ Перевести токены",
  variant = "secondary",
  size = "sm",
  fullWidth,
}: Props) {
  const navigate = useNavigate();
  const { data: fee } = useGetTransferFeeQuery();
  const [sendTransfer, { isLoading }] = useSendTransferMutation();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("50");
  const [error, setError] = useState<string | null>(null);

  const feeBps = fee?.feeBps ?? 200;
  const amt = Number(amount);
  const commission = Number.isFinite(amt) && amt > 0 ? (amt * feeBps) / 10000 : 0;
  const net = amt - commission;

  async function submit() {
    setError(null);
    if (!Number.isInteger(amt) || amt < 1) return setError("Введите сумму (целое ≥ 1)");
    try {
      await sendTransfer({ toUserId: recipientId, amount: amt }).unwrap();
      setOpen(false);
      navigate("/app/wallet");
    } catch (err) {
      const msg = (err as { data?: { message?: string } }).data?.message;
      setError(msg ?? "Не удалось выполнить перевод");
    }
  }

  return (
    <>
      <Button variant={variant} size={size} fullWidth={fullWidth} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Перевод для ${recipientName}`}>
        <Input
          label="Сумма (DATE)"
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error ?? undefined}
        />
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          Комиссия сервиса {feeBps / 100}% = {commission} DATE. Получатель получит{" "}
          <b>{net > 0 ? net : 0} DATE</b>.
        </p>
        <Button fullWidth size="lg" disabled={isLoading} onClick={submit}>
          Перевести
        </Button>
      </Modal>
    </>
  );
}
