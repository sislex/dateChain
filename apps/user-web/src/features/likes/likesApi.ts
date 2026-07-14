import { baseApi } from "../../store/baseApi";

export interface IncomingLike {
  userId: string;
  displayName: string;
  gender: "MAN" | "WOMAN" | "MORE";
  age: number;
  photoId: string | null;
  superLike: boolean;
  /** Average date rating (1–5, one decimal) or null if not rated yet. */
  rating: number | null;
  ratingCount: number;
}

export const likesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLikes: build.query<IncomingLike[], void>({
      query: () => "/likes",
      providesTags: ["Like"],
    }),
  }),
});

export const { useGetLikesQuery } = likesApi;
