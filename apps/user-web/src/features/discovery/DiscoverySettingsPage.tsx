import { Gender } from "@datechain/types";
import { Button, Chip, Slider, Spinner, Switch } from "@datechain/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useGetMyProfileQuery, useUpsertProfileMutation } from "../profile/profileApi";

import styles from "./DiscoverySettingsPage.module.css";

const GENDER_LABELS: Record<Gender, string> = {
  [Gender.Man]: "Мужчины",
  [Gender.Woman]: "Женщины",
  [Gender.More]: "Другое",
};

export function DiscoverySettingsPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useGetMyProfileQuery();
  const [upsert, { isLoading: saving }] = useUpsertProfileMutation();

  const [radiusKm, setRadiusKm] = useState(80);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(60);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [discoverable, setDiscoverable] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setRadiusKm(profile.radiusKm);
    setAgeMin(profile.ageMin);
    setAgeMax(profile.ageMax);
    setInterestedIn(profile.interestedIn);
    setDiscoverable(profile.discoverable);
  }, [profile]);

  function toggle(g: Gender) {
    setInterestedIn((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function onSave() {
    if (!profile) return;
    await upsert({
      displayName: profile.displayName,
      birthDate: profile.birthDate,
      gender: profile.gender,
      interestedIn,
      radiusKm,
      ageMin: Math.min(ageMin, ageMax),
      ageMax: Math.max(ageMin, ageMax),
      discoverable,
    }).unwrap();
    navigate("/app/discovery");
  }

  if (isLoading || !profile) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="discovery-settings">
      <h2 className={styles.title}>Настройки поиска</h2>

      <Slider
        label="Расстояние"
        min={1}
        max={300}
        value={radiusKm}
        formatValue={(v) => `${v} км`}
        onChange={(e) => setRadiusKm(Number(e.target.value))}
      />
      <Slider
        label="Минимальный возраст"
        min={18}
        max={100}
        value={ageMin}
        onChange={(e) => setAgeMin(Number(e.target.value))}
      />
      <Slider
        label="Максимальный возраст"
        min={18}
        max={100}
        value={ageMax}
        onChange={(e) => setAgeMax(Number(e.target.value))}
      />

      <div className={styles.group}>
        <span className={styles.groupLabel}>Показывать</span>
        <div className={styles.chips}>
          {Object.values(Gender).map((g) => (
            <Chip key={g} selected={interestedIn.includes(g)} onToggle={() => toggle(g)}>
              {GENDER_LABELS[g]}
            </Chip>
          ))}
        </div>
      </div>

      <Switch
        checked={discoverable}
        onChange={(e) => setDiscoverable(e.target.checked)}
        label="Показывать меня в Discovery"
      />

      <Button fullWidth size="lg" disabled={saving} onClick={onSave}>
        Сохранить
      </Button>
    </div>
  );
}
