import { randomUUID } from "node:crypto";
import { unlink, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { encode } from "blurhash";
import { config as loadEnv } from "dotenv";
import sharp from "sharp";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../database/typeorm.config";
import { Photo } from "../profiles/photo.entity";
import { Profile } from "../profiles/profile.entity";

/**
 * Gives every profile real portrait photos so the discovery deck shows faces
 * instead of placeholder gradients. Downloads from pravatar.cc (600×600 real
 * people), processes to full+thumb JPEGs + BlurHash, and replaces existing
 * photo rows/files. Re-runnable.
 *
 * Run: pnpm --filter @datechain/api photos:candidates
 */

const MAX_WIDTH = 1080;
const THUMB_WIDTH = 256;
const PRAVATAR_COUNT = 70; // pravatar.cc serves images 1..70
const PHOTOS_PER_USER = 2;

function baseDir(): string {
  return resolve(process.env.MEDIA_STORAGE_DIR ?? "./uploads");
}

function filePath(storageKey: string, variant: "full" | "thumb"): string {
  const suffix = variant === "thumb" ? "_thumb.jpg" : ".jpg";
  return join(baseDir(), `${storageKey}${suffix}`);
}

async function computeBlurhash(input: Buffer): Promise<string> {
  const { data, info } = await sharp(input)
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
}

async function processAndStore(
  storageKey: string,
  input: Buffer,
): Promise<{ width: number; height: number; blurhash: string }> {
  const fullPath = filePath(storageKey, "full");
  await mkdir(dirname(fullPath), { recursive: true });

  const full = await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(fullPath, full.data);

  const thumb = await sharp(input)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  await writeFile(filePath(storageKey, "thumb"), thumb);

  const blurhash = await computeBlurhash(input);
  return { width: full.info.width, height: full.info.height, blurhash };
}

async function fetchPortrait(imgIndex: number): Promise<Buffer> {
  const url = `https://i.pravatar.cc/600?img=${imgIndex}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
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
  const profileRepo = ds.getRepository(Profile);
  const photoRepo = ds.getRepository(Photo);

  const profiles = await profileRepo.find({ order: { displayName: "ASC" } });
  // eslint-disable-next-line no-console
  console.log(`Setting real photos for ${profiles.length} profiles…`);

  let seq = 0;
  for (const profile of profiles) {
    const userId = profile.userId;

    // Clear existing photos (rows + files).
    const existing = await photoRepo.find({ where: { userId } });
    for (const p of existing) {
      await Promise.allSettled([
        unlink(filePath(p.storageKey, "full")),
        unlink(filePath(p.storageKey, "thumb")),
      ]);
    }
    await photoRepo.delete({ userId });

    // Upload fresh portraits.
    for (let position = 0; position < PHOTOS_PER_USER; position++) {
      const imgIndex = (seq++ % PRAVATAR_COUNT) + 1;
      const buffer = await fetchPortrait(imgIndex);
      const id = randomUUID();
      const storageKey = `${userId}/${id}`;
      const processed = await processAndStore(storageKey, buffer);
      await photoRepo.save(
        photoRepo.create({
          id,
          userId,
          position,
          isMain: position === 0,
          storageKey,
          width: processed.width,
          height: processed.height,
          blurhash: processed.blurhash,
        }),
      );
    }
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${profile.displayName} (${PHOTOS_PER_USER} фото)`);
  }

  await ds.destroy();
  // eslint-disable-next-line no-console
  console.log("Done — все профили получили реальные фото.");
}

void main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  },
);
