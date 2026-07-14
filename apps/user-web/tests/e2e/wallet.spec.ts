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

const HISTORY = [
  {
    id: "topup:0xaaa:0",
    type: "topup",
    direction: "in",
    amount: "100.0",
    fee: "0",
    counterpart: { userId: null, displayName: null },
    status: null,
    txHash: "0xaaa1111122222333334444455555666667777788",
    createdAt: "2026-07-14T12:00:00.000Z",
  },
  {
    id: "date:d1",
    type: "date",
    direction: "out",
    amount: "40",
    fee: "8.0",
    counterpart: { userId: "u2", displayName: "Борис" },
    status: "CONFIRMED",
    txHash: "0xbbb1111122222333334444455555666667777788",
    createdAt: "2026-07-13T10:00:00.000Z",
  },
  {
    id: "date:d2",
    type: "date",
    direction: "out",
    amount: "10.0",
    fee: "10.0",
    counterpart: { userId: "u2", displayName: "Борис" },
    status: "CANCELLED",
    txHash: null,
    createdAt: "2026-07-12T10:00:00.000Z",
  },
  {
    id: "transfer:t1",
    type: "transfer",
    direction: "in",
    amount: "24.5",
    fee: "0.5",
    counterpart: { userId: "u3", displayName: "Вера" },
    status: null,
    txHash: "0xccc1111122222333334444455555666667777788",
    createdAt: "2026-07-11T10:00:00.000Z",
  },
];

async function setup(page: Page): Promise<void> {
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
  await page.route("**/api/wallet/history", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(HISTORY) }),
  );
}

test("wallet history table shows operations with names, fees, kinds and tx hashes", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/app/wallet");

  await expect(page.getByTestId("wallet-balance")).toContainText("980");
  const rows = page.getByTestId("wallet-history-row");
  await expect(rows).toHaveCount(4);

  await expect(rows.nth(0)).toContainText("Пополнение сервисом");
  await expect(rows.nth(0)).toContainText("+100 DATE");
  await expect(rows.nth(1)).toContainText("Свидание с Борис");
  await expect(rows.nth(1)).toContainText("−40 DATE");
  await expect(rows.nth(1)).toContainText("8 DATE");
  await expect(rows.nth(1)).toContainText("0xbbb111");
  await expect(rows.nth(2)).toContainText("Отмена свидания с Борис — штраф");
  await expect(rows.nth(3)).toContainText("Получено от: Вера");
  await expect(rows.nth(3)).toContainText("+24.5 DATE");
});

test("history can be filtered by kind", async ({ page }) => {
  await setup(page);
  await page.goto("/app/wallet");

  await page.getByRole("tab", { name: "Пополнения" }).click();
  await expect(page.getByTestId("wallet-history-row")).toHaveCount(1);
  await expect(page.getByTestId("wallet-history-row")).toContainText("Пополнение");

  await page.getByRole("tab", { name: "Свидания" }).click();
  await expect(page.getByTestId("wallet-history-row")).toHaveCount(2);

  await page.getByRole("tab", { name: "Все" }).click();
  await expect(page.getByTestId("wallet-history-row")).toHaveCount(4);
});

test("top-up modal posts the amount", async ({ page }) => {
  await setup(page);
  let topUpBody: Record<string, unknown> | null = null;
  await page.route("**/api/wallet/topup", (r) => {
    topUpBody = r.request().postDataJSON() as Record<string, unknown>;
    return r.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ...WALLET, balance: "1080.0" }),
    });
  });

  await page.goto("/app/wallet");
  await page.getByRole("button", { name: "➕ Пополнить" }).click();
  await page.getByLabel("Сумма (DATE)").fill("100");
  await page.getByRole("button", { name: "Пополнить", exact: true }).click();

  await expect.poll(() => topUpBody).toEqual({ amount: 100 });
});
