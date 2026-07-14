import type { Middleware } from "@reduxjs/toolkit";
import { io, type Socket } from "socket.io-client";

import { logout, setCredentials, setTokens, type AuthState } from "../store/authSlice";
import { baseApi } from "../store/baseApi";

/** Broadcast socket events into a DOM CustomEvent bus so feature hooks can subscribe. */
export const SOCKET_EVENT = "datechain:socket";

export interface SocketBusDetail {
  event: string;
  payload: unknown;
}

const RELAYED = ["match:new", "message:new", "messages:read", "typing", "notification:new"];

let sharedSocket: Socket | null = null;

/** Access the live socket for imperative emits (join room, send message, typing). */
export function getSocket(): Socket | null {
  return sharedSocket;
}

function emitToBus(event: string, payload: unknown): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<SocketBusDetail>(SOCKET_EVENT, { detail: { event, payload } }),
    );
  }
}

/** RTK Query cache tags to refresh when a push notification of a given type arrives. */
function tagsFor(type: string): Array<"Date" | "Wallet" | "Match"> {
  if (type.startsWith("DATE_")) return ["Date", "Wallet"];
  if (type === "TRANSFER_RECEIVED") return ["Wallet"];
  // A MESSAGE/MATCH notification reaches the personal room even when the user
  // is not inside the chat — refresh previews (unread badges) from it.
  if (type === "MESSAGE" || type === "MATCH") return ["Match"];
  return [];
}

/**
 * Keeps a single Socket.IO connection in sync with auth state: connects when a
 * token appears, disconnects on logout, and relays server events to the bus.
 */
export function createSocketMiddleware(): Middleware {
  return (store) => {
    const connect = (token: string): void => {
      sharedSocket?.disconnect();
      const socket = io({ auth: { token }, transports: ["websocket"], autoConnect: true });
      for (const event of RELAYED) socket.on(event, (payload) => emitToBus(event, payload));
      // Push-refresh the affected screens (dates list, wallet) without a reload.
      socket.on("notification:new", (payload: { type?: string }) => {
        const tags = tagsFor(payload?.type ?? "");
        if (tags.length > 0) store.dispatch(baseApi.util.invalidateTags(tags));
      });
      // Keep match previews (and the unread-messages badge) current everywhere.
      socket.on("message:new", () => store.dispatch(baseApi.util.invalidateTags(["Match"])));
      socket.on("match:new", () => store.dispatch(baseApi.util.invalidateTags(["Match"])));
      sharedSocket = socket;
    };

    return (next) => (action) => {
      const result = next(action);
      const token = (store.getState() as { auth: AuthState }).auth.accessToken;
      if (setCredentials.match(action) || setTokens.match(action)) {
        if (token) connect(token);
      } else if (logout.match(action)) {
        sharedSocket?.disconnect();
        sharedSocket = null;
      } else if (!sharedSocket && token) {
        // Session restored from storage on page load — no auth action is
        // dispatched, so connect on the first action we see.
        connect(token);
      }
      return result;
    };
  };
}
