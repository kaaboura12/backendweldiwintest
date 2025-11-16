import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../message.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // ✅ Track userId -> Set of socketIds for targeted messaging
  private userSockets = new Map<string, Set<string>>();
  private readonly roomScopedSignals = new Set([
    'call-accepted',
    'call-rejected',
    'call-ended',
    'offer',
    'answer',
    'ice-candidate',
  ]);
  private readonly multiTargetSignals = new Set(['call-request']);
  private readonly dedupSignals = new Set([
    'call-request',
    'call-accepted',
    'call-rejected',
    'call-ended',
    'offer',
    'answer',
  ]);
  private readonly dedupWindowMs = 1_000;
  private recentSignals = new Map<string, number>();

  constructor(
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    // Extract token from handshake auth or query
    const token = client.handshake.auth?.token || client.handshake.query?.token;

    if (token) {
      try {
        const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
        const payload = this.jwtService.verify(token as string, { secret });
        client.data.user = payload;

        // ✅ Track user connection for targeted messaging
        const userId = payload.id || payload.sub || payload.userId;
        if (userId) {
          if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
          }
          this.userSockets.get(userId)!.add(client.id);
          console.log(`✅ User ${userId} connected (socket: ${client.id})`);
        }
      } catch (error) {
        console.warn('WebSocket connection with invalid token');
      }
    }
  }

  handleDisconnect(client: Socket) {
    // ✅ Remove from user-socket mapping
    if (client.data.user) {
      const userId = client.data.user.id || client.data.user.sub || client.data.user.userId;
      if (userId && this.userSockets.has(userId)) {
        this.userSockets.get(userId)!.delete(client.id);
        if (this.userSockets.get(userId)!.size === 0) {
          this.userSockets.delete(userId);
        }
        console.log(`❌ User ${userId} disconnected (socket: ${client.id})`);
      }
    }
  }

  /**
   * Join a room by roomId
   */
  @SubscribeMessage('joinRoom')
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.data.user) {
      return { error: 'Unauthorized' };
    }

    client.join(`room:${data.roomId}`);
    this.server.to(`room:${data.roomId}`).emit('presence', { 
      userId: client.id, 
      state: 'joined', 
      roomId: data.roomId 
    });

    console.log(`👤 User joined room: ${data.roomId}`);
    return { ok: true, roomId: data.roomId };
  }

  /**
   * Leave a room by roomId
   */
  @SubscribeMessage('leaveRoom')
  async onLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.leave(`room:${data.roomId}`);
    this.server.to(`room:${data.roomId}`).emit('presence', { 
      userId: client.id, 
      state: 'left', 
      roomId: data.roomId 
    });

    console.log(`👋 User left room: ${data.roomId}`);
    return { ok: true, roomId: data.roomId };
  }

  /**
   * Send a text message via WebSocket (real-time)
   * Also handles WebRTC signaling (call-request, offer, answer, ice-candidate)
   */
  @SubscribeMessage('sendText')
  async onSendText(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: any,
  ) {
    if (!client.data.user) {
      return { error: 'Unauthorized' };
    }

    try {
      // Check if this is a WebRTC signaling message
      if (body.messageType === 'webrtc_signal') {
        const normalizedSignalType = (body.signalType ?? '').toLowerCase();
        console.log(`🔊 WebRTC signal: ${body.signalType} from ${body.senderId} to ${body.targetId}`);

        if (this.isDuplicateSignal(normalizedSignalType, body)) {
          console.warn(`⚠️ Duplicate WebRTC signal ignored: ${body.signalType} (sender ${body.senderId})`);
          return { ok: true, type: 'webrtc_signal', deduped: true };
        }

        // ✅ FIXED: Send to specific target user, not entire room
        if (body.targetId) {
          const sent = this.sendToUser(body.targetId, 'newMessage', body, {
            roomId: this.roomScopedSignals.has(normalizedSignalType) ? body.roomId : undefined,
            multi: this.multiTargetSignals.has(normalizedSignalType),
          });
          if (sent) {
            console.log(`✅ Sent ${body.signalType} to user ${body.targetId}`);
          } else {
            console.warn(`⚠️ User ${body.targetId} not connected, broadcasting to room`);
            // Fallback: broadcast to room if target not found
            client.to(`room:${body.roomId}`).emit('newMessage', body);
          }
        } else {
          // No targetId, broadcast to room (shouldn't happen for WebRTC)
          console.warn(`⚠️ No targetId for ${body.signalType}, broadcasting to room ${body.roomId}`);
          client.to(`room:${body.roomId}`).emit('newMessage', body);
        }

        return { ok: true, type: 'webrtc_signal' };
      }

      // Regular text message - save to DB and broadcast to room
      const msg = await this.messageService.sendText(body, client.data.user);
      this.server.to(`room:${body.roomId}`).emit('newMessage', msg);

      return msg;
    } catch (error: any) {
      console.error('Error in onSendText:', error);
      return { error: error.message };
    }
  }

  /**
   * Send call signaling (WebRTC offer/answer/ICE)
   */
  @SubscribeMessage('signal')
  async onSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: {
      roomId: string;
      senderModel: 'User' | 'Child';
      senderId: string;
      type: 'CALL_OFFER' | 'CALL_ANSWER' | 'ICE_CANDIDATE';
      payload: Record<string, any>;
    },
  ) {
    if (!client.data.user) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.messageService.sendSignal(
        {
          roomId: body.roomId,
          senderModel: body.senderModel,
          senderId: body.senderId,
          type: body.type,
          payload: body.payload,
        },
        client.data.user,
      );

      // Broadcast to all clients in the room except sender
      client.to(`room:${body.roomId}`).emit('signal', message);

      return { ok: true, message };
    } catch (error: any) {
      console.error('Error in onSignal:', error);
      return { error: error.message };
    }
  }

  /**
   * ✅ Helper: Send message to specific user by userId
   * Supports multiple devices (sends to all user's connected sockets)
   */
  private sendToUser(
    userId: string,
    event: string,
    data: any,
    options?: { roomId?: string; multi?: boolean },
  ): boolean {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      const roomName = options?.roomId ? `room:${options.roomId}` : undefined;
      const multi = options?.multi ?? true;
      const candidates = Array.from(socketIds).reverse();
      let delivered = false;

      for (const socketId of candidates) {
        const socket = this.server.sockets.sockets.get(socketId);

        if (!socket) {
          socketIds.delete(socketId);
          continue;
        }

        if (roomName && !socket.rooms.has(roomName)) {
          continue;
        }

        socket.emit(event, data);
        delivered = true;

        if (!multi) {
          break;
        }
      }

      if (socketIds.size === 0) {
        this.userSockets.delete(userId);
      }

      return delivered;
    }
    return false;
  }

  /**
   * Broadcast a message to a room (can be called from REST API)
   * This ensures messages sent via REST API also appear in real-time
   */
  broadcastMessage(roomId: string, message: any) {
    this.server.to(`room:${roomId}`).emit('newMessage', message);
    console.log(`📨 Broadcasted message to room:${roomId}`);
  }

  /**
   * ✅ Send message to specific user (can be called from REST API)
   * Useful for notifications, SOS alerts, etc.
   */
  sendMessageToUser(
    userId: string,
    event: string,
    data: any,
    options?: { roomId?: string; multi?: boolean },
  ): boolean {
    return this.sendToUser(userId, event, data, options);
  }

  private isDuplicateSignal(signalType: string, body: any): boolean {
    if (!this.dedupSignals.has(signalType)) {
      return false;
    }

    const payloadHash = body.data ? this.hashPayload(body.data) : '';
    const key = `${signalType}|${body.senderId}|${body.targetId}|${body.roomId}|${payloadHash}`;
    const now = Date.now();
    const lastSeen = this.recentSignals.get(key);

    if (lastSeen && now - lastSeen < this.dedupWindowMs) {
      return true;
    }

    this.recentSignals.set(key, now);
    this.cleanupRecentSignals(now);
    return false;
  }

  private hashPayload(payload: any): string {
    try {
      return typeof payload === 'string'
        ? payload.slice(0, 64)
        : JSON.stringify(payload).slice(0, 64);
    } catch {
      return '';
    }
  }

  private cleanupRecentSignals(now: number) {
    for (const [key, timestamp] of this.recentSignals.entries()) {
      if (now - timestamp > this.dedupWindowMs * 2) {
        this.recentSignals.delete(key);
      }
    }
  }

  /**
   * ✅ Get connected users count (for debugging)
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * ✅ Check if user is online (for debugging)
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}