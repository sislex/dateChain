import { baseApi } from "../../store/baseApi";

export interface IncomingLike {
  userId: string;
  displayName: string;
  gender: "MAN" | "WOMAN" | "MORE";
  age: number;
  photoId: string | null;
  superLike: boolean;
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
