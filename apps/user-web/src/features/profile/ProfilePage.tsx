import { Avatar, Button, Input, Modal, Spinner, Switch, TextArea } from "@datechain/ui";
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
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [discoverable, setDiscoverable] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setBio(profile.bio ?? "");
    setInterests(profile.interests.join(", "));
    setDiscoverable(profile.discoverable);
  }, [profile]);

  async function onSave() {
    if (!profile) return;
    await upsert({
      displayName,
      birthDate: profile.birthDate,
      gender: profile.gender,
      interestedIn: profile.interestedIn,
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
        <TextArea label="Био" value={bio} onChange={(e) => setBio(e.target.value)} />
        <Input
          label="Интересы (через запятую)"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
        />
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
