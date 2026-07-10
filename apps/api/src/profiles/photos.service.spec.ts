import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { MediaService } from "./media.service";
import { Photo } from "./photo.entity";
import { PhotosService } from "./photos.service";

function makeService() {
  const rows: Photo[] = [];
  const repo = {
    find: jest.fn(({ where }: { where: { userId: string } }) =>
      Promise.resolve(
        rows.filter((r) => r.userId === where.userId).sort((a, b) => a.position - b.position),
      ),
    ),
    findOne: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(rows.find((r) => r.id === where.id) ?? null),
    ),
    count: jest.fn(({ where }: { where: { userId: string } }) =>
      Promise.resolve(rows.filter((r) => r.userId === where.userId).length),
    ),
    create: jest.fn((p: Partial<Photo>) => ({ ...p }) as Photo),
    save: jest.fn((p: Photo) => {
      rows.push(p);
      return Promise.resolve(p);
    }),
    update: jest.fn((criteria: { id: string }, patch: Partial<Photo>) => {
      const row = rows.find((r) => r.id === criteria.id);
      if (row) Object.assign(row, patch);
      return Promise.resolve({});
    }),
    delete: jest.fn((criteria: { id: string }) => {
      const i = rows.findIndex((r) => r.id === criteria.id);
      if (i >= 0) rows.splice(i, 1);
      return Promise.resolve({});
    }),
  };
  const media = {
    processAndStore: jest.fn().mockResolvedValue({ width: 800, height: 1000, blurhash: "LKO2" }),
    remove: jest.fn().mockResolvedValue(undefined),
  } as unknown as MediaService;
  const service = new PhotosService(repo as never, media);
  return { service, repo, media, rows };
}

describe("PhotosService", () => {
  it("makes the first uploaded photo main at position 0", async () => {
    const { service } = makeService();
    const first = await service.upload("u1", Buffer.from("a"));
    expect(first.position).toBe(0);
    expect(first.isMain).toBe(true);

    const second = await service.upload("u1", Buffer.from("b"));
    expect(second.position).toBe(1);
    expect(second.isMain).toBe(false);
  });

  it("rejects access to a photo owned by another user", async () => {
    const { service } = makeService();
    const photo = await service.upload("owner", Buffer.from("a"));
    await expect(service.findOwned("intruder", photo.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("throws NotFound for an unknown photo", async () => {
    const { service } = makeService();
    await expect(service.findOwned("u1", "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("reorders and reassigns the main flag to the new first photo", async () => {
    const { service } = makeService();
    const a = await service.upload("u1", Buffer.from("a"));
    const b = await service.upload("u1", Buffer.from("b"));

    const reordered = await service.reorder("u1", [b.id, a.id]);
    expect(reordered[0].id).toBe(b.id);
    expect(reordered[0].isMain).toBe(true);
    expect(reordered[1].isMain).toBe(false);
  });

  it("rejects a reorder whose ids do not match the gallery", async () => {
    const { service } = makeService();
    await service.upload("u1", Buffer.from("a"));
    await expect(service.reorder("u1", ["not-a-real-id"])).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("removes a photo, deletes its files, and compacts positions", async () => {
    const { service, media } = makeService();
    const a = await service.upload("u1", Buffer.from("a"));
    const b = await service.upload("u1", Buffer.from("b"));

    await service.remove("u1", a.id);
    expect(media.remove).toHaveBeenCalledWith(a.storageKey);

    const remaining = await service.list("u1");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
    expect(remaining[0].position).toBe(0);
    expect(remaining[0].isMain).toBe(true);
  });
});
