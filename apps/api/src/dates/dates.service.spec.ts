import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { parseUnits } from "ethers";

import { NotificationType } from "../notifications/notification.entity";

import { DateStatus, type DateEntity } from "./date.entity";
import { DatesService } from "./dates.service";

const WEEK = 7 * 24 * 3600;

function makeDate(overrides: Partial<DateEntity> = {}): DateEntity {
  return {
    id: "d1",
    proposerId: "anna",
    inviteeId: "boris",
    matchId: "m1",
    amount: "50",
    escrowId: "9",
    status: DateStatus.Proposed,
    message: null,
    scheduledAt: null,
    location: null,
    acceptedAt: null,
    claimNotifiedAt: null,
    reminderSentAt: null,
    proposeTx: "0xprop",
    settleTx: null,
    createdAt: new Date("2026-07-14T10:00:00Z"),
    updatedAt: new Date("2026-07-14T10:00:00Z"),
    ...overrides,
  } as DateEntity;
}

function makeService(date?: DateEntity) {
  const tx = { hash: "0xsettle", wait: jest.fn() };
  const escrowContract = {
    feeBps: jest.fn().mockResolvedValue(2000n),
    claimTimeout: jest.fn().mockResolvedValue(BigInt(WEEK)),
    getAddress: jest.fn().mockResolvedValue("0xEscrow"),
    propose: jest.fn().mockResolvedValue({
      hash: "0xprop",
      wait: jest.fn().mockResolvedValue({ logs: [{}] }),
    }),
    accept: jest.fn().mockResolvedValue(tx),
    decline: jest.fn().mockResolvedValue(tx),
    confirm: jest.fn().mockResolvedValue(tx),
    cancel: jest.fn().mockResolvedValue(tx),
    cancelByPayee: jest.fn().mockResolvedValue(tx),
    claim: jest.fn().mockResolvedValue(tx),
    interface: {
      parseLog: jest.fn().mockReturnValue({ name: "Proposed", args: { id: 9n } }),
    },
  };
  const token = { balanceOf: jest.fn().mockResolvedValue(parseUnits("1000", 18)), approve: jest.fn().mockResolvedValue({ wait: jest.fn() }) };
  const chain = {
    available: true,
    feeBps: 2000,
    escrow: jest.fn(() => escrowContract),
    token: jest.fn(() => token),
    withSigner: jest.fn((_s: unknown, fn: (n: () => number) => Promise<unknown>) => {
      let n = 0;
      return fn(() => n++);
    }),
  };
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const dates = {
    findOne: jest.fn().mockResolvedValue(date ?? null),
    save: jest.fn((d: object) => Promise.resolve(d)),
    create: jest.fn((d: object) => d),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => qb),
  };
  const service = new DatesService(
    dates as never,
    { find: jest.fn().mockResolvedValue([]) } as never, // profiles
    { find: jest.fn().mockResolvedValue([]) } as never, // ratings
    chain as never,
    { signerFor: jest.fn().mockResolvedValue({ address: "0xSig" }), addressOf: jest.fn().mockResolvedValue("0xTo") } as never,
    { createForPair: jest.fn().mockResolvedValue({ id: "m1" }) } as never,
    { create: jest.fn() } as never, // notifications
    { record: jest.fn() } as never, // audit
  );
  const notifications = (service as never as { notifications: { create: jest.Mock } }).notifications;
  return { service, dates, escrowContract, token, qb, notifications };
}

