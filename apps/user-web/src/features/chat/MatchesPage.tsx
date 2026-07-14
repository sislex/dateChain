import { Avatar, MatchListItem, Spinner } from "@datechain/ui";
import { useNavigate } from "react-router-dom";

import { useSocketEvent } from "../../socket/useSocketEvent";
import { ProposeDateButton } from "../dates/ProposeDateButton";
import { photoUrl } from "../discovery/discoveryApi";
import { TransferButton } from "../transfers/TransferButton";

import styles from "./MatchesPage.module.css";
import { useGetMatchPreviewsQuery } from "./chatApi";

export function MatchesPage() {
  const navigate = useNavigate();
  const { data: previews, isLoading, refetch } = useGetMatchPreviewsQuery();

  // Refresh the list when a new match or message arrives in real time.
  useSocketEvent("match:new", () => refetch());
  useSocketEvent("message:new", () => refetch());

  if (isLoading) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  const list = previews ?? [];
  const fresh = list.filter((m) => !m.lastMessage);
  const conversations = list.filter((m) => m.lastMessage);

  if (list.length === 0) {
    return (
      <div className={styles.center} data-testid="matches-empty">
        <h3 className={styles.title}>Пока нет мэтчей</h3>
        <p className={styles.muted}>Свайпайте вправо, чтобы находить людей.</p>
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="matches-page">
      {fresh.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>Новые мэтчи</h3>
          <div className={styles.lane}>
            {fresh.map((m) => (
              <div key={m.matchId} className={styles.laneItem}>
                <button
                  type="button"
                  className={styles.laneButton}
                  onClick={() => navigate(`/app/chats/${m.matchId}`)}
                >
                  <Avatar
                    name={m.partner.displayName}
                    src={m.partner.photoId ? photoUrl(m.partner.photoId, "thumb") : undefined}
                    size="lg"
                    ring
                  />
                  <span className={styles.laneName}>{m.partner.displayName}</span>
                </button>
                <ProposeDateButton
                  inviteeId={m.partner.userId}
                  inviteeName={m.partner.displayName}
                  label="💎"
                />
                <TransferButton
                  recipientId={m.partner.userId}
                  recipientName={m.partner.displayName}
                  label="↗"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className={styles.sectionTitle}>Сообщения</h3>
        {conversations.length === 0 && <p className={styles.muted}>Напишите первым 👋</p>}
        {conversations.map((m) => (
          <div key={m.matchId} className={styles.conversationRow}>
            <div className={styles.conversationItem}>
              <MatchListItem
                name={m.partner.displayName}
                photo={m.partner.photoId ? photoUrl(m.partner.photoId, "thumb") : undefined}
                preview={m.lastMessage?.text ?? ""}
                unread={m.unreadCount > 0}
                unreadCount={m.unreadCount}
                onClick={() => navigate(`/app/chats/${m.matchId}`)}
              />
            </div>
            <ProposeDateButton
              inviteeId={m.partner.userId}
              inviteeName={m.partner.displayName}
              label="💎"
            />
            <TransferButton
              recipientId={m.partner.userId}
              recipientName={m.partner.displayName}
              label="↗"
            />
          </div>
        ))}
      </section>
    </div>
  );
}
