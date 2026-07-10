import { Avatar } from "../../components/Avatar/Avatar";
import { Badge } from "../../components/Badge/Badge";

import styles from "./Chat.module.css";

export interface MatchListItemProps {
  name: string;
  photo?: string;
  preview?: string;
  unread?: boolean;
  isNewMatch?: boolean;
  onClick?: () => void;
}

export function MatchListItem({
  name,
  photo,
  preview,
  unread = false,
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
      {unread && (
        <span className={styles.unreadDot}>
          <Badge dot />
        </span>
      )}
    </button>
  );
}
