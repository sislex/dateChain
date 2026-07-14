import { expect, test, type Page } from "@playwright/test";

const AUTH = {
  accessToken: "acc",
  refreshToken: "ref",
  user: { id: "me", role: "USER", phone: "+15550000000" },
};

const PROFILE = {
  userId: "me",
  displayName: "Alex",
  birthDate: "1996-04-12",
  gender: "MAN",
  interestedIn: ["WOMAN"],
  bio: null,
  interests: [],
  job: null,
  school: null,
  heightCm: null,
  lat: 55.75,
  lng: 37.61,
  discoverable: true,
  radiusKm: 80,
  ageMin: 18,
  ageMax: 60,
  age: 29,
  completion: 70,
  photoCount: 1,
};

test("editing discovery filters saves new values and returns to the deck", async ({ page }) => {
  await page.addInitScript((auth) => {
    localStorage.setItem("datechain.auth", JSON.stringify(auth));
  }, AUTH);
  // Fallback so unmocked API calls never reach a live backend on :3000.
  await page.route("**/api/**", (r) =>
    r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/socket.io/**", (r) => r.abort());

  let putBody: Record<string, unknown> | null = null;
  await page.route("**/api/profile/me", (route) => {
    if (route.request().method() === "PUT") {
      putBody = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...PROFILE, ...putBody }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROFILE),
    });
  });
  // Deck reloaded after settings change.
  await page.route("**/api/discovery/deck**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );

  await page.goto("/app/discovery/settings");
  await expect(page.getByTestId("discovery-settings")).toBeVisible();

  await page.getByLabel("Расстояние").fill("150");
  // The switch input is visually hidden; toggling via its label is what a user does.
  await page.getByText("Показывать меня в Discovery").click();
  await expect(page.getByRole("switch")).not.toBeChecked();
  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(page).toHaveURL(/\/app\/discovery$/);
  expect(putBody).not.toBeNull();
  expect(putBody!.radiusKm).toBe(150);
  expect(putBody!.discoverable).toBe(false);
});
