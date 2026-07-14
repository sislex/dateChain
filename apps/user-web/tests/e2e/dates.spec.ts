import { expect, test, type Page } from "@playwright/test";

const AUTH = {
  accessToken: "acc",
  refreshToken: "ref",
  user: { id: "me", role: "USER", phone: "+15550000000" },
};

const WALLET = {
  address: "0xAbb0C7Df926d1DEF0378015126114393Bd725Dfc",
  balance: "980.0",
  balanceRaw: "980000000000000000000",
  symbol: "DATE",
};

function makeDate(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "d1",
    role: "proposer",
    status: "ACCEPTED",
    amount: "40",
    message: null,
    scheduledAt: "2026-07-20T18:00:00.000Z",
    location: "Парк Горького",
    counterpart: { userId: "u2", displayName: "Борис" },
    matchId: null,
    myRating: null,
    claimAvailableAt: null,
    createdAt: "2026-07-14T10:00:00.000Z",
    ...overrides,
  };
}

async function setup(page: Page, dates: Array<Record<string, unknown>>): Promise<void> {
  await page.addInitScript((a) => {
    localStorage.setItem("datechain.auth", JSON.stringify(a));
  }, AUTH);
  // Fallback so unmocked API calls never reach a live backend on :3000.
  await page.route("**/api/**", (r) =>
    r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/socket.io/**", (r) => r.abort());
  await page.route("**/api/notifications**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/wallet", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WALLET) }),
  );
  await page.route("**/api/dates/fee", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: '{"feeBps":2000}' }),
  );
  await page.route("**/api/dates", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(dates) }),
  );
}

test("tabs split dates by role and cards show schedule and place", async ({ page }) => {
  await setup(page, [
    makeDate({ id: "d1", role: "proposer" }),
    makeDate({ id: "d2", role: "invitee", status: "PROPOSED", location: null, scheduledAt: null }),
  ]);
  await page.goto("/app/dates");

  await expect(page.getByRole("tab", { name: "Я предложил (1)" })).toBeVisible();
  await expect(page.getByTestId("date-item")).toHaveCount(1);
  await expect(page.getByTestId("date-schedule")).toContainText("Парк Горького");
  await expect(page.getByTestId("date-schedule")).toContainText("20.07.2026");

  await page.getByRole("tab", { name: "Мне предложили (1)" }).click();
  await expect(page.getByTestId("date-item")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Согласиться" })).toBeVisible();
});

test("confirming a date asks for confirmation with exact amounts", async ({ page }) => {
  await setup(page, [makeDate({ role: "proposer", status: "ACCEPTED" })]);
  let confirmed = false;
  await page.route("**/api/dates/d1/confirm", (r) => {
    confirmed = true;
    return r.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(makeDate({ status: "CONFIRMED" })),
    });
  });

  await page.goto("/app/dates");
  await page.getByRole("button", { name: "✅ Подтвердить: свидание состоялось" }).click();

  await expect(page.getByText("Подтвердить свидание?")).toBeVisible();
  await expect(
    page.getByText("партнёр получит 32 DATE, комиссия сервиса — 8 DATE", { exact: false }),
  ).toBeVisible();
  await page.getByTestId("confirm-action").click();
  await expect.poll(() => confirmed).toBe(true);
});

test("invitee can refuse after accepting; claim appears past the deadline", async ({ page }) => {
  await setup(page, [
    makeDate({
      id: "d1",
      role: "invitee",
      status: "ACCEPTED",
      claimAvailableAt: "2026-07-01T00:00:00.000Z", // already in the past
    }),
  ]);
  let refused = false;
  await page.route("**/api/dates/d1/refuse", (r) => {
    refused = true;
    return r.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(makeDate({ role: "invitee", status: "DECLINED" })),
    });
  });

  await page.goto("/app/dates");
  await page.getByRole("tab", { name: "Мне предложили (1)" }).click();

  await expect(page.getByRole("button", { name: "Забрать выплату" })).toBeVisible();
  await page.getByRole("button", { name: "Отказаться (вернуть всё инициатору)" }).click();
  await expect(page.getByText("Отказаться от свидания?")).toBeVisible();
  await expect(page.getByText("Вся сумма 40 DATE вернётся инициатору", { exact: false })).toBeVisible();
  await page.getByTestId("confirm-action").click();
  await expect.poll(() => refused).toBe(true);
});

test("impersonated session shows the admin banner", async ({ page }) => {
  await page.addInitScript((a) => {
    sessionStorage.setItem("datechain.auth", JSON.stringify({ ...a, impersonated: true }));
  }, AUTH);
  await page.route("**/api/**", (r) =>
    r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/socket.io/**", (r) => r.abort());
  await page.route("**/api/notifications**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/wallet", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WALLET) }),
  );
  await page.route("**/api/dates/fee", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: '{"feeBps":2000}' }),
  );
  await page.route("**/api/dates", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );

  await page.goto("/app/dates");
  await expect(page.getByTestId("impersonation-banner")).toContainText("вы вошли как");
  await expect(page.getByTestId("impersonation-banner")).toContainText("+15550000000");
});
