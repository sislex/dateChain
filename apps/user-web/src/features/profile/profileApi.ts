import type { Gender } from "@datechain/types";

import { baseApi } from "../../store/baseApi";

export interface ProfileView {
  userId: string;
  displayName: string;
  birthDate: string;
  gender: Gender;
  interestedIn: Gender[];
  bio: string | null;
  interests: string[];
  job: string | null;
  school: string | null;
  heightCm: number | null;
  lat: number | null;
  lng: number | null;
  discoverable: boolean;
  radiusKm: number;
  ageMin: number;
  ageMax: number;
  age: number;
  completion: number;
  photoCount: number;
}

export interface UpsertProfileInput {
  displayName: string;
  birthDate: string;
  gender: Gender;
  interestedIn: Gender[];
  bio?: string;
  interests?: string[];
  lat?: number;
  lng?: number;
  radiusKm?: number;
  ageMin?: number;
  ageMax?: number;
  discoverable?: boolean;
}

export interface PhotoView {
  id: string;
  position: number;
  isMain: boolean;
  blurhash: string;
  width: number;
  height: number;
}

export const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyProfile: build.query<ProfileView, void>({
      query: () => "/profile/me",
      providesTags: ["Profile"],
    }),
    upsertProfile: build.mutation<ProfileView, UpsertProfileInput>({
      query: (body) => ({ url: "/profile/me", method: "PUT", body }),
      // Profile edits (incl. discovery filters) must refresh the deck too.
      invalidatesTags: ["Profile", "Deck"],
    }),
    listPhotos: build.query<PhotoView[], void>({
      query: () => "/profile/me/photos",
      providesTags: ["Profile"],
    }),
    uploadPhoto: build.mutation<PhotoView, FormData>({
      query: (body) => ({ url: "/profile/me/photos", method: "POST", body }),
      invalidatesTags: ["Profile"],
    }),
    deletePhoto: build.mutation<{ deleted: true }, string>({
      query: (photoId) => ({ url: `/profile/me/photos/${photoId}`, method: "DELETE" }),
      invalidatesTags: ["Profile"],
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useUpsertProfileMutation,
  useListPhotosQuery,
  useUploadPhotoMutation,
  useDeletePhotoMutation,
} = profileApi;
