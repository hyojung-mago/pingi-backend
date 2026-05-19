/**
 * @file websocket/index.ts - Socket.io WebSocket 서버
 *
 * 실시간 통신을 위한 Socket.io 서버를 초기화하고 이벤트를 처리한다.
 * 방 입장, 핑이타임 알림, 베이스라인 완료, 귀가 체크인 등의 이벤트를 브로드캐스트한다.
 */
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { JwtPayload, WebSocketMessage } from '../types';

let io: Server | null = null;

export function initializeWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
    },
    path: '/v1/ws',
  });

  io.use((socket, next) => {
    const token = socket.handshake.query.token as string;
    const roomCode = socket.handshake.query.room as string;

    if (!token || !roomCode) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      if (payload.roomCode !== roomCode) {
        return next(new Error('Invalid room code'));
      }

      socket.data.user = payload;
      socket.data.roomCode = roomCode;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { roomCode } = socket.data;
    const user = socket.data.user as JwtPayload;

    console.log(`[WS] Member ${user.memberId} connected to room ${roomCode}`);

    // 자동으로 룸 채널에 조인
    socket.join(`room:${roomCode}`);

    // 클라이언트에서 join_room 이벤트를 보낼 때도 처리
    socket.on('join_room', (payload: string | { roomCode?: string }) => {
      const code = typeof payload === 'string' ? payload : payload?.roomCode;
      if (code && code === roomCode) {
        console.log(`[WS] Member ${user.memberId} manually joined room:${roomCode}`);
        socket.join(`room:${code}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Member ${user.memberId} disconnected from room ${roomCode}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export function broadcastToRoom<T>(roomCode: string, event: string, payload: T): void {
  if (!io) {
    console.warn('[WS] Socket.io not initialized, skipping broadcast');
    return;
  }

  console.log(`[WS] Broadcasting ${event} to room:${roomCode}:`, payload);
  
  // payload 직접 전송 (프론트엔드에서 바로 사용)
  io.to(`room:${roomCode}`).emit(event, payload);
}

export function emitMemberJoined(roomCode: string, member: { id: string; nickname: string }): void {
  broadcastToRoom(roomCode, 'member_joined', {
    memberId: member.id,
    nickname: member.nickname,
  });
}

export function emitMemberUpdated(
  roomCode: string,
  member: { id: string; nickname: string; breed?: string; arrived?: boolean; etaPreset?: string }
): void {
  broadcastToRoom(roomCode, 'member_updated', member);
}

export function emitRoomStarted(roomCode: string, startedAt: Date): void {
  broadcastToRoom(roomCode, 'room_started', {
    status: 'live',
    startedAt: startedAt.toISOString(),
  });
}

export function emitAllBaselineComplete(roomCode: string): void {
  broadcastToRoom(roomCode, 'all_baseline_complete', {
    roomCode,
  });
}

export function emitPingiTimeStarted(
  roomCode: string,
  checkpoint: { id: string; index: number; sentence: string }
): void {
  broadcastToRoom(roomCode, 'pingi_time_started', {
    checkpointId: checkpoint.id,
    index: checkpoint.index,
    sentence: checkpoint.sentence,
    countdownSeconds: 5,
  });
}

export function emitCheckpointResult(
  roomCode: string,
  result: {
    checkpointId: string;
    index: number;
    rankings: Array<{
      memberId: string;
      nickname: string;
      breed: string | null;
      level: number;
      previousLevel: number;
      delta: number;
    }>;
    topDrunk: string;
    warnings: Array<{ type: string; memberId: string; message: string }>;
  }
): void {
  broadcastToRoom(roomCode, 'checkpoint_result', result);
}

export function emitRecordingProgress(
  roomCode: string,
  payload: {
    checkpointId: string;
    submittedCount: number;
    totalCount: number;
  }
): void {
  broadcastToRoom(roomCode, 'recording_progress', payload);
}

export function emitResultAckProgress(
  roomCode: string,
  payload: {
    checkpointId: string;
    ackedCount: number;
    totalCount: number;
  }
): void {
  broadcastToRoom(roomCode, 'result_ack_progress', payload);
}

export function emitPingiLiveResumed(
  roomCode: string,
  payload: {
    checkpointId: string;
    nextPingiEndsAt: string;
  }
): void {
  broadcastToRoom(roomCode, 'pingi_live_resumed', payload);
}

export function emitRoomEnded(roomCode: string, reportId: string): void {
  broadcastToRoom(roomCode, 'room_ended', {
    status: 'ended',
    reportId,
  });
}

export function emitHomeCheckinResult(
  roomCode: string,
  member: { id: string; nickname: string },
  arrivedAt: string,
  transcript: string | null
): void {
  broadcastToRoom(roomCode, 'home_checkin_result', {
    memberId: member.id,
    nickname: member.nickname,
    arrivedAt,
    transcript,
  });
}
