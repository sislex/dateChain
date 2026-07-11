import type { ContactChannel } from "../users/users.service";

/**
 * Canonicalizes a contact identifier so different spellings map to one account.
 * Without this, "79990000101" and "+79990000101" would create two users.
 *
 * - email: trimmed + lowercased.
 * - phone: digits only, then E.164-ish. Russian "8XXXXXXXXXX" → "+7XXXXXXXXXX";
 *   any other digit string gets a leading "+".
 */
export function normalizeContact(channel: ContactChannel, identifier: string): string {
  const value = identifier.trim();
  if (channel === "email") return value.toLowerCase();

  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }
  return `+${digits}`;
}
