import { Gender } from "@datechain/types";
import { describe, expect, it } from "vitest";

import { ageOf, profileSchema } from "./schema";

describe("onboarding profile schema", () => {
  const valid = {
    displayName: "Alex",
    birthDate: "1996-04-12",
    gender: Gender.Man,
    interestedIn: [Gender.Woman],
  };

  it("accepts a valid adult profile", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects users under 18", () => {
    const res = profileSchema.safeParse({ ...valid, birthDate: "2020-01-01" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => /18 лет/.test(i.message))).toBe(true);
    }
  });

  it("requires at least one interested-in option", () => {
    expect(profileSchema.safeParse({ ...valid, interestedIn: [] }).success).toBe(false);
  });

  it("ageOf computes whole years", () => {
    expect(ageOf("2000-01-01", new Date("2026-06-01"))).toBe(26);
  });
});
