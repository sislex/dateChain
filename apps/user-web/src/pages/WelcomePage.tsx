import { Button, Logo } from "@datechain/ui";
import { useNavigate } from "react-router-dom";

import styles from "./WelcomePage.module.css";

export function WelcomePage() {
  const navigate = useNavigate();
  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <Logo size={72} />
        <h1 className={styles.title}>dateChain</h1>
        <p className={styles.slogan}>Свайпай. Мэтчись. Общайся.</p>
      </div>
      <div className={styles.actions}>
        <Button fullWidth size="lg" onClick={() => navigate("/onboarding")}>
          Создать аккаунт
        </Button>
        <Button fullWidth size="lg" variant="secondary" onClick={() => navigate("/onboarding")}>
          Войти
        </Button>
      </div>
    </div>
  );
}
