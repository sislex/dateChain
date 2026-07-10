import { BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Match } from "../matching/match.entity";
import { MatchService } from "../matching/match.service";

import { ChatService } from "./chat.service";
import { MESSAGE_CREATED, MESSAGES_READ } from "./events";
import { MessageType } from "./message.entity";

const match: Match = {
  id: "m1",
  userAId: "a",
  userBId: "b",
  unmatchedAt: null,
  unmatchedBy: null,
  createdAt: new Date(),
};

function setup() {
  const saved: unknown[] = [];
  const messages = {
    create: jest.fn((p: object) => ({ id: "msg1", ...p })),
    save: jest.fn((m: object) => {
      saved.push(m);
      return Promise.resolve(m);
    }),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => {
      const qb = {
        update: () => qb,
        set: () => qb,
        where: () => qb,
        andWhere: () => qb,
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      return qb;
    }),
  };
  const matches = {
    findActiveById: jest.fn().mockResolvedValue(match),
  } as unknown as MatchService;
  const events = { emit: jest.fn() } as unknown as EventEmitter2;
  const service = new ChatService(messages as never, matches, events);
  return { service, messages, matches, events };
}

describe("ChatService", () => {
  it("sends a text message and emits MESSAGE_CREATED to the recipient", async () => {
    const { service, events } = setup();
    const msg = await service.sendMessage("a", "m1", { text: "hi" });
    expect(msg.id).toBe("msg1");
    expect(events.emit).toHaveBeenCalledWith(
      MESSAGE_CREATED,
      expect.objectContaining({ matchId: "m1", recipientId: "b" }),
    );
  });

  it("rejects an empty text message", async () => {
    const { service } = setup();
    await expect(service.sendMessage("a", "m1", { text: "  " })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects an image message without a key", async () => {
    const { service } = setup();
    await expect(
      service.sendMessage("a", "m1", { type: MessageType.Image }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("enforces the participant check when listing a thread", async () => {
    const { service, matches } = setup();
    await service.listThread("a", "m1", { limit: 10 });
    expect(matches.findActiveById).toHaveBeenCalledWith("m1", "a");
  });

  it("marks messages read and emits MESSAGES_READ", async () => {
    const { service, events } = setup();
    const updated = await service.markRead("a", "m1");
    expect(updated).toBe(3);
    expect(events.emit).toHaveBeenCalledWith(MESSAGES_READ, { matchId: "m1", readerId: "a" });
  });
});
