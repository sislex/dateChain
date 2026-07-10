import { cn } from "../../utils/cn";

import styles from "./Chat.module.css";

export type MessageStatus = "sent" | "delivered" | "read";

export interface ChatBubbleProps {
  text: string;
  own: boolean;
  time?: string;
  status?: MessageStatus;
}

const statusMark: Record<MessageStatus, string> = {
  sent: "✓",
  delivered: "✓✓",
  read: "✓✓",
};

export function ChatBubble({ text, own, time, status }: ChatBubbleProps) {
  return (
    <div className={cn(styles.bubbleRow, own ? styles.rowOwn : styles.rowOther)}>
      <div className={cn(styles.bubble, own ? styles.own : styles.other)}>
        {text}
        {(time || (own && status)) && (
          <span className={styles.meta}>
            {time}
            {own && status ? ` ${statusMark[status]}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
