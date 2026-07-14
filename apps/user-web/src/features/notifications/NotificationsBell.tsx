import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useSocketEvent } from "../../socket/useSocketEvent";

import styles from "./NotificationsBell.module.css";
import {
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
  type NotificationType,
} from "./notificationsApi";

const LABELS: Record<NotificationType, string> = {
  MATCH: "Новый мэтч 🔥",
  MESSAGE: "Новое сообщение 💬",
  SUPER_LIKE: "Вас суперлайкнули ★",
  SYSTEM: "Системное уведомление",
  DATE_PROPOSED: "Вам предложили свидание 💎",
  DATE_ACCEPTED: "Свидание принято ✅",
  DATE_DECLINED: "Свидание отклонено",
  DATE_CONFIRMED: "Свидание подтверждено — токены переведены",
  DATE_CANCELLED: "Свидание отменено",
  TRANSFER_RECEIVED: "Вам перевели токены ↗",
};

/** Where clicking a notification takes the user. */
const ROUTES: Partial<Record<NotificationType, string>> = {
  MATCH: "/app/chats",
  MESSAGE: "/app/chats",
  SUPER_LIKE: "/app/likes",
  DATE_PROPOSED: "/app/dates",
  DATE_ACCEPTED: "/app/dates",
  DATE_DECLINED: "/app/dates",
  DATE_CONFIRMED: "/app/dates",
  DATE_CANCELLED: "/app/dates",
  TRANSFER_RECEIVED: "/app/wallet",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notifications, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationsReadMutation();

  // Refresh the badge when real-time events arrive.
  useSocketEvent("match:new", () => refetch());
  useSocketEvent("message:new", () => refetch());

  const list = notifications ?? [];
  const unread = list.filter((n) => !n.readAt).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) void markRead();
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.bell}
        aria-label="Уведомления"
        data-testid="notifications-bell"
        onClick={toggle}
      >
        🔔
        {unread > 0 && (
          <span className={styles.badge} data-testid="notifications-badge">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Закрыть уведомления"
            className={styles.backdrop}
            onClick={() => setOpen(false)}
          />
          <div className={styles.panel} data-testid="notifications-panel">
            <div className={styles.header}>Уведомления</div>
            {list.length === 0 && <div className={styles.empty}>Пока пусто</div>}
            <ul className={styles.list}>
              {list.slice(0, 30).map((n) => {
                const route = ROUTES[n.type];
                return (
                  <li key={n.id} className={n.readAt ? styles.item : styles.itemUnread}>
                    <button
                      type="button"
                      className={styles.itemButton}
                      disabled={!route}
                      onClick={() => {
                        if (!route) return;
                        setOpen(false);
                        navigate(route);
                      }}
                    >
                      <span className={styles.itemLabel}>{LABELS[n.type] ?? n.type}</span>
                      <span className={styles.itemTime}>{timeAgo(n.createdAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
