import { Avatar } from "../../components/Avatar/Avatar";
import { Badge } from "../../components/Badge/Badge";

import styles from "./Chat.module.css";

export interface MatchListItemProps {
  name: string;
  photo?: string;
  preview?: string;
  unread?: boolean;
  /** Number of unread messages; when > 0 a numeric badge replaces the dot. */
  unreadCount?: number;
  isNewMatch?: boolean;
  onClick?: () => void;
}

export function MatchListItem({
  name,
  photo,
  preview,
  unread = false,
  unreadCount = 0,
  isNewMatch = false,
  onClick,
}: MatchListItemProps) {
  return (
    <button type="button" className={styles.matchItem} onClick={onClick}>
      <Avatar name={name} src={photo} ring={isNewMatch} />
      <span className={styles.matchBody}>
        <span className={styles.matchName}>{name}</span>
        <span className={styles.matchPreview}>
          {preview ?? (isNewMatch ? "Новый мэтч — напишите первым!" : "")}
        </span>
      </span>
      {unreadCount > 0 ? (
        <span className={styles.unreadDot} data-testid="unread-count">
          <Badge>{unreadCount > 99 ? "99+" : unreadCount}</Badge>
        </span>
      ) : (
        unread && (
          <span className={styles.unreadDot}>
            <Badge dot />
          </span>
        )
      )}
    </button>
  );
}
