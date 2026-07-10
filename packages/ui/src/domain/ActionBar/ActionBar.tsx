import { IconButton } from "../../components/IconButton/IconButton";
import { cn } from "../../utils/cn";

import styles from "./ActionBar.module.css";

export interface ActionBarProps {
  onRewind?: () => void;
  onNope: () => void;
  onSuperLike: () => void;
  onLike: () => void;
  onBoost?: () => void;
  /** Show premium actions (rewind/boost). Off in core (feature-flagged). */
  showPremium?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ActionBar({
  onRewind,
  onNope,
  onSuperLike,
  onLike,
  onBoost,
  showPremium = false,
  disabled = false,
  className,
}: ActionBarProps) {
  return (
    <div className={cn(styles.actionBar, className)}>
      {showPremium && (
        <IconButton
          label="Вернуть"
          accent="rewind"
          size="sm"
          icon="↺"
          disabled={disabled}
          onClick={onRewind}
        />
      )}
      <IconButton label="Не нравится" accent="nope" icon="✕" disabled={disabled} onClick={onNope} />
      <IconButton
        label="Супер-лайк"
        accent="superlike"
        size="sm"
        icon="★"
        disabled={disabled}
        onClick={onSuperLike}
      />
      <IconButton label="Нравится" accent="like" icon="♥" disabled={disabled} onClick={onLike} />
      {showPremium && (
        <IconButton
          label="Boost"
          accent="boost"
          size="sm"
          icon="⚡"
          disabled={disabled}
          onClick={onBoost}
        />
      )}
    </div>
  );
}
