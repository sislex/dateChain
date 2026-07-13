import type { UserRole } from "@datechain/types";

import type { AdminUser } from "../store/authSlice";
import { baseApi } from "../store/baseApi";

export interface AdminMetrics {
  totalUsers: number;
  bannedUsers: number;
  totalMatches: number;
  totalMessages: number;
  totalSwipes: number;
  openReports: number;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
  createdAt: string;
}

export interface ReportRow {
  id: string;
  reporterId: string;
  reportedId: string;
  category: string;
  reason: string | null;
  status: string;
  priority: number;
  createdAt: string;
}

export interface AuditRow {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    adminLogin: build.mutation<
      { user: AdminUser; tokens: { accessToken: string; refreshToken: string } },
      { email: string; password: string; totp?: string }
    >({
      query: (body) => ({ url: "/auth/admin/login", method: "POST", body }),
    }),
    metrics: build.query<AdminMetrics, void>({
      query: () => "/admin/metrics",
      providesTags: ["Metrics"],
    }),
    listUsers: build.query<
      { items: AdminUserRow[]; total: number },
      { q?: string; status?: string }
    >({
      query: ({ q, status }) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (status) params.set("status", status);
        return `/admin/users?${params.toString()}`;
      },
      providesTags: ["Users"],
    }),
    setUserStatus: build.mutation<AdminUserRow, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/admin/users/${id}/status`,
        method: "POST",
        body: { status },
      }),
      invalidatesTags: ["Users", "Metrics"],
    }),
    impersonate: build.mutation<
      {
        user: { id: string; role: UserRole };
        tokens: { accessToken: string; refreshToken: string };
      },
      string
    >({
      query: (id) => ({ url: `/admin/users/${id}/impersonate`, method: "POST" }),
    }),
    reports: build.query<ReportRow[], void>({
      query: () => "/admin/reports",
      providesTags: ["Reports"],
    }),
    resolveReport: build.mutation<ReportRow, { id: string; status: string; ban?: boolean }>({
      query: ({ id, status, ban }) => ({
        url: `/admin/reports/${id}/resolve`,
        method: "POST",
        body: { status, ban },
      }),
      invalidatesTags: ["Reports", "Users"],
    }),
    audit: build.query<AuditRow[], void>({
      query: () => "/admin/audit",
      providesTags: ["Audit"],
    }),
    getServiceWallet: build.query<{ address: string; balance: string; feeBps: number }, void>({
      query: () => "/admin/service-wallet",
      providesTags: ["ServiceWallet"],
    }),
    setServiceWallet: build.mutation<
      { address: string; balance: string; feeBps: number },
      { address: string }
    >({
      query: ({ address }) => ({ url: "/admin/service-wallet", method: "PUT", body: { address } }),
      invalidatesTags: ["ServiceWallet"],
    }),
    getTransferFee: build.query<{ feeBps: number }, void>({
      query: () => "/admin/transfer-fee",
      providesTags: ["TransferFee"],
    }),
    setTransferFee: build.mutation<{ feeBps: number }, { feeBps: number }>({
      query: ({ feeBps }) => ({ url: "/admin/transfer-fee", method: "PUT", body: { feeBps } }),
      invalidatesTags: ["TransferFee"],
    }),
    getSettings: build.query<Array<{ key: string; value: unknown }>, void>({
      query: () => "/admin/settings",
      providesTags: ["Settings"],
    }),
    setSetting: build.mutation<{ key: string; value: unknown }, { key: string; value: unknown }>({
      query: ({ key, value }) => ({
        url: `/admin/settings/${key}`,
        method: "PUT",
        body: { value },
      }),
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const {
  useAdminLoginMutation,
  useMetricsQuery,
  useListUsersQuery,
  useSetUserStatusMutation,
  useImpersonateMutation,
  useReportsQuery,
  useResolveReportMutation,
  useAuditQuery,
  useGetSettingsQuery,
  useSetSettingMutation,
  useGetServiceWalletQuery,
  useSetServiceWalletMutation,
  useGetTransferFeeQuery,
  useSetTransferFeeMutation,
} = adminApi;
