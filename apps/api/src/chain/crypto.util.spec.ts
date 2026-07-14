import { decryptSecret, encryptSecret } from "./crypto.util";

const KEY = "0x" + "ab".repeat(32);

describe("crypto.util", () => {
  it("round-trips a private key", () => {
    const secret = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const enc = encryptSecret(secret, KEY);
    expect(enc).not.toContain(secret.slice(4));
    expect(decryptSecret(enc, KEY)).toBe(secret);
  });

  it("produces a fresh ciphertext per call (random IV)", () => {
    expect(encryptSecret("same", KEY)).not.toBe(encryptSecret("same", KEY));
  });

  it("rejects a wrong-size key", () => {
    expect(() => encryptSecret("x", "0x1234")).toThrow("WALLET_ENC_KEY");
  });

  it("rejects a malformed payload and a tampered ciphertext", () => {
    expect(() => decryptSecret("not-a-payload", KEY)).toThrow("Malformed");
    const enc = encryptSecret("secret", KEY);
    const [iv, tag, data] = enc.split(":");
    const flipped = data.replace(/^../, data.startsWith("00") ? "11" : "00");
    expect(() => decryptSecret(`${iv}:${tag}:${flipped}`, KEY)).toThrow();
  });

  it("rejects decryption with a different key", () => {
    const enc = encryptSecret("secret", KEY);
    expect(() => decryptSecret(enc, "0x" + "cd".repeat(32))).toThrow();
  });
});
