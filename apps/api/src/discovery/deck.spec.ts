import { toDeckCandidate, type DeckPhoto, type DeckRow } from "./deck";

const row: DeckRow = {
  userId: "u2",
  displayName: "Kate",
  age: "27.0",
  distance_km: "3.4",
  bio: "hi",
  interests: "coffee,hiking",
};

describe("toDeckCandidate", () => {
  it("truncates age, rounds distance, and splits interests", () => {
    const c = toDeckCandidate(row, []);
    expect(c.age).toBe(27);
    expect(c.distanceKm).toBe(3);
    expect(c.interests).toEqual(["coffee", "hiking"]);
  });

  it("sorts photos by position", () => {
    const photos: DeckPhoto[] = [
      { id: "b", position: 1, isMain: false, blurhash: "x", width: 1, height: 1 },
      { id: "a", position: 0, isMain: true, blurhash: "y", width: 1, height: 1 },
    ];
    const c = toDeckCandidate(row, photos);
    expect(c.photos.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("handles empty interests", () => {
    expect(toDeckCandidate({ ...row, interests: "" }, []).interests).toEqual([]);
    expect(toDeckCandidate({ ...row, interests: null }, []).interests).toEqual([]);
  });
});
