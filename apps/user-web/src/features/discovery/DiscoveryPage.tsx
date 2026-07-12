import { ActionBar, Button, MatchScreen, Spinner, SwipeCard } from "@datechain/ui";
import type { SwipeCardHandle, SwipeDirection } from "@datechain/ui";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useListPhotosQuery } from "../profile/profileApi";

import styles from "./DiscoveryPage.module.css";
import {
  photoUrl,
  useGetDeckQuery,
  useSwipeMutation,
  type DeckCandidate,
  type SwipeAction,
} from "./discoveryApi";

const DIRECTION_TO_ACTION: Record<SwipeDirection, SwipeAction> = {
  like: "LIKE",
  nope: "NOPE",
  superlike: "SUPER_LIKE",
};

interface MatchInfo {
  candidate: DeckCandidate;
}

export function DiscoveryPage() {
  const navigate = useNavigate();
  const cardRef = useRef<SwipeCardHandle>(null);
  const { data: deck, isLoading, isError } = useGetDeckQuery(20);
  const { data: myPhotos } = useListPhotosQuery();
  const [swipe] = useSwipeMutation();

  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const candidate = deck?.[index];

  async function handleSwipe(direction: SwipeDirection, targetId: string) {
    const current = deck?.find((c) => c.userId === targetId);
    setIndex((i) => i + 1);
    try {
      const result = await swipe({ targetId, action: DIRECTION_TO_ACTION[direction] }).unwrap();
      if (result.matched && current) setMatch({ candidate: current });
    } catch (err) {
      if ((err as { status?: number }).status === 429) setLimitReached(true);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.center} data-testid="deck-error">
        <p>Не удалось загрузить колоду</p>
      </div>
    );
  }

  if (limitReached) {
    return (
      <div className={styles.center} data-testid="deck-limit">
        <h3 className={styles.emptyTitle}>Лимит лайков исчерпан</h3>
        <p className={styles.emptyText}>Возвращайтесь позже или оформите подписку.</p>
      </div>
    );
  }

  const myPhotoUrl = myPhotos?.[0] ? photoUrl(myPhotos[0].id) : undefined;

  // Rendered even once the deck is exhausted, so a match from the last card shows.
  const matchOverlay = match ? (
    <MatchScreen
      currentUserPhoto={myPhotoUrl ?? photoUrl(match.candidate.photos[0]?.id ?? "")}
      matchedUserPhoto={photoUrl(match.candidate.photos[0]?.id ?? "")}
      matchedUserName={match.candidate.displayName}
      onSendMessage={() => navigate("/app/chats")}
      onKeepSwiping={() => setMatch(null)}
    />
  ) : null;

  if (!candidate) {
    return (
      <div className={styles.center} data-testid="deck-empty">
        <h3 className={styles.emptyTitle}>Пока никого рядом</h3>
        <p className={styles.emptyText}>Попробуйте расширить радиус или изменить фильтры.</p>
        <Button variant="secondary" onClick={() => navigate("/app/discovery/settings")}>
          Настройки поиска
        </Button>
        {matchOverlay}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.deck}>
        <SwipeCard
          key={candidate.userId}
          ref={cardRef}
          profile={{
            id: candidate.userId,
            name: candidate.displayName,
            age: candidate.age,
            gender: candidate.gender,
            distanceKm: candidate.distanceKm,
            bio: candidate.bio ?? undefined,
            photos: candidate.photos.map((p) => photoUrl(p.id)),
          }}
          onSwipe={handleSwipe}
        />
      </div>
      <ActionBar
        onNope={() => cardRef.current?.swipe("nope")}
        onSuperLike={() => cardRef.current?.swipe("superlike")}
        onLike={() => cardRef.current?.swipe("like")}
      />
      {matchOverlay}
    </div>
  );
}
