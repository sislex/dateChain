import { expect, test, type Page } from "@playwright/test";

const ADMIN = { accessToken: "acc", refreshToken: "ref", user: { id: "admin1", role: "ADMIN" } };

const REPORT = {
  id: "r1",
  reporterId: "u2",
  reportedId: "u3",
  category: "ABUSE",
  reason: "spam",
  status: "OPEN",
  priority: 3,
  createdAt: "2026-01-01",
};

async function setup(page: Page): Promise<void> {
  await page.addInitScript(
    (a) => localStorage.setItem("datechain.admin.auth", JSON.stringify(a)),
    ADMIN,
  );
  await page.route("**/api/admin/reports", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([REPORT]) }),
  );
  await page.route("**/api/admin/settings", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
}

test("resolving a report with ban sends the decision", async ({ page }) => {
  await setup(page);
  let body: Record<string, unknown> | null = null;
  await page.route("**/api/admin/reports/r1/resolve", (r) => {
    body = r.request().postDataJSON();
    return r.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ...REPORT, status: "RESOLVED" }),
    });
  });

  await page.goto("/admin/moderation");
  await expect(page.getByTestId("moderation-page")).toBeVisible();
  await page.getByTestId("report-r1").getByText("бан").click();
  await page.getByTestId("report-r1").getByRole("button", { name: "Решить" }).click();

  await expect.poll(() => body?.status).toBe("RESOLVED");
  expect(body!.ban).toBe(true);
});

test("admin can update a runtime setting", async ({ page }) => {
  await setup(page);
  let putBody: Record<string, unknown> | null = null;
  await page.route("**/api/admin/settings/dailyLikeLimit", (r) => {
    putBody = r.request().postDataJSON();
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ key: "dailyLikeLimit", value: 250 }),
    });
  });

  await page.goto("/admin/moderation");
  await expect(page.getByTestId("settings-section")).toBeVisible();
  await page.getByLabel("Значение").fill("250");
  await page.getByTestId("settings-section").getByRole("button", { name: "Сохранить" }).click();

  await expect.poll(() => putBody?.value).toBe(250);
});
