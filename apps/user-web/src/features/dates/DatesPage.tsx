import { Button, Modal, Spinner } from "@datechain/ui";
import { useState } from "react";

import styles from "./DatesPage.module.css";
import {
  useDateActionMutation,
  useGetDatesQuery,
  useGetWalletQuery,
  useRateDateMutation,
  type DateAction,
  type DateStatus,
  type DateView,
} from "./datesApi";

const STATUS_LABEL: Record<DateStatus, string> = {
  PROPOSED: "Ожидает ответа",
  ACCEPTED: "Пользователь согласился — ожидание свидания",
  CONFIRMED: "Свидание состоялось",
  CANCELLED: "Отменено",
  DECLINED: "Отклонено",
};

type DatesTab = "proposer" | "invitee";

/** A money-moving action pending user confirmation in the dialog. */
interface PendingAction {
  date: DateView;
  action: Extract<DateAction, "confirm" | "cancel" | "refuse" | "claim">;
}

const FEE_RATE = 0.2; // должен соответствовать feeBps контракта (20%)

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confirmDialogText(p: PendingAction): { title: string; body: string; cta: string } {
  const amount = Number(p.date.amount);
  const fee = amount * FEE_RATE;
  const net = amount - fee;
  switch (p.action) {
    case "confirm":
      return {
        title: "Подтвердить свидание?",
        body: `С эскроу спишется ${amount} DATE: партнёр получит ${net} DATE, комиссия сервиса — ${fee} DATE. Действие необратимо.`,
        cta: "Подтвердить и оплатить",
      };
    case "cancel":
      return p.date.status === "ACCEPTED"
        ? {
            title: "Отменить свидание?",
            body: `Будет удержан штраф ${fee} DATE (20%), остальные ${net} DATE вернутся вам.`,
            cta: "Отменить со штрафом",
          }
        : {
            title: "Отменить предложение?",
            body: "Деньги ещё не заморожены — отмена бесплатна.",
            cta: "Отменить предложение",
          };
    case "refuse":
      return {
        title: "Отказаться от свидания?",
        body: `Вся сумма ${amount} DATE вернётся инициатору, вы ничего не получите.`,
        cta: "Отказаться",
      };
    case "claim":
      return {
        title: "Забрать выплату?",
        body: `Инициатор не подтвердил свидание в срок. Вы получите ${net} DATE, комиссия сервиса — ${fee} DATE.`,
        cta: "Забрать выплату",
      };
  }
}