describe("DatesService", () => {
  it("reads the escrow fee from the contract", async () => {
    const { service } = makeService();
    await expect(service.getFee()).resolves.toEqual({ feeBps: 2000 });
  });

  describe("propose", () => {
    it("rejects inviting yourself and a past scheduledAt", async () => {
      const { service } = makeService();
      await expect(service.propose("u1", "u1", 10)).rejects.toThrow(BadRequestException);
      await expect(
        service.propose("u1", "u2", 10, undefined, "2020-01-01T00:00:00Z"),
      ).rejects.toThrow("Дата свидания уже прошла");
    });

    it("rejects when the proposer cannot afford the amount", async () => {
      const { service, token } = makeService();
      token.balanceOf.mockResolvedValue(parseUnits("5", 18));
      await expect(service.propose("u1", "u2", 10)).rejects.toThrow("Insufficient DATE balance");
    });

    it("stores the escrow id, schedule and place, and notifies the invitee", async () => {
      const { service, dates, notifications } = makeService();
      await service.propose("anna", "boris", 50, "Ужин", "2099-01-01T18:00:00Z", " Кафе ");
      expect(dates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          escrowId: "9",
          scheduledAt: new Date("2099-01-01T18:00:00Z"),
          location: "Кафе",
          message: "Ужин",
          proposeTx: "0xprop",
        }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        "boris",
        NotificationType.DateProposed,
        expect.objectContaining({ amount: "50" }),
      );
    });
  });

  describe("accept", () => {
    it("locks funds on-chain, stamps acceptedAt and flips the status", async () => {
      const date = makeDate();
      const { service, escrowContract, dates } = makeService(date);
      await service.accept("d1", "boris");
      expect(escrowContract.accept).toHaveBeenCalledWith("9", expect.anything());
      expect(date.status).toBe(DateStatus.Accepted);
      expect(date.acceptedAt).toBeInstanceOf(Date);
      expect(dates.save).toHaveBeenCalledWith(date);
    });

    it("is invitee-only and only from PROPOSED", async () => {
      const { service } = makeService(makeDate());
      await expect(service.accept("d1", "anna")).rejects.toThrow(ForbiddenException);
      const { service: s2 } = makeService(makeDate({ status: DateStatus.Accepted }));
      await expect(s2.accept("d1", "boris")).rejects.toThrow(ConflictException);
    });
  });

  describe("refuse (invitee backs out after accept)", () => {
    it("cancels on-chain via cancelByPayee and marks the date DECLINED", async () => {
      const date = makeDate({ status: DateStatus.Accepted, acceptedAt: new Date() });
      const { service, escrowContract, notifications } = makeService(date);
      await service.refuse("d1", "boris");
      expect(escrowContract.cancelByPayee).toHaveBeenCalledWith("9", expect.anything());
      expect(date.status).toBe(DateStatus.Declined);
      expect(date.settleTx).toBe("0xsettle");
      expect(notifications.create).toHaveBeenCalledWith(
        "anna",
        NotificationType.DateDeclined,
        expect.anything(),
      );
    });

    it("is rejected for the proposer and outside ACCEPTED", async () => {
      const { service } = makeService(makeDate({ status: DateStatus.Accepted }));
      await expect(service.refuse("d1", "anna")).rejects.toThrow(ForbiddenException);
      const { service: s2 } = makeService(makeDate());
      await expect(s2.refuse("d1", "boris")).rejects.toThrow(ConflictException);
    });
  });

  describe("claim (payout after the confirm timeout)", () => {
    it("confirms the date and pays out via escrow.claim", async () => {
      const date = makeDate({ status: DateStatus.Accepted, acceptedAt: new Date() });
      const { service, escrowContract, notifications } = makeService(date);
      await service.claim("d1", "boris");
      expect(escrowContract.claim).toHaveBeenCalledWith("9", expect.anything());
      expect(date.status).toBe(DateStatus.Confirmed);
      expect(notifications.create).toHaveBeenCalledWith(
        "anna",
        NotificationType.DateConfirmed,
        expect.anything(),
      );
    });

    it("surfaces the on-chain 'too early' revert as a 400", async () => {
      const date = makeDate({ status: DateStatus.Accepted });
      const { service, escrowContract } = makeService(date);
      escrowContract.claim.mockRejectedValue({ reason: "too early" });
      await expect(service.claim("d1", "boris")).rejects.toThrow("too early");
    });
  });

  describe("confirm / cancel (proposer)", () => {
    it("confirm is proposer-only from ACCEPTED and stores the settle tx", async () => {
      const date = makeDate({ status: DateStatus.Accepted });
      const { service } = makeService(date);
      await expect(service.confirm("d1", "boris")).rejects.toThrow(ForbiddenException);
      await service.confirm("d1", "anna");
      expect(date.status).toBe(DateStatus.Confirmed);
      expect(date.settleTx).toBe("0xsettle");
    });

    it("cancel records whether a penalty applied", async () => {
      const date = makeDate({ status: DateStatus.Accepted });
      const { service } = makeService(date);
      const audit = (service as never as { audit: { record: jest.Mock } }).audit;
      await service.cancel("d1", "anna");
      expect(date.status).toBe(DateStatus.Cancelled);
      expect(audit.record).toHaveBeenCalledWith(
        "anna",
        "date.cancel",
        expect.anything(),
        expect.objectContaining({ penalty: true }),
      );
    });
  });

  describe("list", () => {
    it("computes claimAvailableAt = acceptedAt + on-chain timeout for accepted dates", async () => {
      const acceptedAt = new Date("2026-07-14T00:00:00Z");
      const { service, dates } = makeService();
      dates.find.mockResolvedValue([makeDate({ status: DateStatus.Accepted, acceptedAt })]);
      const [view] = await service.list("boris");
      expect(view.role).toBe("invitee");
      expect(view.claimAvailableAt).toEqual(new Date(acceptedAt.getTime() + WEEK * 1000));
    });

    it("leaves claimAvailableAt null for non-accepted dates", async () => {
      const { service, dates } = makeService();
      dates.find.mockResolvedValue([makeDate({ status: DateStatus.Confirmed })]);
      const [view] = await service.list("anna");
      expect(view.claimAvailableAt).toBeNull();
    });
  });

  describe("notification jobs", () => {
    it("notifies the invitee once when the claim deadline has passed", async () => {
      const stale = makeDate({
        status: DateStatus.Accepted,
        acceptedAt: new Date(Date.now() - (WEEK + 60) * 1000),
      });
      const { service, qb, notifications, dates } = makeService();
      qb.getMany.mockResolvedValueOnce([stale]).mockResolvedValueOnce([]);

      await service.runNotificationJobs();
      expect(notifications.create).toHaveBeenCalledWith(
        "boris",
        NotificationType.DateClaimAvailable,
        expect.objectContaining({ dateId: "d1" }),
      );
      expect(stale.claimNotifiedAt).toBeInstanceOf(Date);
      expect(dates.save).toHaveBeenCalledWith(stale);
    });

    it("reminds both participants about an upcoming date", async () => {
      const upcoming = makeDate({
        status: DateStatus.Accepted,
        scheduledAt: new Date(Date.now() + 3600_000),
        location: "Парк",
      });
      const { service, qb, notifications } = makeService();
      qb.getMany.mockResolvedValueOnce([]).mockResolvedValueOnce([upcoming]);

      await service.runNotificationJobs();
      expect(notifications.create).toHaveBeenCalledWith(
        "anna",
        NotificationType.DateReminder,
        expect.objectContaining({ location: "Парк" }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        "boris",
        NotificationType.DateReminder,
        expect.anything(),
      );
      expect(upcoming.reminderSentAt).toBeInstanceOf(Date);
    });

    it("does nothing when the chain is unavailable (claim job) and no rows match", async () => {
      const { service, notifications, qb } = makeService();
      qb.getMany.mockResolvedValue([]);
      await service.runNotificationJobs();
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });
});
