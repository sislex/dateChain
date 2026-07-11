import { Gender } from "@datechain/types";
import { Button, Chip, Input, Logo } from "@datechain/ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch } from "../../store";
import { setCredentials } from "../../store/authSlice";
import { useRequestOtpMutation, useVerifyOtpMutation } from "../auth/authApi";
import { useUpsertProfileMutation } from "../profile/profileApi";

import styles from "./OnboardingFlow.module.css";
import { ageOf, profileSchema } from "./schema";

type Step = "phone" | "otp" | "profile";

// DEV: log in with phone only (no OTP code). Backend must run with AUTH_DEV_LOGIN=true.
const DEV_LOGIN = import.meta.env.VITE_DEV_LOGIN === "true";

const GENDER_LABELS: Record<Gender, string> = {
  [Gender.Man]: "Мужчина",
  [Gender.Woman]: "Женщина",
  [Gender.More]: "Другое",
};

export function OnboardingFlow() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [requestOtp, { isLoading: requesting }] = useRequestOtpMutation();
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [upsertProfile, { isLoading: saving }] = useUpsertProfileMutation();

  async function onRequestOtp() {
    setError(null);
    if (phone.trim().length < 5) return setError("Введите телефон");
    if (DEV_LOGIN) return devLogin();
    try {
      await requestOtp({ channel: "phone", identifier: phone.trim() }).unwrap();
      setStep("otp");
    } catch {
      setError("Не удалось отправить код");
    }
  }

  // DEV: phone-only login — verify with a placeholder code (backend bypasses it),
  // then go straight to the app if a profile already exists, else onboard.
  async function devLogin() {
    setError(null);
    try {
      const result = await verifyOtp({
        channel: "phone",
        identifier: phone.trim(),
        code: "000000",
      }).unwrap();
      dispatch(setCredentials({ ...result.tokens, user: result.user }));
      const hasProfile = await fetch("/api/profile/me", {
        headers: { Authorization: `Bearer ${result.tokens.accessToken}` },
      }).then((r) => r.ok);
      navigate(hasProfile ? "/app/discovery" : "/onboarding", { replace: true });
      if (!hasProfile) setStep("profile");
    } catch {
      setError("Не удалось войти");
    }
  }

  async function onVerifyOtp() {
    setError(null);
    if (code.length !== 6) return setError("Код состоит из 6 цифр");
    try {
      const result = await verifyOtp({ channel: "phone", identifier: phone.trim(), code }).unwrap();
      dispatch(setCredentials({ ...result.tokens, user: result.user }));
      setStep("profile");
    } catch {
      setError("Неверный или просроченный код");
    }
  }

  function toggleInterest(g: Gender) {
    setInterestedIn((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function onSaveProfile() {
    const parsed = profileSchema.safeParse({ displayName, birthDate, gender, interestedIn });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    await upsertProfile({
      ...parsed.data,
      lat: 55.7558,
      lng: 37.6173,
    }).unwrap();
    navigate("/app/discovery", { replace: true });
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <Logo size={40} />
      </div>

      {step === "phone" && (
        <div className={styles.step} data-testid="step-phone">
          <h2 className={styles.title}>Ваш номер телефона</h2>
          <Input
            label="Телефон"
            placeholder="+7 999 000-00-00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={error ?? undefined}
          />
          <Button fullWidth size="lg" disabled={requesting} onClick={onRequestOtp}>
            {DEV_LOGIN ? "Войти" : "Получить код"}
          </Button>
        </div>
      )}

      {step === "otp" && (
        <div className={styles.step} data-testid="step-otp">
          <h2 className={styles.title}>Введите код из СМС</h2>
          <Input
            label="Код"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            error={error ?? undefined}
          />
          <Button fullWidth size="lg" disabled={verifying} onClick={onVerifyOtp}>
            Подтвердить
          </Button>
        </div>
      )}

      {step === "profile" && (
        <div className={styles.step} data-testid="step-profile">
          <h2 className={styles.title}>Расскажите о себе</h2>
          <Input
            label="Имя"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={fieldErrors.displayName}
          />
          <Input
            label="Дата рождения"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            error={
              fieldErrors.birthDate ?? (birthDate && ageOf(birthDate) < 18 ? "18+" : undefined)
            }
          />
          <div className={styles.group}>
            <span className={styles.groupLabel}>Пол</span>
            <div className={styles.chips}>
              {Object.values(Gender).map((g) => (
                <Chip key={g} selected={gender === g} onToggle={() => setGender(g)}>
                  {GENDER_LABELS[g]}
                </Chip>
              ))}
            </div>
            {fieldErrors.gender && <span className={styles.err}>{fieldErrors.gender}</span>}
          </div>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Кого ищу</span>
            <div className={styles.chips}>
              {Object.values(Gender).map((g) => (
                <Chip
                  key={g}
                  selected={interestedIn.includes(g)}
                  onToggle={() => toggleInterest(g)}
                >
                  {GENDER_LABELS[g]}
                </Chip>
              ))}
            </div>
            {fieldErrors.interestedIn && (
              <span className={styles.err}>{fieldErrors.interestedIn}</span>
            )}
          </div>
          <Button fullWidth size="lg" disabled={saving} onClick={onSaveProfile}>
            Начать знакомиться
          </Button>
        </div>
      )}
    </div>
  );
}
