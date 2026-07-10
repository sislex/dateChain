import type { Middleware } from "@reduxjs/toolkit";
import { io, type Socket } from "socket.io-client";

import { logout, setCredentials, setTokens, type AuthState } from "../store/authSlice";

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

/**
 * Keeps a single Socket.IO connection in sync with auth state: connects when a
 * token appears, disconnects on logout, and relays server events to the bus.
 */
export function createSocketMiddleware(): Middleware {
  const connect = (token: string): void => {
    sharedSocket?.disconnect();
    const socket = io({ auth: { token }, transports: ["websocket"], autoConnect: true });
    for (const event of RELAYED) socket.on(event, (payload) => emitToBus(event, payload));
    sharedSocket = socket;
  };

  return (store) => (next) => (action) => {
    const result = next(action);
    if (setCredentials.match(action) || setTokens.match(action)) {
      const token = (store.getState() as { auth: AuthState }).auth.accessToken;
      if (token) connect(token);
    } else if (logout.match(action)) {
      sharedSocket?.disconnect();
      sharedSocket = null;
    }
    return result;
  };
}
