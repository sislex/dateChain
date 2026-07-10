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
  }),
});

export const { useRequestOtpMutation, useVerifyOtpMutation } = authApi;
