import { expect, test, type Page } from "@playwright/test";

async function mock(page: Page): Promise<void> {
  await page.route("**/api/auth/admin/login", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "admin1", role: "ADMIN" },
        tokens: { accessToken: "acc", refreshToken: "ref", expiresIn: 900 },
      }),
    }),
  );
  await page.route("**/api/admin/metrics", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        totalUsers: 42,
        bannedUsers: 1,
        totalMatches: 10,
        totalMessages: 55,
        totalSwipes: 200,
        openReports: 3,
      }),
    }),
  );
}

test("admin logs in with 2FA and lands on the dashboard", async ({ page }) => {
  await mock(page);
  await page.goto("/login");
  await expect(page.getByTestId("admin-login")).toBeVisible();

  await page.getByLabel("Email").fill("admin@dc.io");
  await page.getByLabel("Пароль").fill("secret");
  await page.getByLabel("Код 2FA (если включён)").fill("123456");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
  await expect(page.getByTestId("metric-totalUsers")).toContainText("42");
});

test("unauthenticated access to /admin redirects to /login", async ({ page }) => {
  await mock(page);
  await page.goto("/admin/audit");
  await expect(page).toHaveURL(/\/login/);
});
