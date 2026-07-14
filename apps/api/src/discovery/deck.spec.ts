import { toDeckCandidate, type DeckPhoto, type DeckRow } from "./deck";

const row: DeckRow = {
  userId: "u2",
  displayName: "Kate",
  gender: "WOMAN",
  age: "27.0",
  distance_km: "3.4",
  bio: "hi",
  interests: "coffee,hiking",
  super_liked_you: false,
  rating: null,
  rating_count: null,
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

  it("maps the super-liked-you flag", () => {
    expect(toDeckCandidate(row, []).superLikedYou).toBe(false);
    expect(toDeckCandidate({ ...row, super_liked_you: true }, []).superLikedYou).toBe(true);
  });

  it("rounds the rating to one decimal and defaults the count", () => {
    expect(toDeckCandidate(row, []).rating).toBeNull();
    expect(toDeckCandidate(row, []).ratingCount).toBe(0);
    const rated = toDeckCandidate({ ...row, rating: "4.6667", rating_count: "3" }, []);
    expect(rated.rating).toBe(4.7);
    expect(rated.ratingCount).toBe(3);
  });
});
