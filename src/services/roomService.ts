/**
 * @file services/roomService.ts - 방(Room) 비즈니스 로직
 *
 * 방 생성, 조회, 멤버 추가, 시작/종료 등 술자리 방 관련 핵심 로직을 담당한다.
 * Prisma를 통해 DB와 통신하며 RoomResponse 형태로 데이터를 변환한다.
 */
import { prisma } from '../lib/prisma';
import { generateId, generateRoomCode } from '../utils';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import type { RoomResponse, MemberResponse, DrinkType } from '../types';
import { aggregateDrinks } from '../utils';

const MAX_MEMBERS_PER_ROOM = 10;
const MAX_CODE_RETRIES = 5;

function formatMember(member: {
  id: string;
  nickname: string;
  breed: string | null;
  isHost: boolean;
  arrived: boolean;
  etaPreset: string | null;
  hungerLevel: number;
  currentLevel: number;
  drinks: { type: string; delta: number }[];
  homeCheckin: { arrivedAt: Date; transcript: string | null; audioUrl: string | null } | null;
}): MemberResponse {
  const drinks = aggregateDrinks(member.drinks);
  let sojuEquivalent = 0;
  sojuEquivalent += drinks.soju * 1.0;
  sojuEquivalent += drinks.beer * 0.5;
  sojuEquivalent += drinks.somaek * 0.8;
  sojuEquivalent += drinks.wine * 1.2;
  sojuEquivalent += drinks.liquor * 2.0;
  sojuEquivalent = Math.round(sojuEquivalent * 10) / 10;

  return {
    id: member.id,
    nickname: member.nickname,
    breed: member.breed as MemberResponse['breed'],
    isHost: member.isHost,
    arrived: member.arrived,
    etaPreset: member.etaPreset as MemberResponse['etaPreset'],
    hungerLevel: member.hungerLevel,
    level: member.currentLevel,
    drinks,
    sojuEquivalent,
    homeCheckinAt: member.homeCheckin?.arrivedAt?.toISOString() || null,
    homeCheckinTranscript: member.homeCheckin?.transcript || null,
    homeCheckinAudioUrl: member.homeCheckin?.audioUrl || null,
  };
}

function formatRoom(room: {
  id: string;
  code: string;
  location: string;
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  status: string;
  members: {
    id: string;
    nickname: string;
    breed: string | null;
    isHost: boolean;
    arrived: boolean;
    etaPreset: string | null;
    hungerLevel: number;
    currentLevel: number;
    drinks: { type: string; delta: number }[];
    homeCheckin: { arrivedAt: Date; transcript: string | null; audioUrl: string | null } | null;
  }[];
}): RoomResponse {
  return {
    id: room.id,
    code: room.code,
    location: room.location,
    scheduledAt: room.scheduledAt.toISOString(),
    startedAt: room.startedAt?.toISOString() || null,
    endedAt: room.endedAt?.toISOString() || null,
    status: room.status as RoomResponse['status'],
    shareUrl: `${config.frontendUrl}/r/${room.code}`,
    members: room.members.map(formatMember),
  };
}

export async function createRoom(
  hostNickname: string,
  location: string,
  scheduledAt: Date
): Promise<{ room: RoomResponse; hostId: string }> {
  let code = '';
  let attempts = 0;

  while (attempts < MAX_CODE_RETRIES) {
    code = generateRoomCode();
    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
  }

  if (attempts >= MAX_CODE_RETRIES) {
    throw new AppError(500, 'CODE_GENERATION_FAILED', '방 코드 생성에 실패했어요');
  }

  const roomId = generateId('room');
  const hostId = generateId('member');

  const room = await prisma.room.create({
    data: {
      id: roomId,
      code,
      location,
      scheduledAt,
      members: {
        create: {
          id: hostId,
          nickname: hostNickname,
          isHost: true,
        },
      },
    },
    include: {
      members: {
        include: {
          drinks: true,
          homeCheckin: true,
        },
      },
    },
  });

  return {
    room: formatRoom(room),
    hostId,
  };
}

export async function getRoomByCode(code: string): Promise<RoomResponse> {
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      members: {
        include: {
          drinks: true,
          homeCheckin: true,
        },
      },
    },
  });

  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', '방을 찾을 수 없어요');
  }

  return formatRoom(room);
}

export async function addMemberToRoom(
  code: string,
  nickname: string
): Promise<{ room: RoomResponse; memberId: string }> {
  const room = await prisma.room.findUnique({
    where: { code },
    include: { members: true },
  });

  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', '방을 찾을 수 없어요');
  }

  if (room.status !== 'waiting') {
    throw new AppError(400, 'ROOM_ALREADY_STARTED', '이미 시작된 술자리에요');
  }

  if (room.members.length >= MAX_MEMBERS_PER_ROOM) {
    throw new AppError(409, 'ROOM_FULL', '방이 가득 찼어요 (최대 10명)');
  }

  const existingMember = room.members.find((m) => m.nickname === nickname);
  if (existingMember) {
    throw new AppError(409, 'NICKNAME_TAKEN', '이미 사용 중인 닉네임이에요');
  }

  const memberId = generateId('member');

  await prisma.member.create({
    data: {
      id: memberId,
      roomId: room.id,
      nickname,
    },
  });

  const updatedRoom = await prisma.room.findUnique({
    where: { code },
    include: {
      members: {
        include: {
          drinks: true,
          homeCheckin: true,
        },
      },
    },
  });

  return {
    room: formatRoom(updatedRoom!),
    memberId,
  };
}

export async function startRoom(code: string): Promise<RoomResponse> {
  const room = await prisma.room.findUnique({
    where: { code },
  });

  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', '방을 찾을 수 없어요');
  }

  if (room.status !== 'waiting') {
    throw new AppError(400, 'ROOM_ALREADY_STARTED', '이미 시작된 술자리에요');
  }

  const updatedRoom = await prisma.room.update({
    where: { code },
    data: {
      status: 'live',
      startedAt: new Date(),
    },
    include: {
      members: {
        include: {
          drinks: true,
          homeCheckin: true,
        },
      },
    },
  });

  return formatRoom(updatedRoom);
}

export async function endRoom(code: string): Promise<{ room: RoomResponse; reportId: string }> {
  const room = await prisma.room.findUnique({
    where: { code },
  });

  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', '방을 찾을 수 없어요');
  }

  if (room.status === 'ended') {
    throw new AppError(400, 'ROOM_ALREADY_ENDED', '이미 종료된 술자리에요');
  }

  const reportId = generateId('report');

  const updatedRoom = await prisma.room.update({
    where: { code },
    data: {
      status: 'ended',
      endedAt: new Date(),
    },
    include: {
      members: {
        include: {
          drinks: true,
          homeCheckin: true,
        },
      },
    },
  });

  return {
    room: formatRoom(updatedRoom),
    reportId,
  };
}
