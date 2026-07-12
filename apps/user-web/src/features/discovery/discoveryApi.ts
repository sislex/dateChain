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
  gender: "MAN" | "WOMAN" | "MORE";
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

/** Current access token, read from the persisted auth state (mirrors the store). */
function currentAccessToken(): string | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("datechain.auth") : null;
    return raw ? (JSON.parse(raw) as { accessToken: string | null }).accessToken : null;
  } catch {
    return null;
  }
}

/**
 * Media URL for a photo (served by the API with access checks). The access
 * token is passed as a query param because <img> tags cannot set an
 * Authorization header; the JWT strategy accepts `access_token` as a fallback.
 */
export function photoUrl(photoId: string, variant: "full" | "thumb" = "full"): string {
  const path = `/api/media/photo/${photoId}${variant === "thumb" ? "/thumb" : ""}`;
  const token = currentAccessToken();
  return token ? `${path}?access_token=${encodeURIComponent(token)}` : path;
}
