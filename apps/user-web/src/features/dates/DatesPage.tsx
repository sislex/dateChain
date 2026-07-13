import { Button, Spinner } from "@datechain/ui";
import { useState } from "react";

import styles from "./DatesPage.module.css";
import {
  useDateActionMutation,
  useGetDatesQuery,
  useGetWalletQuery,
  useRateDateMutation,
  type DateStatus,
  type DateView,
} from "./datesApi";

const STATUS_LABEL: Record<DateStatus, string> = {
  PROPOSED: "Ожидает ответа",
  ACCEPTED: "Токены заморожены",
  CONFIRMED: "Свидание состоялось",
  CANCELLED: "Отменено",
  DECLINED: "Отклонено",
};

export function DatesPage() {
  const { data: wallet } = useGetWalletQuery();
  const { data: dates, isLoading } = useGetDatesQuery();
  const [dateAction, { isLoading: acting }] = useDateActionMutation();
  const [rateDate] = useRateDateMutation();
  const [rated, setRated] = useState<Record<string, number>>({});

  if (isLoading) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  const list = dates ?? [];

  const act = (id: string, action: "accept" | "decline" | "confirm" | "cancel") =>
    dateAction({ id, action });

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

      {list.length === 0 && (
        <p className={styles.muted}>
          Пока нет свиданий. Предложите встречу кандидату в Discovery.
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
            {d.message && <p className={styles.message}>«{d.message}»</p>}

            {renderActions(d, act, acting)}
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
    </div>
  );
}

function renderActions(
  d: DateView,
  act: (id: string, a: "accept" | "decline" | "confirm" | "cancel") => void,
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
        <Button size="sm" variant="ghost" disabled={acting} onClick={() => act(d.id, "cancel")}>
          Отменить
        </Button>
      </div>
    );
  }
  if (d.status === "ACCEPTED" && d.role === "proposer") {
    return (
      <div className={styles.actions}>
        <Button size="sm" disabled={acting} onClick={() => act(d.id, "confirm")}>
          Свидание состоялось
        </Button>
        <Button size="sm" variant="ghost" disabled={acting} onClick={() => act(d.id, "cancel")}>
          Отменить (−20%)
        </Button>
      </div>
    );
  }
  if (d.status === "ACCEPTED" && d.role === "invitee") {
    return <p className={styles.hint}>Ждём подтверждения от инициатора.</p>;
  }
  return null;
}
