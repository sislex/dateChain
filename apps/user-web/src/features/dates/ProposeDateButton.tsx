import { Button, Input, Modal } from "@datechain/ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useProposeDateMutation } from "./datesApi";

interface Props {
  inviteeId: string;
  inviteeName: string;
  /** Button label; defaults to a compact variant for lists. */
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

/** Reusable "propose a date for tokens" button + amount modal. */
export function ProposeDateButton({
  inviteeId,
  inviteeName,
  label = "💎 Свидание за токены",
  variant = "secondary",
  size = "sm",
  fullWidth,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("50");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [proposeDate, { isLoading }] = useProposeDateMutation();

  async function submit() {
    setError(null);
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt < 1) return setError("Введите сумму (целое ≥ 1)");
    try {
      await proposeDate({ inviteeId, amount: amt, message: message.trim() || undefined }).unwrap();
      setOpen(false);
      setMessage("");
      navigate("/app/dates");
    } catch (err) {
      const msg = (err as { data?: { message?: string } }).data?.message;
      setError(msg ?? "Не удалось предложить свидание");
    }
  }

  return (
    <>
      <Button variant={variant} size={size} fullWidth={fullWidth} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Свидание с ${inviteeName}`}>
        <Input
          label="Сумма (DATE)"
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Сообщение (необязательно)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          error={error ?? undefined}
        />
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          Токены заморозятся после согласия. При подтверждении 80% получит партнёр, 20% — комиссия
          сервиса.
        </p>
        <Button fullWidth size="lg" disabled={isLoading} onClick={submit}>
          Предложить
        </Button>
      </Modal>
    </>
  );
}
