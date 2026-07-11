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

test("admin can ban a user and impersonate is hidden for non-super-admin", async ({ page }) => {
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
  await expect(page.getByTestId("users-page")).toBeVisible();
  await expect(page.getByRole("button", { name: "Войти как" })).toHaveCount(0);

  await page.getByTestId("user-u1").getByRole("button", { name: "Забанить" }).click();
  await expect.poll(() => statusBody?.status).toBe("BANNED");
});

test("super admin sees the impersonate action", async ({ page }) => {
  await mockUsers(page, "SUPER_ADMIN");
  await page.goto("/admin/users");
  await expect(
    page.getByTestId("user-u1").getByRole("button", { name: "Войти как" }),
  ).toBeVisible();
});
