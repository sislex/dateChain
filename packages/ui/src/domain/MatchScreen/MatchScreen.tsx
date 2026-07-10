import { motion, useReducedMotion } from "framer-motion";

import styles from "./MatchScreen.module.css";

export interface MatchScreenProps {
  currentUserPhoto: string;
  matchedUserPhoto: string;
  matchedUserName: string;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
}

export function MatchScreen({
  currentUserPhoto,
  matchedUserPhoto,
  matchedUserName,
  onSendMessage,
  onKeepSwiping,
}: MatchScreenProps) {
  const reduceMotion = useReducedMotion();
  const rise = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
  const pop = reduceMotion
    ? {}
    : { initial: { scale: 0.6, opacity: 0 }, animate: { scale: 1, opacity: 1 } };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Новый мэтч">
      <motion.h2 className={styles.title} {...rise}>
        It&apos;s a Match!
      </motion.h2>
      <motion.p className={styles.subtitle} {...rise}>
        Вы и {matchedUserName} понравились друг другу
      </motion.p>

      <div className={styles.avatars}>
        <motion.div className={styles.avatarWrap} {...pop} transition={{ delay: 0.05 }}>
          <img src={currentUserPhoto} alt="Вы" />
        </motion.div>
        <span className={styles.heart} aria-hidden="true">
          ♥
        </span>
        <motion.div className={styles.avatarWrap} {...pop} transition={{ delay: 0.15 }}>
          <img src={matchedUserPhoto} alt={matchedUserName} />
        </motion.div>
      </div>

      <motion.div className={styles.actions} {...rise} transition={{ delay: 0.2 }}>
        <button type="button" className={styles.primaryBtn} onClick={onSendMessage}>
          Написать сообщение
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={onKeepSwiping}>
          Продолжить свайпать
        </button>
      </motion.div>
    </div>
  );
}
