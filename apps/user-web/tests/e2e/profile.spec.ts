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
  bio: "Coffee",
  interests: ["coffee"],
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

async function auth(page: Page): Promise<void> {
  await page.addInitScript((a) => localStorage.setItem("datechain.auth", JSON.stringify(a)), AUTH);
  await page.route("**/socket.io/**", (r) => r.abort());
  await page.route("**/api/media/photo/**", (r) =>
    r.fulfill({ status: 200, contentType: "image/jpeg", body: "" }),
  );
  await page.route("**/api/profile/me/photos", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
}

test("shows completion and saves profile edits", async ({ page }) => {
  await auth(page);
  let putBody: Record<string, unknown> | null = null;
  await page.route("**/api/profile/me", (r) => {
    if (r.request().method() === "PUT") {
      putBody = r.request().postDataJSON();
      return r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...PROFILE, ...putBody }),
      });
    }
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROFILE),
    });
  });

  await page.goto("/app/profile");
  await expect(page.getByTestId("completion")).toContainText("70%");

  await page.getByLabel("Имя").fill("Alexander");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect.poll(() => putBody?.displayName).toBe("Alexander");
});

test("deleting the account logs out and returns to welcome", async ({ page }) => {
  await auth(page);
  await page.route("**/api/profile/me", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROFILE) }),
  );
  await page.route("**/api/auth/account", (r) => r.fulfill({ status: 204, body: "" }));

  await page.goto("/app/profile");
  await page.getByRole("button", { name: "Удалить аккаунт" }).click();
  await expect(page.getByRole("dialog", { name: "Удалить аккаунт?" })).toBeVisible();
  await page.getByRole("button", { name: "Удалить навсегда" }).click();

  await expect(page).toHaveURL(/\/welcome/);
  const stored = await page.evaluate(() => localStorage.getItem("datechain.auth"));
  expect(stored && JSON.parse(stored).accessToken).toBeFalsy();
});
