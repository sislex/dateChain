import { UserRole } from "@datechain/types";
import { Badge, Button, Input, Spinner } from "@datechain/ui";
import { useState } from "react";

import { useAppSelector } from "../store";
import { hasRank, selectRole } from "../store/authSlice";

import styles from "./UsersPage.module.css";
import { useImpersonateMutation, useListUsersQuery, useSetUserStatusMutation } from "./adminApi";

/** user-web origin the impersonated session opens in. */
const USER_WEB_URL =
  (import.meta.env.VITE_USER_WEB_URL as string | undefined) ?? "http://localhost:5175";

export function UsersPage() {
  const role = useAppSelector(selectRole);
  const canImpersonate = hasRank(role, UserRole.Admin);
  const [q, setQ] = useState("");
  const { data, isLoading } = useListUsersQuery({ q: q || undefined });
  const [setStatus] = useSetUserStatusMutation();
  const [impersonate] = useImpersonateMutation();

  const loginAs = async (id: string) => {
    const res = await impersonate(id).unwrap();
    // Tokens go in the hash fragment: it never leaves the browser.
    const params = new URLSearchParams({
      access: res.tokens.accessToken,
      refresh: res.tokens.refreshToken,
      id: res.user.id,
      role: res.user.role,
    });
    if (res.user.email) params.set("email", res.user.email);
    if (res.user.phone) params.set("phone", res.user.phone);
    window.open(`${USER_WEB_URL}/impersonate#${params.toString()}`, "_blank", "noopener");
  };

  return (
    <div data-testid="users-page">
      <h1 className={styles.title}>Пользователи</h1>
      <div className={styles.search}>
        <Input
          aria-label="Поиск"
          placeholder="Поиск по email или телефону"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading || !data ? (
        <Spinner size="lg" />
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Контакт</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id} data-testid={`user-${u.id}`}>
                <td>{u.email ?? u.phone ?? u.id.slice(0, 8)}</td>
                <td>{u.role}</td>
                <td>
                  <Badge variant={u.status === "BANNED" ? "flame" : "neutral"}>{u.status}</Badge>
                </td>
                <td className={styles.actions}>
                  {u.status === "BANNED" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setStatus({ id: u.id, status: "ACTIVE" })}
                    >
                      Разбанить
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setStatus({ id: u.id, status: "BANNED" })}
                    >
                      Забанить
                    </Button>
                  )}
                  {canImpersonate && (
                    <Button size="sm" variant="ghost" onClick={() => loginAs(u.id)}>
                      Войти как
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
