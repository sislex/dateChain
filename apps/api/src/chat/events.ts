import type { Message } from "./message.entity";

export const MESSAGE_CREATED = "message.created";
export const MESSAGES_READ = "messages.read";

export interface MessageCreatedEvent {
  matchId: string;
  recipientId: string;
  message: Message;
}

export interface MessagesReadEvent {
  matchId: string;
  readerId: string;
}
