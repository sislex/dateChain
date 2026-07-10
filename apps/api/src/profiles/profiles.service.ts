import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ageFromBirthDate, computeCompletion } from "./completion";
import type { UpsertProfileDto } from "./dto";
import { Photo } from "./photo.entity";
import { Profile } from "./profile.entity";

export interface ProfileView extends Profile {
  age: number;
  completion: number;
  photoCount: number;
}

const MIN_AGE = 18;

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
    @InjectRepository(Photo)
    private readonly photos: Repository<Photo>,
  ) {}

  findByUserId(userId: string): Promise<Profile | null> {
    return this.profiles.findOne({ where: { userId } });
  }

  async getView(userId: string): Promise<ProfileView | null> {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;
    const photoCount = await this.photos.count({ where: { userId } });
    return {
      ...profile,
      age: ageFromBirthDate(profile.birthDate),
      completion: computeCompletion(profile, photoCount),
      photoCount,
    };
  }

  async upsert(userId: string, dto: UpsertProfileDto): Promise<ProfileView> {
    if (ageFromBirthDate(dto.birthDate) < MIN_AGE) {
      throw new BadRequestException(`Must be at least ${MIN_AGE} years old`);
    }

    const existing = await this.findByUserId(userId);
    const profile = this.profiles.merge(existing ?? this.profiles.create({ userId }), {
      displayName: dto.displayName,
      birthDate: dto.birthDate,
      gender: dto.gender,
      interestedIn: dto.interestedIn,
      bio: dto.bio ?? null,
      interests: dto.interests ?? [],
      job: dto.job ?? null,
      school: dto.school ?? null,
      heightCm: dto.heightCm ?? null,
      lookingFor: dto.lookingFor ?? null,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      discoverable: dto.discoverable ?? existing?.discoverable ?? true,
    });
    await this.profiles.save(profile);

    // Maintain the PostGIS geography column used by discovery (Phase 3.2).
    if (profile.lat != null && profile.lng != null) {
      await this.profiles.query(
        `UPDATE profiles SET location = ST_SetSRID(ST_MakePoint($1,$2),4326)::geography WHERE "userId" = $3`,
        [profile.lng, profile.lat, userId],
      );
    } else {
      await this.profiles.query(`UPDATE profiles SET location = NULL WHERE "userId" = $1`, [
        userId,
      ]);
    }

    const view = await this.getView(userId);
    if (!view) throw new BadRequestException("Failed to persist profile");
    return view;
  }
}
