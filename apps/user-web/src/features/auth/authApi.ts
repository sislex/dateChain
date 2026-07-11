import type { AuthUser } from "../../store/authSlice";
import { baseApi } from "../../store/baseApi";

export type OtpChannel = "phone" | "email";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: AuthUser;
  tokens: TokenPair;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    requestOtp: build.mutation<{ sent: true }, { channel: OtpChannel; identifier: string }>({
      query: (body) => ({ url: "/auth/otp/request", method: "POST", body }),
    }),
    verifyOtp: build.mutation<
      AuthResult,
      { channel: OtpChannel; identifier: string; code: string }
    >({
      query: (body) => ({ url: "/auth/otp/verify", method: "POST", body }),
    }),
    logoutServer: build.mutation<void, { refreshToken: string }>({
      query: (body) => ({ url: "/auth/logout", method: "POST", body }),
    }),
    deleteAccount: build.mutation<void, void>({
      query: () => ({ url: "/auth/account", method: "DELETE" }),
    }),
  }),
});

export const {
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useLogoutServerMutation,
  useDeleteAccountMutation,
} = authApi;
