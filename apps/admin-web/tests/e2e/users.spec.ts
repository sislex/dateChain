import { expect, test, type Page } from "@playwright/test";

function authAs(role: string) {
  return {
    accessToken: "acc",
    refreshToken: "ref",
    user: { id: "admin1", role },
  };
}

const USERS = {
  items: [
    {
      id: "u1",
      email: "a@dc.io",
      phone: null,
      role: "USER",
      status: "ACTIVE",
      createdAt: "2026-01-01",
    },
    {
      id: "u2",
      email: null,
      phone: "+1555",
      role: "USER",
      status: "BANNED",
      createdAt: "2026-01-02",
    },
  ],
  total: 2,
};

async function mockUsers(page: Page, role: string): Promise<void> {
  await page.addInitScript(
    (a) => localStorage.setItem("datechain.admin.auth", JSON.stringify(a)),
    authAs(role),
  );
  await page.route("**/api/admin/users?**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USERS) }),
  );
}

test("admin can ban a user; impersonate is hidden below ADMIN rank", async ({ page }) => {
  await mockUsers(page, "MODERATOR");
  await page.goto("/admin/users");
  await expect(page.getByTestId("users-page")).toBeVisible();
  await expect(page.getByRole("button", { name: "Войти как" })).toHaveCount(0);
});

test("admin bans a user", async ({ page }) => {
  await mockUsers(page, "ADMIN");
  let statusBody: Record<string, unknown> | null = null;
  await page.route("**/api/admin/users/u1/status", (r) => {
    statusBody = r.request().postDataJSON();
    return r.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ...USERS.items[0], status: "BANNED" }),
    });
  });

  await page.goto("/admin/users");
  await page.getByTestId("user-u1").getByRole("button", { name: "Забанить" }).click();
  await expect.poll(() => statusBody?.status).toBe("BANNED");
});

test("«Войти как» opens user-web with the issued tokens in the hash fragment", async ({
  page,
}) => {
  await mockUsers(page, "ADMIN");
  await page.route("**/api/admin/users/u1/impersonate", (r) =>
    r.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", role: "USER", email: "a@dc.io", phone: null },
        tokens: { accessToken: "user-acc", refreshToken: "user-ref" },
      }),
    }),
  );
  await page.addInitScript(() => {
    (window as unknown as { openedUrls: string[] }).openedUrls = [];
    window.open = ((url: string) => {
      (window as unknown as { openedUrls: string[] }).openedUrls.push(String(url));
      return null;
    }) as typeof window.open;
  });

  await page.goto("/admin/users");
  await page.getByTestId("user-u1").getByRole("button", { name: "Войти как" }).click();

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { openedUrls: string[] }).openedUrls.length))
    .toBe(1);
  const opened = await page.evaluate(
    () => (window as unknown as { openedUrls: string[] }).openedUrls,
  );
  const url = new URL(opened[0]);
  expect(url.pathname).toBe("/impersonate");
  const params = new URLSearchParams(url.hash.slice(1));
  expect(params.get("access")).toBe("user-acc");
  expect(params.get("refresh")).toBe("user-ref");
  expect(params.get("id")).toBe("u1");
  expect(params.get("email")).toBe("a@dc.io");
  // The tokens must travel in the fragment, never in the query string.
  expect(url.search).toBe("");
});
