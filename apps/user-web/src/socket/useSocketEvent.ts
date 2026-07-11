import { useEffect, useRef } from "react";

import { SOCKET_EVENT, type SocketBusDetail } from "./socketMiddleware";

/** Subscribes to a relayed Socket.IO event on the DOM bus for the component's lifetime. */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<SocketBusDetail>).detail;
      if (detail?.event === event) ref.current(detail.payload as T);
    };
    window.addEventListener(SOCKET_EVENT, listener);
    return () => window.removeEventListener(SOCKET_EVENT, listener);
  }, [event]);
}
