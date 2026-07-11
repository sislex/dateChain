import { expect, test, type Page } from "@playwright/test";

const AUTH = {
  accessToken: "acc",
  refreshToken: "ref",
  user: { id: "me", role: "USER", phone: "+15550000000" },
};

async function auth(page: Page): Promise<void> {
  await page.addInitScript((a) => {
    localStorage.setItem("datechain.auth", JSON.stringify(a));
  }, AUTH);
  await page.route("**/socket.io/**", (r) => r.abort());
  await page.route("**/api/media/photo/**", (r) =>
    r.fulfill({ status: 200, contentType: "image/jpeg", body: "" }),
  );
}

/** Emits an event onto the app's socket bus, as the socket middleware would. */
async function emitBus(page: Page, event: string, payload: unknown): Promise<void> {
  await page.evaluate(
    ({ event, payload }) => {
      window.dispatchEvent(new CustomEvent("datechain:socket", { detail: { event, payload } }));
    },
    { event, payload },
  );
}

test("matches list shows conversations and opens a chat", async ({ page }) => {
  await auth(page);
  await page.route("**/api/matches/previews", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          matchId: "m1",
          createdAt: new Date().toISOString(),
          partner: { userId: "p1", displayName: "Kate", photoId: null },
          lastMessage: { text: "Привет!", senderId: "p1", createdAt: new Date().toISOString() },
          unreadCount: 1,
        },
      ]),
    }),
  );
  await page.route("**/api/matches/m1/messages**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/matches/m1/messages/read", (r) =>
    r.fulfill({ status: 201, contentType: "application/json", body: '{"updated":0}' }),
  );

  await page.goto("/app/chats");
  await expect(page.getByTestId("matches-page")).toBeVisible();
  await page.getByText("Kate").click();
  await expect(page.getByTestId("chat-page")).toBeVisible();
});

test("sending a message and receiving one in real time", async ({ page }) => {
  await auth(page);
  await page.route("**/api/matches/m1/messages/read", (r) =>
    r.fulfill({ status: 201, contentType: "application/json", body: '{"updated":0}' }),
  );
  await page.route("**/api/matches/m1/messages?**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/matches/m1/messages", (r) => {
    if (r.request().method() === "POST") {
      return r.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "sent1",
          matchId: "m1",
          senderId: "me",
          type: "TEXT",
          text: "Как дела?",
          readAt: null,
          createdAt: new Date().toISOString(),
        }),
      });
    }
    return r.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.goto("/app/chats/m1");
  await expect(page.getByTestId("chat-page")).toBeVisible();

  await page.getByLabel("Сообщение").fill("Как дела?");
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.getByText("Как дела?")).toBeVisible();

  // Incoming message from the partner over the socket bus.
  await emitBus(page, "message:new", {
    id: "in1",
    matchId: "m1",
    senderId: "p1",
    type: "TEXT",
    text: "Отлично!",
    readAt: null,
    createdAt: new Date().toISOString(),
  });
  await expect(page.getByText("Отлично!")).toBeVisible();

  // Partner typing indicator.
  await emitBus(page, "typing", { matchId: "m1", userId: "p1", isTyping: true });
  await expect(page.getByRole("status", { name: "печатает" })).toBeVisible();
});
