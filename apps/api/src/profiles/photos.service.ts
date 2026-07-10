import { randomUUID } from "node:crypto";

import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { MediaService } from "./media.service";
import { Photo } from "./photo.entity";

const MAX_PHOTOS = 9;

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private readonly photos: Repository<Photo>,
    private readonly media: MediaService,
  ) {}

  list(userId: string): Promise<Photo[]> {
    return this.photos.find({ where: { userId }, order: { position: "ASC" } });
  }

  async findOwned(userId: string, photoId: string): Promise<Photo> {
    const photo = await this.photos.findOne({ where: { id: photoId } });
    if (!photo) throw new NotFoundException("Photo not found");
    if (photo.userId !== userId) throw new ForbiddenException("Not your photo");
    return photo;
  }

  async upload(userId: string, buffer: Buffer): Promise<Photo> {
    const existing = await this.photos.count({ where: { userId } });
    if (existing >= MAX_PHOTOS) throw new ForbiddenException(`Max ${MAX_PHOTOS} photos`);

    const id = randomUUID();
    const storageKey = `${userId}/${id}`;
    const processed = await this.media.processAndStore(storageKey, buffer);

    const photo = this.photos.create({
      id,
      userId,
      position: existing,
      isMain: existing === 0,
      storageKey,
      width: processed.width,
      height: processed.height,
      blurhash: processed.blurhash,
    });
    return this.photos.save(photo);
  }

  async remove(userId: string, photoId: string): Promise<void> {
    const photo = await this.findOwned(userId, photoId);
    await this.media.remove(photo.storageKey);
    await this.photos.delete({ id: photo.id });
    await this.normalize(userId);
  }

  /** Reorders the gallery. `order` must be exactly the user's photo ids. */
  async reorder(userId: string, order: string[]): Promise<Photo[]> {
    const current = await this.list(userId);
    const currentIds = new Set(current.map((p) => p.id));
    const sameSet = order.length === current.length && order.every((id) => currentIds.has(id));
    if (!sameSet) throw new ForbiddenException("Order must contain exactly your photos");

    await Promise.all(
      order.map((id, index) =>
        this.photos.update({ id }, { position: index, isMain: index === 0 }),
      ),
    );
    return this.list(userId);
  }

  /** Compacts positions after deletion and guarantees a main photo exists. */
  private async normalize(userId: string): Promise<void> {
    const photos = await this.list(userId);
    await Promise.all(
      photos.map((p, index) =>
        this.photos.update({ id: p.id }, { position: index, isMain: index === 0 }),
      ),
    );
  }
}
