import { expect, test, type Page } from "@playwright/test";

/** Stubs the auth + profile API and blocks socket.io so the flow runs standalone. */
async function mockApi(page: Page): Promise<void> {
  // Fallback so unmocked API calls never reach a live backend on :3000.
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/auth/otp/request", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sent: true }),
    }),
  );
  await page.route("**/api/auth/otp/verify", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", role: "USER", phone: "+15550001111" },
        tokens: { accessToken: "acc", refreshToken: "ref", expiresIn: 900 },
      }),
    }),
  );
  await page.route("**/api/profile/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ userId: "u1", completion: 60, age: 29 }),
    }),
  );
  // Discovery page loads right after onboarding; return an empty deck.
  await page.route("**/api/discovery/deck**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/profile/me/photos", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
}

test("completes registration from phone to a ready profile", async ({ page }) => {
  await mockApi(page);
  await page.goto("/onboarding");

  // Step 1 — phone
  await page.getByLabel("Телефон").fill("+15550001111");
  await page.getByRole("button", { name: "Получить код" }).click();

  // Step 2 — OTP
  await expect(page.getByTestId("step-otp")).toBeVisible();
  await page.getByLabel("Код").fill("123456");
  await page.getByRole("button", { name: "Подтвердить" }).click();

  // Step 3 — profile
  await expect(page.getByTestId("step-profile")).toBeVisible();
  await page.getByLabel("Имя").fill("Alex");
  await page.getByLabel("Дата рождения").fill("1996-04-12");
  await page.getByRole("button", { name: "Мужчина" }).first().click();
  await page.getByRole("button", { name: "Женщина" }).nth(1).click();
  await page.getByRole("button", { name: "Начать знакомиться" }).click();

  await expect(page).toHaveURL(/\/app\/discovery/);
  await expect(page.getByTestId("deck-empty")).toBeVisible();
});

test("blocks registration for users under 18", async ({ page }) => {
  await mockApi(page);
  await page.goto("/onboarding");
  await page.getByLabel("Телефон").fill("+15550002222");
  await page.getByRole("button", { name: "Получить код" }).click();
  await page.getByLabel("Код").fill("123456");
  await page.getByRole("button", { name: "Подтвердить" }).click();

  await expect(page.getByTestId("step-profile")).toBeVisible();
  await page.getByLabel("Имя").fill("Kid");
  await page.getByLabel("Дата рождения").fill("2020-01-01");
  await page.getByRole("button", { name: "Мужчина" }).first().click();
  await page.getByRole("button", { name: "Женщина" }).nth(1).click();
  await page.getByRole("button", { name: "Начать знакомиться" }).click();

  await expect(page.getByText("Регистрация доступна с 18 лет")).toBeVisible();
  await expect(page).toHaveURL(/\/onboarding/);
});
