import { baseApi } from "../../store/baseApi";

export type NotificationType =
  | "MATCH"
  | "MESSAGE"
  | "SUPER_LIKE"
  | "SYSTEM"
  | "DATE_PROPOSED"
  | "DATE_ACCEPTED"
  | "DATE_DECLINED"
  | "DATE_CONFIRMED"
  | "DATE_CANCELLED"
  | "DATE_CLAIM_AVAILABLE"
  | "DATE_REMINDER"
  | "TRANSFER_RECEIVED";

export interface AppNotification {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<AppNotification[], void>({
      query: () => "/notifications",
      providesTags: ["Notification"],
    }),
    markNotificationsRead: build.mutation<{ updated: number }, void>({
      query: () => ({ url: "/notifications/read", method: "POST" }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationsReadMutation } = notificationsApi;
