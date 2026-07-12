import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Photo } from "../profiles/photo.entity";
import { Profile } from "../profiles/profile.entity";

import { toDeckCandidate, type DeckCandidate, type DeckPhoto, type DeckRow } from "./deck";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
    @InjectRepository(Photo)
    private readonly photos: Repository<Photo>,
  ) {}

  /**
   * Builds the candidate deck: mutual gender interest, age range, within the
   * viewer's radius (PostGIS ST_DWithin on the GiST-indexed geography column),
   * excluding self, already-swiped, and blocked (either direction).
   * Ordered by proximity, then recency.
   */
  async getDeck(userId: string, limit = DEFAULT_LIMIT): Promise<DeckCandidate[]> {
    const take = Math.min(Math.max(1, limit), MAX_LIMIT);

    const rows: DeckRow[] = await this.profiles.query(
      `
      SELECT p."userId", p."displayName", p.gender, p.bio, p.interests,
             date_part('year', age(p."birthDate")) AS age,
             ST_Distance(p.location, v.location) / 1000.0 AS distance_km
      FROM profiles p
      CROSS JOIN (
        SELECT location, gender, "interestedIn", "radiusKm", "ageMin", "ageMax"
        FROM profiles WHERE "userId" = $1
      ) v
      WHERE p."userId" <> $1
        AND p.discoverable = true
        AND p.location IS NOT NULL
        AND v.location IS NOT NULL
        AND ST_DWithin(p.location, v.location, v."radiusKm" * 1000)
        AND date_part('year', age(p."birthDate")) BETWEEN v."ageMin" AND v."ageMax"
        AND p.gender::text = ANY (string_to_array(v."interestedIn", ','))
        AND v.gender::text = ANY (string_to_array(p."interestedIn", ','))
        AND NOT EXISTS (
          SELECT 1 FROM swipes s WHERE s."actorId" = $1 AND s."targetId" = p."userId"
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b."blockerId" = $1 AND b."blockedId" = p."userId")
             OR (b."blockerId" = p."userId" AND b."blockedId" = $1)
        )
      ORDER BY distance_km ASC, p."updatedAt" DESC
      LIMIT $2
      `,
      [userId, take],
    );

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.userId);
    const photos = await this.photos.find({ where: ids.map((userId) => ({ userId })) });
    const byUser = new Map<string, DeckPhoto[]>();
    for (const p of photos) {
      const list = byUser.get(p.userId) ?? [];
      list.push({
        id: p.id,
        position: p.position,
        isMain: p.isMain,
        blurhash: p.blurhash,
        width: p.width,
        height: p.height,
      });
      byUser.set(p.userId, list);
    }

    return rows.map((row) => toDeckCandidate(row, byUser.get(row.userId) ?? []));
  }
}
