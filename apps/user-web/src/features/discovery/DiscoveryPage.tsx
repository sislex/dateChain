import { ActionBar, Button, Input, MatchScreen, Modal, Spinner, SwipeCard } from "@datechain/ui";
import type { SwipeCardHandle, SwipeDirection } from "@datechain/ui";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useProposeDateMutation } from "../dates/datesApi";
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
  const [proposeOpen, setProposeOpen] = useState(false);
  const [amount, setAmount] = useState("50");
  const [dateMessage, setDateMessage] = useState("");
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [proposeDate, { isLoading: proposing }] = useProposeDateMutation();

  const candidate = deck?.[index];

  async function submitProposal() {
    if (!candidate) return;
    setProposeError(null);
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt < 1) return setProposeError("Введите сумму (целое ≥ 1)");
    try {
      await proposeDate({
        inviteeId: candidate.userId,
        amount: amt,
        message: dateMessage.trim() || undefined,
      }).unwrap();
      setProposeOpen(false);
      setDateMessage("");
      navigate("/app/dates");
    } catch (err) {
      const data = (err as { data?: { message?: string } }).data;
      setProposeError(data?.message ?? "Не удалось предложить свидание");
    }
  }

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
            superLikedYou: candidate.superLikedYou,
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
      <Button variant="secondary" fullWidth onClick={() => setProposeOpen(true)}>
        💎 Предложить свидание за токены
      </Button>

      <Modal
        open={proposeOpen}
        onClose={() => setProposeOpen(false)}
        title={`Свидание с ${candidate.displayName}`}
      >
        <Input
          label="Сумма (DATE)"
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Сообщение (необязательно)"
          value={dateMessage}
          onChange={(e) => setDateMessage(e.target.value)}
          error={proposeError ?? undefined}
        />
        <p className={styles.emptyText}>
          Токены заморозятся после согласия. При подтверждении 80% получит партнёр, 20% — комиссия
          сервиса.
        </p>
        <Button fullWidth size="lg" disabled={proposing} onClick={submitProposal}>
          Предложить
        </Button>
      </Modal>
      {matchOverlay}
    </div>
  );
}
