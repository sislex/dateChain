import { baseApi } from "../../store/baseApi";

export interface WalletView {
  address: string;
  balance: string;
  balanceRaw: string;
  symbol: string;
}

export type DateStatus = "PROPOSED" | "ACCEPTED" | "CONFIRMED" | "CANCELLED" | "DECLINED";

export interface DateView {
  id: string;
  role: "proposer" | "invitee";
  status: DateStatus;
  amount: string;
  message: string | null;
  counterpart: { userId: string; displayName: string | null };
  matchId: string | null;
  createdAt: string;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export const datesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWallet: build.query<WalletView, void>({
      query: () => "/wallet",
      providesTags: ["Wallet"],
    }),
    getDates: build.query<DateView[], void>({
      query: () => "/dates",
      providesTags: ["Date"],
    }),
    proposeDate: build.mutation<DateView, { inviteeId: string; amount: number; message?: string }>({
      query: (body) => ({ url: "/dates", method: "POST", body }),
      invalidatesTags: ["Date", "Wallet"],
    }),
    dateAction: build.mutation<DateView, { id: string; action: "accept" | "decline" | "confirm" | "cancel" }>({
      query: ({ id, action }) => ({ url: `/dates/${id}/${action}`, method: "POST" }),
      invalidatesTags: ["Date", "Wallet"],
    }),
    rateDate: build.mutation<unknown, { id: string; score: number; comment?: string }>({
      query: ({ id, score, comment }) => ({
        url: `/dates/${id}/rating`,
        method: "POST",
        body: { score, comment },
      }),
      invalidatesTags: ["Date"],
    }),
    getUserRating: build.query<RatingSummary, string>({
      query: (userId) => `/users/${userId}/rating`,
    }),
  }),
});

export const {
  useGetWalletQuery,
  useGetDatesQuery,
  useProposeDateMutation,
  useDateActionMutation,
  useRateDateMutation,
  useGetUserRatingQuery,
} = datesApi;
