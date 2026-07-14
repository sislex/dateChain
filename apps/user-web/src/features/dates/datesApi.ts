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
  scheduledAt: string | null;
  location: string | null;
  counterpart: { userId: string; displayName: string | null };
  matchId: string | null;
  myRating: number | null;
  /** When the invitee may claim the payout if the proposer stays silent. */
  claimAvailableAt: string | null;
  createdAt: string;
}

export type DateAction = "accept" | "decline" | "confirm" | "cancel" | "refuse" | "claim";

export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface WalletTx {
  hash: string;
  direction: "in" | "out";
  amount: string;
  counterparty: string;
  label: string;
  blockNumber: number;
}

export type WalletHistoryType = "date" | "transfer" | "topup";

export interface WalletHistoryItem {
  id: string;
  type: WalletHistoryType;
  direction: "in" | "out";
  amount: string;
  fee: string;
  counterpart: { userId: string | null; displayName: string | null };
  status: DateStatus | null;
  createdAt: string;
}

export const datesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWallet: build.query<WalletView, void>({
      query: () => "/wallet",
      providesTags: ["Wallet"],
    }),
    getWalletTransactions: build.query<WalletTx[], void>({
      query: () => "/wallet/transactions",
      providesTags: ["Wallet"],
    }),
    getWalletHistory: build.query<WalletHistoryItem[], void>({
      query: () => "/wallet/history",
      providesTags: ["Wallet"],
    }),
    getDates: build.query<DateView[], void>({
      query: () => "/dates",
      providesTags: ["Date"],
    }),
    proposeDate: build.mutation<
      DateView,
      { inviteeId: string; amount: number; message?: string; scheduledAt?: string; location?: string }
    >({
      query: (body) => ({ url: "/dates", method: "POST", body }),
      invalidatesTags: ["Date", "Wallet"],
    }),
    dateAction: build.mutation<DateView, { id: string; action: DateAction }>({
      query: ({ id, action }) => ({ url: `/dates/${id}/${action}`, method: "POST" }),
      invalidatesTags: ["Date", "Wallet"],
    }),
    topUpWallet: build.mutation<WalletView, { amount: number }>({
      query: (body) => ({ url: "/wallet/topup", method: "POST", body }),
      invalidatesTags: ["Wallet"],
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
  useGetWalletTransactionsQuery,
  useGetWalletHistoryQuery,
  useGetDatesQuery,
  useProposeDateMutation,
  useDateActionMutation,
  useTopUpWalletMutation,
  useRateDateMutation,
  useGetUserRatingQuery,
} = datesApi;
