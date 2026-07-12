import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { forwardRef, useImperativeHandle, useState } from "react";

import { cn } from "../../utils/cn";

import styles from "./SwipeCard.module.css";

export type SwipeDirection = "like" | "nope" | "superlike";

export type CardGender = "MAN" | "WOMAN" | "MORE";

export interface SwipeCardProfile {
  id: string;
  name: string;
  age: number;
  photos: string[];
  distanceKm?: number;
  bio?: string;
  gender?: CardGender;
  /** This person already super-liked the viewer — highlight the card. */
  superLikedYou?: boolean;
}

const GENDER_BADGE: Record<CardGender, { icon: string; label: string }> = {
  MAN: { icon: "♂", label: "Мужчина" },
  WOMAN: { icon: "♀", label: "Женщина" },
  MORE: { icon: "⚧", label: "Другое" },
};

export interface SwipeCardHandle {
  /** Programmatically swipe the card (used by ActionBar buttons). */
  swipe: (direction: SwipeDirection) => void;
}

export interface SwipeCardProps {
  profile: SwipeCardProfile;
  onSwipe: (direction: SwipeDirection, profileId: string) => void;
  /** Horizontal/vertical distance (px) required to commit a swipe. */
  threshold?: number;
  className?: string;
}

/**
 * Pure decision logic for a drag gesture: given the drag offset and the commit
 * threshold, returns the swipe direction, or null when the drag was too small
 * and the card should spring back. Extracted for deterministic unit testing.
 */
export function resolveSwipeFromOffset(
  offset: { x: number; y: number },
  threshold: number,
): SwipeDirection | null {
  if (offset.y < -threshold && Math.abs(offset.x) < threshold) return "superlike";
  if (offset.x > threshold) return "like";
  if (offset.x < -threshold) return "nope";
  return null;
}

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { profile, onSwipe, threshold = 120, className },
  ref,
) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [gone, setGone] = useState(false);

  const rotate = useTransform(x, [-300, 300], reduceMotion ? [0, 0] : [-18, 18]);
  const likeOpacity = useTransform(x, [10, threshold], [0, 1]);
  const nopeOpacity = useTransform(x, [-threshold, -10], [1, 0]);
  const superOpacity = useTransform(y, [-threshold, -10], [1, 0]);

  const commit = (direction: SwipeDirection) => {
    if (gone) return;
    setGone(true);
    const flyX = direction === "like" ? 600 : direction === "nope" ? -600 : 0;
    const flyY = direction === "superlike" ? -800 : 0;
    x.set(flyX);
    y.set(flyY);
    onSwipe(direction, profile.id);
  };

  useImperativeHandle(ref, () => ({ swipe: commit }));

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    const direction = resolveSwipeFromOffset(info.offset, threshold);
    if (direction) {
      commit(direction);
    } else {
      x.set(0);
      y.set(0);
    }
  };

  const cover = profile.photos[0];

  return (
    <motion.div
      className={cn(styles.card, profile.superLikedYou && styles.superLiked, className)}
      style={{ x, y, rotate }}
      drag={!gone}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      animate={gone ? { opacity: 0 } : undefined}
      transition={{ type: reduceMotion ? "tween" : "spring", stiffness: 300, damping: 30 }}
      data-testid="swipe-card"
      aria-label={`${profile.name}, ${profile.age}`}
    >
      {cover && <img className={styles.photo} src={cover} alt={profile.name} />}
      <div className={styles.gradient} />

      {profile.superLikedYou && (
        <div className={styles.superBadge} data-testid="super-badge">
          <span aria-hidden="true">★</span> Вас суперлайкнули
        </div>
      )}

      <motion.span
        className={cn(styles.stamp, styles.stampLike)}
        style={{ opacity: likeOpacity }}
        aria-hidden="true"
      >
        Like
      </motion.span>
      <motion.span
        className={cn(styles.stamp, styles.stampNope)}
        style={{ opacity: nopeOpacity }}
        aria-hidden="true"
      >
        Nope
      </motion.span>
      <motion.span
        className={cn(styles.stamp, styles.stampSuper)}
        style={{ opacity: superOpacity }}
        aria-hidden="true"
      >
        Super
      </motion.span>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h3 className={styles.name}>{profile.name}</h3>
          <span className={styles.age}>{profile.age}</span>
          {profile.gender && (
            <span className={styles.gender} title={GENDER_BADGE[profile.gender].label}>
              <span aria-hidden="true">{GENDER_BADGE[profile.gender].icon}</span>
              {GENDER_BADGE[profile.gender].label}
            </span>
          )}
        </div>
        {profile.distanceKm != null && (
          <div className={styles.distance}>{profile.distanceKm} км от вас</div>
        )}
        {profile.bio && <div className={styles.bio}>{profile.bio}</div>}
      </div>
    </motion.div>
  );
});
