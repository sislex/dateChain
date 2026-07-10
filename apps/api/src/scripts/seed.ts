import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { Gender } from "@datechain/types";
import { encode } from "blurhash";
import { config as loadEnv } from "dotenv";
import sharp from "sharp";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../database/typeorm.config";
import { Photo } from "../profiles/photo.entity";
import { Profile } from "../profiles/profile.entity";
import { User, UserStatus } from "../users/user.entity";

export interface SeedOptions {
  count?: number;
  mediaDir?: string;
  centerLat?: number;
  centerLng?: number;
  phonePrefix?: string;
}

const FIRST_NAMES = [
  "Alex",
  "Sam",
  "Kate",
  "Max",
  "Nina",
  "Leo",
  "Mia",
  "Ivan",
  "Olga",
  "Dima",
  "Vera",
  "Igor",
  "Anna",
  "Yuri",
  "Lena",
  "Pavel",
  "Sofia",
  "Tom",
  "Zoe",
  "Nick",
];
const INTERESTS = [
  "coffee",
  "hiking",
  "travel",
  "music",
  "cooking",
  "gaming",
  "yoga",
  "art",
  "cinema",
  "running",
  "photography",
  "books",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T;
}

async function makePhoto(mediaDir: string, storageKey: string, hue: number): Promise<Photo> {
  const r = (hue * 37) % 255;
  const g = (hue * 71) % 255;
  const b = (hue * 113) % 255;
  const base = sharp({ create: { width: 300, height: 400, channels: 3, background: { r, g, b } } });
  const full = await base.clone().jpeg().toBuffer();
  const thumb = await base.clone().resize(256).jpeg().toBuffer();
  const raw = await base
    .clone()
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });

  const fullPath = join(mediaDir, `${storageKey}.jpg`);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, full);
  await writeFile(join(mediaDir, `${storageKey}_thumb.jpg`), thumb);

  const photo = new Photo();
  photo.width = 300;
  photo.height = 400;
  photo.blurhash = encode(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height, 4, 4);
  photo.storageKey = storageKey;
  return photo;
}

/** Populates the database with demo users/profiles/photos for dev, demo and e2e. */
export async function seedDatabase(ds: DataSource, opts: SeedOptions = {}): Promise<number> {
  const count = opts.count ?? 40;
  const mediaDir = resolve(opts.mediaDir ?? process.env.MEDIA_STORAGE_DIR ?? "./uploads");
  const centerLat = opts.centerLat ?? 55.7558;
  const centerLng = opts.centerLng ?? 37.6173;
  const prefix = opts.phonePrefix ?? "+16660";

  const users = ds.getRepository(User);
  const profiles = ds.getRepository(Profile);
  const photos = ds.getRepository(Photo);

  for (let i = 0; i < count; i++) {
    const phone = `${prefix}${String(i).padStart(6, "0")}`;
    if (await users.findOne({ where: { phone } })) continue;

    const user = await users.save(users.create({ phone, status: UserStatus.Active }));

    // Alternate gender and make each interested in the other, so any viewer has candidates.
    const gender = i % 2 === 0 ? Gender.Man : Gender.Woman;
    const interestedIn = i % 2 === 0 ? [Gender.Woman] : [Gender.Man];
    const lat = centerLat + (Math.random() - 0.5) * 0.2; // ~±11 km
    const lng = centerLng + (Math.random() - 0.5) * 0.3;

    const profile = profiles.create({
      userId: user.id,
      displayName: pick(FIRST_NAMES, i),
      birthDate: `${1990 + (i % 12)}-0${(i % 9) + 1}-15`,
      gender,
      interestedIn,
      bio: `Hi, I'm ${pick(FIRST_NAMES, i)}. Into ${pick(INTERESTS, i)} and ${pick(INTERESTS, i + 3)}.`,
      interests: [pick(INTERESTS, i), pick(INTERESTS, i + 3), pick(INTERESTS, i + 7)],
      lat,
      lng,
      discoverable: true,
      radiusKm: 150,
      ageMin: 18,
      ageMax: 60,
    });
    await profiles.save(profile);
    await profiles.query(
      `UPDATE profiles SET location = ST_SetSRID(ST_MakePoint($1,$2),4326)::geography WHERE "userId" = $3`,
      [lng, lat, user.id],
    );

    const photoId = randomUUID();
    const photo = await makePhoto(mediaDir, `${user.id}/${photoId}`, i + 1);
    photo.id = photoId;
    photo.userId = user.id;
    photo.position = 0;
    photo.isMain = true;
    await photos.save(photo);
  }

  return count;
}

async function main(): Promise<void> {
  loadEnv({ path: [".env", "../../.env"] });
  const ds = new DataSource(
    buildDataSourceOptions({
      POSTGRES_HOST: process.env.POSTGRES_HOST ?? "localhost",
      POSTGRES_PORT: Number(process.env.POSTGRES_PORT ?? 5432),
      POSTGRES_USER: process.env.POSTGRES_USER ?? "datechain",
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "datechain",
      POSTGRES_DB: process.env.POSTGRES_DB ?? "datechain",
    }),
  );
  await ds.initialize();
  const count = await seedDatabase(ds, { count: Number(process.env.SEED_COUNT ?? 40) });
  await ds.destroy();
  // eslint-disable-next-line no-console
  console.log(`Seeded ${count} demo profiles.`);
}

if (require.main === module) {
  void main().then(
    () => process.exit(0),
    (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    },
  );
}
