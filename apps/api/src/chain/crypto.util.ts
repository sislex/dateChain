import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for custodial private keys. Format: iv:tag:ciphertext
 * (hex). NOTE: custodial key storage is for the LOCAL DEMO only — a real network
 * must use non-custodial wallets or an HSM/KMS.
 */
function keyBytes(hexKey: string): Buffer {
  const key = Buffer.from(hexKey.replace(/^0x/, ""), "hex");
  if (key.length !== 32) throw new Error("WALLET_ENC_KEY must be 32 bytes (64 hex chars)");
  return key;
}

export function encryptSecret(plain: string, hexKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(hexKey), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(payload: string, hexKey: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(hexKey), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString(
    "utf8",
  );
}
