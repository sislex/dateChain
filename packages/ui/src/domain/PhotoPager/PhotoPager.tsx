import { useState } from "react";

import { cn } from "../../utils/cn";

import styles from "./PhotoPager.module.css";

export interface PhotoPagerProps {
  photos: string[];
  alt: string;
  className?: string;
}

export function PhotoPager({ photos, alt, className }: PhotoPagerProps) {
  const [index, setIndex] = useState(0);
  const count = photos.length;

  const go = (delta: number) => {
    setIndex((i) => Math.min(count - 1, Math.max(0, i + delta)));
  };

  return (
    <div className={cn(styles.pager, className)}>
      {count > 1 && (
        <div className={styles.segments} data-testid="photo-segments">
          {photos.map((p, i) => (
            <span key={p} className={cn(styles.segment, i === index && styles.segmentActive)} />
          ))}
        </div>
      )}
      <img className={styles.photo} src={photos[index]} alt={`${alt} — фото ${index + 1}`} />
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            className={cn(styles.zone, styles.zoneLeft)}
            disabled={index === 0}
            onClick={() => go(-1)}
          />
          <button
            type="button"
            aria-label="Следующее фото"
            className={cn(styles.zone, styles.zoneRight)}
            disabled={index === count - 1}
            onClick={() => go(1)}
          />
        </>
      )}
    </div>
  );
}