export function DatesPage() {
  const { data: wallet } = useGetWalletQuery();
  const { data: dates, isLoading } = useGetDatesQuery();
  const [dateAction, { isLoading: acting }] = useDateActionMutation();
  const [rateDate] = useRateDateMutation();
  const [rated, setRated] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<DatesTab>("proposer");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  const all = dates ?? [];
  const list = all.filter((d) => d.role === tab);
  const countOf = (role: DatesTab) => all.filter((d) => d.role === role).length;

  const act = (id: string, action: DateAction) => dateAction({ id, action });

  const runPending = async () => {
    if (!pending) return;
    setActionError(null);
    try {
      await dateAction({ id: pending.date.id, action: pending.action }).unwrap();
      setPending(null);
    } catch (err) {
      const msg = (err as { data?: { message?: string } }).data?.message;
      setActionError(msg ?? "Не удалось выполнить действие");
    }
  };

  const rate = async (id: string, score: number) => {
    setRated((r) => ({ ...r, [id]: score }));
    await rateDate({ id, score }).unwrap().catch(() => undefined);
  };

  return (
    <div className={styles.page} data-testid="dates-page">
      <header className={styles.head}>
        <h2 className={styles.title}>Мои свидания</h2>
        <div className={styles.balance} data-testid="wallet-balance">
          💰 {wallet ? `${Number(wallet.balance)} ${wallet.symbol}` : "…"}
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Свидания">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "proposer"}
          className={`${styles.tab} ${tab === "proposer" ? styles.tabActive : ""}`}
          onClick={() => setTab("proposer")}
        >
          Я предложил ({countOf("proposer")})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "invitee"}
          className={`${styles.tab} ${tab === "invitee" ? styles.tabActive : ""}`}
          onClick={() => setTab("invitee")}
        >
          Мне предложили ({countOf("invitee")})
        </button>
      </div>

      {list.length === 0 && (
        <p className={styles.muted}>
          {tab === "proposer"
            ? "Вы пока никому не предлагали свидание. Предложите встречу кандидату в Discovery."
            : "Вам пока не предлагали свиданий."}
        </p>
      )}

      <ul className={styles.list}>
        {list.map((d) => (
          <li key={d.id} className={styles.item} data-testid="date-item">
            <div className={styles.row}>
              <span className={styles.name}>{d.counterpart.displayName ?? "Пользователь"}</span>
              <span className={styles.amount}>{Number(d.amount)} DATE</span>
            </div>
            <div className={styles.meta}>
              <span className={`${styles.status} ${styles[`s_${d.status}`]}`}>
                {STATUS_LABEL[d.status]}
              </span>
              <span className={styles.role}>{d.role === "proposer" ? "вы пригласили" : "вас пригласили"}</span>
            </div>
            {(d.scheduledAt || d.location) && (
              <p className={styles.when} data-testid="date-schedule">
                {d.scheduledAt && <>📅 {formatWhen(d.scheduledAt)}</>}
                {d.scheduledAt && d.location && " · "}
                {d.location && <>📍 {d.location}</>}
              </p>
            )}
            {d.message && <p className={styles.message}>«{d.message}»</p>}

            {renderActions(d, act, (p) => { setActionError(null); setPending(p); }, acting)}
            {d.status === "CONFIRMED" &&
              (() => {
                const score = d.myRating ?? rated[d.id] ?? 0;
                const done = d.myRating != null || Boolean(rated[d.id]);
                return (
                  <div className={styles.rating} data-testid="rating">
                    <span className={styles.ratingLabel}>{done ? "Ваша оценка:" : "Оценка:"}</span>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={styles.star}
                        aria-label={`Оценить на ${s}`}
                        disabled={done}
                        onClick={() => rate(d.id, s)}
                      >
                        {s <= score ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                );
              })()}
          </li>
        ))}
      </ul>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending ? confirmDialogText(pending).title : ""}
      >
        {pending && (
          <>
            <p>{confirmDialogText(pending).body}</p>
            {actionError && <p className={styles.error}>{actionError}</p>}
            <div className={styles.actions}>
              <Button size="md" disabled={acting} onClick={runPending} data-testid="confirm-action">
                {confirmDialogText(pending).cta}
              </Button>
              <Button size="md" variant="ghost" disabled={acting} onClick={() => setPending(null)}>
                Назад
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function renderActions(
  d: DateView,
  act: (id: string, a: DateAction) => void,
  requestConfirm: (p: PendingAction) => void,
  acting: boolean,
) {
  if (d.status === "PROPOSED" && d.role === "invitee") {
    return (
      <div className={styles.actions}>
        <Button size="sm" disabled={acting} onClick={() => act(d.id, "accept")}>
          Согласиться
        </Button>
        <Button size="sm" variant="secondary" disabled={acting} onClick={() => act(d.id, "decline")}>
          Отклонить
        </Button>
      </div>
    );
  }
  if (d.status === "PROPOSED" && d.role === "proposer") {
    return (
      <div className={styles.actions}>
        <Button
          size="sm"
          variant="ghost"
          disabled={acting}
          onClick={() => requestConfirm({ date: d, action: "cancel" })}
        >
          Отменить
        </Button>
      </div>
    );
  }
  if (d.status === "ACCEPTED" && d.role === "proposer") {
    return (
      <div className={styles.actions}>
        <Button
          size="sm"
          disabled={acting}
          onClick={() => requestConfirm({ date: d, action: "confirm" })}
        >
          ✅ Подтвердить: свидание состоялось
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={acting}
          onClick={() => requestConfirm({ date: d, action: "cancel" })}
        >
          Отменить (−20%)
        </Button>
      </div>
    );
  }
  if (d.status === "ACCEPTED" && d.role === "invitee") {
    const claimAt = d.claimAvailableAt ? new Date(d.claimAvailableAt) : null;
    const claimable = claimAt !== null && claimAt.getTime() <= Date.now();
    return (
      <>
        <p className={styles.hint}>
          Вы согласились. После встречи инициатор подтвердит свидание — тогда вы получите 80% суммы.
          {claimAt && !claimable && (
            <> Если он не подтвердит до {formatWhen(claimAt.toISOString())}, вы сможете забрать выплату сами.</>
          )}
        </p>
        <div className={styles.actions}>
          {claimable && (
            <Button size="sm" disabled={acting} onClick={() => requestConfirm({ date: d, action: "claim" })}>
              Забрать выплату
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={acting}
            onClick={() => requestConfirm({ date: d, action: "refuse" })}
          >
            Отказаться (вернуть всё инициатору)
          </Button>
        </div>
      </>
    );
  }
  return null;
}
