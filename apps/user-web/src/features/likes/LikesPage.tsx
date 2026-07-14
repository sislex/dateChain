import { Button, Spinner } from "@datechain/ui";

import { ProposeDateButton } from "../dates/ProposeDateButton";
import { useSwipeMutation, photoUrl } from "../discovery/discoveryApi";

import styles from "./LikesPage.module.css";
import { useGetLikesQuery } from "./likesApi";

export function LikesPage() {
  const { data: likes, isLoading } = useGetLikesQuery();
  const [swipe, { isLoading: swiping }] = useSwipeMutation();

  if (isLoading) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  const list = likes ?? [];

  if (list.length === 0) {
    return (
      <div className={styles.center} data-testid="likes-empty">
        <h3 className={styles.title}>Пока вас никто не лайкнул</h3>
        <p className={styles.muted}>Свайпайте в Discovery — лайки появятся здесь.</p>
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="likes-page">
      <h2 className={styles.title}>Вас лайкнули</h2>
      <div className={styles.grid}>
        {list.map((l) => (
          <div key={l.userId} className={styles.card} data-testid="like-card">
            <div className={styles.photoWrap}>
              {l.photoId ? (
                <img className={styles.photo} src={photoUrl(l.photoId, "thumb")} alt={l.displayName} />
              ) : (
                <div className={styles.noPhoto}>{l.displayName[0]}</div>
              )}
              {l.superLike && <span className={styles.super}>★ Суперлайк</span>}
            </div>
            <div className={styles.info}>
              <span className={styles.name}>
                {l.displayName}, {l.age}
              </span>
              {l.rating !== null && (
                <span className={styles.ratingBadge} title={`Оценок: ${l.ratingCount}`}>
                  ★ {l.rating} ({l.ratingCount})
                </span>
              )}
            </div>
            <div className={styles.actions}>
              <Button
                size="sm"
                disabled={swiping}
                onClick={() => swipe({ targetId: l.userId, action: "LIKE" })}
              >
                ❤ В ответ
              </Button>
              <ProposeDateButton
                inviteeId={l.userId}
                inviteeName={l.displayName}
                label="💎 Свидание за деньги"
                fullWidth
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
