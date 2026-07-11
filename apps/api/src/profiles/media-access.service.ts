import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Block } from "../moderation/block.entity";

import { Photo } from "./photo.entity";
import { Profile } from "./profile.entity";

/**
 * Decides whether a viewer may see another user's photo. Owners always can.
 * Otherwise the viewer must have a profile, the owner must be discoverable, and
 * neither may have blocked the other — this lets discovery/match photos load
 * while keeping profileless or blocked/hidden users' media private.
 */
@Injectable()
export class MediaAccessService {
  constructor(
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    @InjectRepository(Block) private readonly blocks: Repository<Block>,
  ) {}

  async assertCanView(viewerId: string, photo: Photo): Promise<void> {
    if (viewerId === photo.userId) return;

    const [viewerProfile, ownerProfile] = await Promise.all([
      this.profiles.findOne({ where: { userId: viewerId } }),
      this.profiles.findOne({ where: { userId: photo.userId } }),
    ]);
    if (!viewerProfile || !ownerProfile?.discoverable) {
      throw new ForbiddenException("Not allowed to view this photo");
    }

    const block = await this.blocks.findOne({
      where: [
        { blockerId: viewerId, blockedId: photo.userId },
        { blockerId: photo.userId, blockedId: viewerId },
      ],
    });
    if (block) throw new ForbiddenException("Not allowed to view this photo");
  }
}
