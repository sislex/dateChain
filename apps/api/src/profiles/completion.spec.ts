import { Gender } from "@datechain/types";

import { ageFromBirthDate, computeCompletion } from "./completion";
import type { Profile } from "./profile.entity";

const full: Profile = {
  userId: "u1",
  displayName: "Alex",
  birthDate: "1996-01-01",
  gender: Gender.Man,
  interestedIn: [Gender.Woman],
  bio: "hi",
  interests: ["coffee"],
  job: "dev",
  school: "MSU",
  heightCm: 180,
  lookingFor: "friends",
  lat: 55.75,
  lng: 37.61,
  discoverable: true,
  radiusKm: 80,
  ageMin: 18,
  ageMax: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("computeCompletion", () => {
  it("returns 100 for a fully filled profile with >=2 photos", () => {
    expect(computeCompletion(full, 2)).toBe(100);
  });

  it("is lower when fields and photos are missing", () => {
    const sparse: Profile = {
      ...full,
      bio: null,
      interests: [],
      job: null,
      school: null,
      heightCm: null,
      lat: null,
      lng: null,
    };
    const value = computeCompletion(sparse, 0);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(100);
  });
});

describe("ageFromBirthDate", () => {
  it("computes whole years", () => {
    expect(ageFromBirthDate("2000-01-01", new Date("2026-01-01"))).toBe(26);
  });

  it("accounts for a birthday not yet reached this year", () => {
    expect(ageFromBirthDate("2000-12-31", new Date("2026-06-01"))).toBe(25);
  });
});
