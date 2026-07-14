import { expect, test, type Page } from "@playwright/test";

const AUTH = {
  accessToken: "acc",
  refreshToken: "ref",
  user: { id: "me", role: "USER", phone: "+15550000000" },
};

const CANDIDATE = {
  userId: "c1",
  displayName: "Kate",
  age: 27,
  distanceKm: 3,
  bio: "Coffee & hiking",
  interests: ["coffee"],
  photos: [{ id: "p1", position: 0, isMain: true, blurhash: "LKO2", width: 300, height: 400 }],
};

async function authenticate(page: Page): Promise<void> {
  await page.addInitScript((auth) => {
    localStorage.setItem("datechain.auth", JSON.stringify(auth));
  }, AUTH);
  // Fallback so unmocked API calls never reach a live backend on :3000.
  await page.route("**/api/**", (r) =>
    r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/socket.io/**", (r) => r.abort());
  await page.route("**/api/profile/me/photos", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/media/photo/**", (r) =>
    r.fulfill({ status: 200, contentType: "image/jpeg", body: "" }),
  );
}

test("swiping a like that matches shows the match screen", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/discovery/deck**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([CANDIDATE]) }),
  );
  await page.route("**/api/swipes", (r) =>
    r.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ matched: true, matchId: "m1" }),
    }),
  );

  await page.goto("/app/discovery");
  await expect(page.getByRole("button", { name: "Нравится", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Нравится", exact: true }).click();

  await expect(page.getByRole("dialog", { name: "Новый мэтч" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Написать сообщение" })).toBeVisible();
});

test("an empty deck shows the empty state", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/discovery/deck**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );

  await page.goto("/app/discovery");
  await expect(page.getByTestId("deck-empty")).toBeVisible();
  await expect(page.getByText("Пока никого рядом")).toBeVisible();
});
