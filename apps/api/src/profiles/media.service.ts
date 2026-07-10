import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { encode } from "blurhash";
import sharp from "sharp";

export interface ProcessedImage {
  width: number;
  height: number;
  blurhash: string;
}

export type MediaVariant = "full" | "thumb";

const MAX_WIDTH = 1080;
const THUMB_WIDTH = 256;

@Injectable()
export class MediaService {
  constructor(private readonly config: ConfigService) {}

  private baseDir(): string {
    return resolve(this.config.get<string>("MEDIA_STORAGE_DIR", "./uploads"));
  }

  filePath(storageKey: string, variant: MediaVariant): string {
    const suffix = variant === "thumb" ? "_thumb.jpg" : ".jpg";
    return join(this.baseDir(), `${storageKey}${suffix}`);
  }

  /** Resizes to full + thumbnail JPEGs on disk and computes a BlurHash. */
  async processAndStore(storageKey: string, input: Buffer): Promise<ProcessedImage> {
    const fullPath = this.filePath(storageKey, "full");
    const thumbPath = this.filePath(storageKey, "thumb");
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
    await writeFile(thumbPath, thumb);

    const blurhash = await this.computeBlurhash(input);
    return { width: full.info.width, height: full.info.height, blurhash };
  }

  private async computeBlurhash(input: Buffer): Promise<string> {
    const { data, info } = await sharp(input)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: "inside" })
      .toBuffer({ resolveWithObject: true });
    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  }

  async remove(storageKey: string): Promise<void> {
    await Promise.allSettled([
      unlink(this.filePath(storageKey, "full")),
      unlink(this.filePath(storageKey, "thumb")),
    ]);
  }
}
