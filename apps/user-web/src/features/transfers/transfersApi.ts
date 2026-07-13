import { baseApi } from "../../store/baseApi";

export interface TransferView {
  id: string;
  direction: "out" | "in";
  amount: string;
  fee: string;
  net: string;
  counterpart: { userId: string; displayName: string | null };
  createdAt: string;
}

export const transfersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTransferFee: build.query<{ feeBps: number }, void>({
      query: () => "/transfers/fee",
    }),
    sendTransfer: build.mutation<TransferView, { toUserId: string; amount: number }>({
      query: (body) => ({ url: "/transfers", method: "POST", body }),
      invalidatesTags: ["Wallet"],
    }),
  }),
});

export const { useGetTransferFeeQuery, useSendTransferMutation } = transfersApi;
