import { baseApi } from "../../store/baseApi";

export type SwipeAction = "NOPE" | "LIKE" | "SUPER_LIKE";

export interface DeckPhoto {
  id: string;
  position: number;
  isMain: boolean;
  blurhash: string;
  width: number;
  height: number;
}

export interface DeckCandidate {
  userId: string;
  displayName: string;
  age: number;
  distanceKm: number;
  bio: string | null;
  interests: string[];
  photos: DeckPhoto[];
}

export interface SwipeResult {
  matched: boolean;
  matchId?: string;
  duplicate?: boolean;
}

export const discoveryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDeck: build.query<DeckCandidate[], number | void>({
      query: (limit) => `/discovery/deck?limit=${limit ?? 20}`,
      providesTags: ["Deck"],
    }),
    swipe: build.mutation<SwipeResult, { targetId: string; action: SwipeAction }>({
      query: (body) => ({ url: "/swipes", method: "POST", body }),
    }),
  }),
});

export const { useGetDeckQuery, useSwipeMutation } = discoveryApi;

/** Media URL for a candidate photo (served by the API with access checks). */
export function photoUrl(photoId: string, variant: "full" | "thumb" = "full"): string {
  return `/api/media/photo/${photoId}${variant === "thumb" ? "/thumb" : ""}`;
}
