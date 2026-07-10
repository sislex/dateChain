import type { Profile } from "./profile.entity";

/** Fields that contribute to profile completion, each weighted equally. */
const WEIGHTED_FIELDS: Array<(p: Profile) => boolean> = [
  (p) => Boolean(p.displayName),
  (p) => Boolean(p.birthDate),
  (p) => Boolean(p.gender),
  (p) => p.interestedIn?.length > 0,
  (p) => Boolean(p.bio),
  (p) => p.interests?.length > 0,
  (p) => Boolean(p.job),
  (p) => Boolean(p.school),
  (p) => p.heightCm != null,
  (p) => p.lat != null && p.lng != null,
];

/**
 * Profile completion as a 0–100 integer. Photos count as one weighted slot
 * (a profile needs at least 2 photos to feel complete).
 */
export function computeCompletion(profile: Profile, photoCount: number): number {
  const checks = [...WEIGHTED_FIELDS.map((f) => f(profile)), photoCount >= 2];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

/** Age in whole years from an ISO date string. */
export function ageFromBirthDate(birthDate: string, now: Date = new Date()): number {
  const dob = new Date(birthDate);
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}
