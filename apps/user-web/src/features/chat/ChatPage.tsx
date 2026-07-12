import { Avatar, Button, ChatBubble, Input, Spinner, TypingIndicator } from "@datechain/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getSocket } from "../../socket/socketMiddleware";
import { useSocketEvent } from "../../socket/useSocketEvent";
import { useAppSelector } from "../../store";
import { selectCurrentUser } from "../../store/authSlice";
import { photoUrl } from "../discovery/discoveryApi";

import styles from "./ChatPage.module.css";
import {
  useGetMatchPreviewsQuery,
  useGetMessagesQuery,
  useMarkReadMutation,
  useSendMessageMutation,
  useUnmatchMutation,
  type ChatMessage,
} from "./chatApi";

export function ChatPage() {
  const { matchId = "" } = useParams();
  const navigate = useNavigate();
  const me = useAppSelector(selectCurrentUser);
  const { data: history, isLoading } = useGetMessagesQuery(matchId, { skip: !matchId });
  const { data: previews } = useGetMatchPreviewsQuery();
  const partner = previews?.find((p) => p.matchId === matchId)?.partner;
  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [markRead] = useMarkReadMutation();
  const [unmatch] = useUnmatchMutation();

  async function onUnmatch() {
    await unmatch(matchId).unwrap();
    navigate("/app/chats", { replace: true });
  }

  const [live, setLive] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  // Join the match room for real-time delivery and mark the thread read.
  useEffect(() => {
    if (!matchId) return;
    getSocket()?.emit("match:join", { matchId });
    void markRead(matchId);
  }, [matchId, markRead]);

  useSocketEvent<ChatMessage>("message:new", (msg) => {
    if (msg.matchId === matchId) setLive((prev) => [...prev, msg]);
  });
  useSocketEvent<{ matchId: string; userId: string; isTyping: boolean }>("typing", (p) => {
    if (p.matchId !== matchId || p.userId === me?.id) return;
    setPartnerTyping(p.isTyping);
    if (p.isTyping) {
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPartnerTyping(false), 3000);
    }
  });

  const messages = useMemo(() => {
    const chronological = [...(history ?? [])].reverse();
    const byId = new Map<string, ChatMessage>();
    for (const m of [...chronological, ...live]) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [history, live]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, partnerTyping]);

  async function onSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const saved = await sendMessage({ matchId, text: trimmed }).unwrap();
    setLive((prev) => [...prev, saved]);
  }

  function onType(value: string) {
    setText(value);
    getSocket()?.emit("typing", { matchId, isTyping: value.length > 0 });
  }

  if (isLoading) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="chat-page">
      <header className={styles.header}>
        <div className={styles.partner}>
          <button
            type="button"
            className={styles.back}
            aria-label="Назад"
            onClick={() => navigate("/app/chats")}
          >
            ‹
          </button>
          {partner && (
            <>
              <Avatar
                name={partner.displayName}
                src={partner.photoId ? photoUrl(partner.photoId, "thumb") : undefined}
                size="sm"
              />
              <span className={styles.partnerName}>{partner.displayName}</span>
            </>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onUnmatch}>
          Отмэтчить
        </Button>
      </header>
      <div className={styles.thread}>
        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            text={m.text ?? ""}
            own={m.senderId === me?.id}
            time={new Date(m.createdAt).toLocaleTimeString("ru", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            status={m.senderId === me?.id ? (m.readAt ? "read" : "sent") : undefined}
          />
        ))}
        {partnerTyping && <TypingIndicator />}
        <div ref={endRef} />
      </div>
      <div className={styles.composer}>
        <Input
          aria-label="Сообщение"
          placeholder="Сообщение…"
          value={text}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSend();
          }}
        />
        <Button disabled={sending || !text.trim()} onClick={onSend}>
          Отправить
        </Button>
      </div>
    </div>
  );
}
