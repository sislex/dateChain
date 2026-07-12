export interface DeckPhoto {
  id: string;
  position: number;
  isMain: boolean;
  blurhash: string;
  width: number;
  height: number;
}

export type DeckGender = "MAN" | "WOMAN" | "MORE";

export interface DeckCandidate {
  userId: string;
  displayName: string;
  gender: DeckGender;
  age: number;
  distanceKm: number;
  bio: string | null;
  interests: string[];
  photos: DeckPhoto[];
}

export interface DeckRow {
  userId: string;
  displayName: string;
  gender: DeckGender;
  age: string | number;
  distance_km: string | number;
  bio: string | null;
  interests: string | null;
}

/** Maps a raw discovery SQL row + its photos into a typed candidate card. */
export function toDeckCandidate(row: DeckRow, photos: DeckPhoto[]): DeckCandidate {
  return {
    userId: row.userId,
    displayName: row.displayName,
    gender: row.gender,
    age: Math.trunc(Number(row.age)),
    distanceKm: Math.round(Number(row.distance_km)),
    bio: row.bio,
    interests: row.interests ? row.interests.split(",").filter(Boolean) : [],
    photos: [...photos].sort((a, b) => a.position - b.position),
  };
}
