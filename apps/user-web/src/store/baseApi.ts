import type { FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery, type BaseQueryFn } from "@reduxjs/toolkit/query/react";

import { logout, setTokens, type AuthState } from "./authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.accessToken;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

/**
 * Base query with transparent access-token refresh: on 401 it tries the
 * refresh endpoint once, stores the new pair, and replays the request.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    const refreshToken = (api.getState() as { auth: AuthState }).auth.refreshToken;
    if (refreshToken) {
      const refresh = await rawBaseQuery(
        { url: "/auth/refresh", method: "POST", body: { refreshToken } },
        api,
        extraOptions,
      );
      if (refresh.data) {
        const data = refresh.data as { accessToken: string; refreshToken: string };
        api.dispatch(setTokens(data));
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Profile", "Deck", "Match", "Message", "Notification", "Wallet", "Date"],
  endpoints: () => ({}),
});
