import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type Redis from "ioredis";
import { Server, Socket } from "socket.io";

import { MATCH_CREATED, type MatchCreatedEvent } from "../matching/events";
import { MatchService } from "../matching/match.service";
import {
  NOTIFICATION_CREATED,
  type NotificationCreatedEvent,
} from "../notifications/notification.entity";
import { REDIS_CLIENT } from "../redis/redis.module";

import { ChatService } from "./chat.service";
import {
  MESSAGES_READ,
  MESSAGE_CREATED,
  type MessageCreatedEvent,
  type MessagesReadEvent,
} from "./events";

const ONLINE_SET = "presence:online";

interface Ack {
  ok: boolean;
  error?: string;
}

/**
 * Real-time chat gateway. Socket auth is a JWT in the handshake; each socket
 * joins a personal room (user:<id>) and per-match rooms it is a participant of.
 */
@WebSocketGateway({ cors: { origin: "*" } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly chat: ChatService,
    private readonly matches: MatchService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    try {
      const payload = this.jwt.verify<{ sub: string }>(token ?? "", {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
      client.data.userId = payload.sub;
      await client.join(`user:${payload.sub}`);
      await this.redis.sadd(ONLINE_SET, payload.sub);
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    // Swallow errors: socket.io does not await this hook, and the redis client
    // may already be closing during app shutdown (unhandled-rejection guard).
    try {
      await this.redis.srem(ONLINE_SET, userId);
    } catch {
      /* shutting down */
    }
  }

  @SubscribeMessage("match:join")
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId: string },
  ): Promise<Ack> {
    try {
      await this.matches.findActiveById(body.matchId, client.data.userId);
    } catch {
      return { ok: false, error: "forbidden" };
    }
    await client.join(`match:${body.matchId}`);
    return { ok: true };
  }

  @SubscribeMessage("message:send")
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId: string; text: string },
  ) {
    const message = await this.chat.sendMessage(client.data.userId, body.matchId, {
      text: body.text,
    });
    return { ok: true, message };
  }

  @SubscribeMessage("typing")
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId: string; isTyping: boolean },
  ): Ack {
    client.to(`match:${body.matchId}`).emit("typing", {
      userId: client.data.userId,
      isTyping: body.isTyping,
      matchId: body.matchId,
    });
    return { ok: true };
  }

  @SubscribeMessage("message:read")
  async read(@ConnectedSocket() client: Socket, @MessageBody() body: { matchId: string }) {
    const updated = await this.chat.markRead(client.data.userId, body.matchId);
    return { ok: true, updated };
  }

  @SubscribeMessage("presence:check")
  async presenceCheck(
    @MessageBody() body: { userIds: string[] },
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    for (const id of body.userIds ?? []) {
      result[id] = (await this.redis.sismember(ONLINE_SET, id)) === 1;
    }
    return result;
  }

  @OnEvent(MESSAGE_CREATED)
  broadcastMessage(event: MessageCreatedEvent): void {
    this.server.to(`match:${event.matchId}`).emit("message:new", event.message);
  }

  @OnEvent(MESSAGES_READ)
  broadcastRead(event: MessagesReadEvent): void {
    this.server
      .to(`match:${event.matchId}`)
      .emit("messages:read", { matchId: event.matchId, readerId: event.readerId });
  }

  @OnEvent(MATCH_CREATED)
  broadcastMatch(event: MatchCreatedEvent): void {
    this.server.to(`user:${event.userAId}`).emit("match:new", event);
    this.server.to(`user:${event.userBId}`).emit("match:new", event);
  }

  @OnEvent(NOTIFICATION_CREATED)
  broadcastNotification(event: NotificationCreatedEvent): void {
    this.server.to(`user:${event.userId}`).emit("notification:new", event.notification);
  }
}
