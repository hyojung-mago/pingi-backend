/**
 * @file controllers/roomController.ts - 방(Room) 관련 API 컨트롤러
 *
 * 방 생성, 조회, 입장, 시작, 종료, 핑이타임 트리거, 리포트 조회 등
 * 술자리 방과 관련된 모든 HTTP 요청을 처리한다.
 */
import type { Request, Response, NextFunction } from 'express';
import * as roomService from '../services/roomService';
import * as checkpointService from '../services/checkpointService';
import * as reportService from '../services/reportService';
import { generateToken } from '../middleware/auth';
import type { CreateRoomRequest, JoinRoomRequest } from '../types';
import { emitMemberJoined, emitRoomStarted, emitPingiTimeStarted, emitRoomEnded } from '../websocket';

export async function createRoom(
  req: Request<object, object, CreateRoomRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { hostNickname, location, scheduledAt } = req.body;
    
    const { room, hostId } = await roomService.createRoom(
      hostNickname,
      location,
      new Date(scheduledAt)
    );

    const token = generateToken({
      memberId: hostId,
      roomId: room.id,
      roomCode: room.code,
      isHost: true,
    });

    res.status(201).json({
      room,
      host: {
        id: hostId,
        nickname: hostNickname,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getRoom(
  req: Request<{ code: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const room = await roomService.getRoomByCode(code);
    res.json(room);
  } catch (error) {
    next(error);
  }
}

export async function joinRoom(
  req: Request<{ code: string }, object, JoinRoomRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const { nickname } = req.body;

    const { member, room } = await roomService.addMember(code, nickname);

    const token = generateToken({
      memberId: member.id,
      roomId: room.id,
      roomCode: code,
      isHost: false,
    });

    // WebSocket: 멤버 입장 알림
    emitMemberJoined(code, { id: member.id, nickname: member.nickname });

    res.status(201).json({
      member: {
        id: member.id,
        nickname: member.nickname,
        token,
      },
      room,
    });
  } catch (error) {
    next(error);
  }
}

export async function startRoom(
  req: Request<{ code: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const memberId = req.user!.memberId;

    const result = await roomService.startRoom(code, memberId);
    
    // WebSocket: 방 시작 알림 (모든 멤버가 Live로 이동)
    emitRoomStarted(code, new Date(result.startedAt));

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function endRoom(
  req: Request<{ code: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const memberId = req.user!.memberId;

    const result = await roomService.endRoom(code, memberId);
    
    const room = await roomService.getRoomByCode(code);
    await reportService.generateReport(room.id);

    // WebSocket: 방 종료 알림 (모든 멤버가 시상식으로 이동)
    emitRoomEnded(code, result.reportId);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function triggerPingiTime(
  req: Request<{ code: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const memberId = req.user!.memberId;

    const room = await roomService.getRoomByCode(code);
    const checkpoint = await checkpointService.createCheckpoint(room.id, memberId);

    // WebSocket: 핑이타임 시작 알림 (모든 멤버가 녹음 화면으로 이동)
    emitPingiTimeStarted(code, {
      id: checkpoint.id,
      index: checkpoint.index,
      sentence: checkpoint.sentence,
    });

    res.status(201).json(checkpoint);
  } catch (error) {
    next(error);
  }
}

export async function getReport(
  req: Request<{ code: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const report = await reportService.getReport(code);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

export async function getShareCard(
  req: Request<{ code: string }, object, object, { aspect?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const aspect = req.query.aspect || '9:16';
    const data = await reportService.getShareCardData(code, aspect);
    res.json(data);
  } catch (error) {
    next(error);
  }
}
