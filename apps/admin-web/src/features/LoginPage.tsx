import { Button, Input, Logo } from "@datechain/ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch } from "../store";
import { setCredentials } from "../store/authSlice";

import styles from "./LoginPage.module.css";
import { useAdminLoginMutation } from "./adminApi";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useAdminLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    try {
      const result = await login({ email, password, totp: totp || undefined }).unwrap();
      dispatch(setCredentials({ ...result.tokens, user: result.user }));
      navigate("/admin", { replace: true });
    } catch {
      setError("Неверные учётные данные или код 2FA");
    }
  }

  return (
    <div className={styles.screen}>
      <form
        className={styles.card}
        data-testid="admin-login"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <div className={styles.brand}>
          <Logo size={40} />
          <span className={styles.brandName}>dateChain Admin</span>
        </div>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Код 2FA (если включён)"
          inputMode="numeric"
          value={totp}
          onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          error={error ?? undefined}
        />
        <Button type="submit" fullWidth size="lg" disabled={isLoading}>
          Войти
        </Button>
      </form>
    </div>
  );
}
