import { baseApi } from "../../store/baseApi";

export interface MatchPreview {
  matchId: string;
  createdAt: string;
  partner: { userId: string; displayName: string; photoId: string | null };
  lastMessage: { text: string | null; senderId: string; createdAt: string } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  type: "TEXT" | "IMAGE";
  text: string | null;
  readAt: string | null;
  createdAt: string;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMatchPreviews: build.query<MatchPreview[], void>({
      query: () => "/matches/previews",
      providesTags: ["Match"],
    }),
    getMessages: build.query<ChatMessage[], string>({
      query: (matchId) => `/matches/${matchId}/messages?limit=50`,
      providesTags: (_r, _e, matchId) => [{ type: "Message", id: matchId }],
    }),
    sendMessage: build.mutation<ChatMessage, { matchId: string; text: string }>({
      query: ({ matchId, text }) => ({
        url: `/matches/${matchId}/messages`,
        method: "POST",
        body: { text },
      }),
    }),
    markRead: build.mutation<{ updated: number }, string>({
      query: (matchId) => ({ url: `/matches/${matchId}/messages/read`, method: "POST" }),
      invalidatesTags: ["Match"],
    }),
    unmatch: build.mutation<{ unmatched: true }, string>({
      query: (matchId) => ({ url: `/matches/${matchId}`, method: "DELETE" }),
      invalidatesTags: ["Match"],
    }),
  }),
});

export const {
  useGetMatchPreviewsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkReadMutation,
  useUnmatchMutation,
} = chatApi;
