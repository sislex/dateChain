import { Gender } from "@datechain/types";
import { Avatar, Button, Chip, Input, Modal, Spinner, Switch, TextArea } from "@datechain/ui";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../store";
import { logout as logoutAction } from "../../store/authSlice";
import { useDeleteAccountMutation, useLogoutServerMutation } from "../auth/authApi";
import { photoUrl } from "../discovery/discoveryApi";

import styles from "./ProfilePage.module.css";
import {
  useDeletePhotoMutation,
  useGetMyProfileQuery,
  useListPhotosQuery,
  useUploadPhotoMutation,
  useUpsertProfileMutation,
} from "./profileApi";

const GENDER_LABELS: Record<Gender, string> = {
  [Gender.Man]: "Мужчина",
  [Gender.Woman]: "Женщина",
  [Gender.More]: "Другое",
};

export function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useGetMyProfileQuery();
  const { data: photos } = useListPhotosQuery();
  const [upsert, { isLoading: saving }] = useUpsertProfileMutation();
  const [uploadPhoto] = useUploadPhotoMutation();
  const [deletePhoto] = useDeletePhotoMutation();
  const [logoutServer] = useLogoutServerMutation();
  const [deleteAccount] = useDeleteAccountMutation();

  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [discoverable, setDiscoverable] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setBirthDate(profile.birthDate.slice(0, 10));
    setGender(profile.gender);
    setInterestedIn(profile.interestedIn);
    setBio(profile.bio ?? "");
    setInterests(profile.interests.join(", "));
    setDiscoverable(profile.discoverable);
  }, [profile]);

  function toggleInterest(g: Gender) {
    setInterestedIn((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function onSave() {
    if (!profile || !gender) return;
    if (interestedIn.length === 0) {
      setSaveError("Выберите, кого вы ищете");
      return;
    }
    setSaveError(null);
    await upsert({
      displayName,
      birthDate,
      gender,
      interestedIn,
      bio,
      interests: interests
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      discoverable,
    }).unwrap();
  }

  async function onUpload(file: File) {
    const form = new FormData();
    form.append("file", file);
    await uploadPhoto(form).unwrap();
  }

  async function doLogout() {
    if (refreshToken)
      await logoutServer({ refreshToken })
        .unwrap()
        .catch(() => undefined);
    dispatch(logoutAction());
    navigate("/welcome", { replace: true });
  }

  async function doDelete() {
    await deleteAccount()
      .unwrap()
      .catch(() => undefined);
    dispatch(logoutAction());
    navigate("/welcome", { replace: true });
  }

  if (isLoading || !profile) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="profile-page">
      <div className={styles.head}>
        <Avatar
          name={profile.displayName}
          src={photos?.[0] ? photoUrl(photos[0].id, "thumb") : undefined}
          size="lg"
        />
        <div>
          <div className={styles.name}>
            {profile.displayName}, {profile.age}
          </div>
          <div className={styles.completion} data-testid="completion">
            Профиль заполнен на {profile.completion}%
          </div>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Фото</h3>
        <div className={styles.photos}>
          {(photos ?? []).map((p) => (
            <div key={p.id} className={styles.photo}>
              <img src={photoUrl(p.id, "thumb")} alt="Фото профиля" />
              <button
                type="button"
                aria-label="Удалить фото"
                className={styles.remove}
                onClick={() => deletePhoto(p.id)}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.addPhoto}
            onClick={() => fileRef.current?.click()}
          >
            + Добавить
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>О себе</h3>
        <Input label="Имя" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <Input
          label="Дата рождения"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
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
        </div>
        <TextArea label="Био" value={bio} onChange={(e) => setBio(e.target.value)} />
        <Input
          label="Интересы (через запятую)"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
        />
        {saveError && <span className={styles.err}>{saveError}</span>}
        <Button disabled={saving} onClick={onSave}>
          Сохранить
        </Button>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Настройки</h3>
        <Switch
          checked={discoverable}
          onChange={(e) => {
            setDiscoverable(e.target.checked);
          }}
          label="Показывать меня в Discovery (пауза при выключении)"
        />
        <Button variant="secondary" onClick={doLogout}>
          Выйти
        </Button>
        <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
          Удалить аккаунт
        </Button>
      </section>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Удалить аккаунт?">
        <p>Это действие необратимо — профиль, мэтчи и переписки будут удалены.</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={doDelete}>
            Удалить навсегда
          </Button>
        </div>
      </Modal>
    </div>
  );
}
