/**
 * @file services/checkpointService.ts - 체크포인트(핑이타임) 비즈니스 로직
 *
 * 핑이타임 생성, 녹음 제출, 결과 분석 등을 담당한다.
 * 음성 분석 결과를 바탕으로 멤버의 취도 레벨을 업데이트한다.
 */
import { prisma } from '../lib/prisma';
import { generateId, multerFileToPublicRelativePath } from '../utils';
import { AppError } from '../middleware/errorHandler';
import { getRandomSentence, analyzeRecording } from './voiceAnalysisService';
import { updateMemberLevel } from './memberService';
import type { Checkpoint, RecordingResult } from '../types';
import type { Express } from 'express';
import {
  emitCheckpointResult,
  emitPingiLiveResumed,
  emitRecordingProgress,
  emitResultAckProgress,
} from '../websocket';

const MIN_PINGI_INTERVAL_MS = 30 * 1000; // 30 seconds
const PINGI_ROUND_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes (front TEST_INTERVAL_MS)

/** 체크포인트 결과 확인(ack) — 서버 재시작 시 초기화됨 */
const acksByCheckpoint = new Map<string, Set<string>>();

export async function createCheckpoint(roomId: string, _triggeredByMemberId: string): Promise<Checkpoint> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { checkpoints: { orderBy: { index: 'desc' }, take: 1 } },
  });

  if (!room) {
    throw AppError.notFound('방을 찾을 수 없어요');
  }

  if (room.status !== 'live') {
    throw AppError.conflict('진행 중인 술자리에서만 핑이타임을 시작할 수 있어요');
  }

  const lastCheckpoint = room.checkpoints[0];
  if (lastCheckpoint) {
    const timeSinceLastPingi = Date.now() - lastCheckpoint.triggeredAt.getTime();
    if (timeSinceLastPingi < MIN_PINGI_INTERVAL_MS) {
      const remainingSeconds = Math.ceil((MIN_PINGI_INTERVAL_MS - timeSinceLastPingi) / 1000);
      throw AppError.rateLimit(`${remainingSeconds}초 후에 다시 시도해주세요`);
    }
  }

  const nextIndex = (lastCheckpoint?.index ?? 0) + 1;
  const sentence = getRandomSentence();
  const checkpointId = generateId('checkpoint');

  const checkpoint = await prisma.checkpoint.create({
    data: {
      id: checkpointId,
      roomId,
      index: nextIndex,
      sentence,
    },
  });

  return {
    id: checkpoint.id,
    roomId: checkpoint.roomId,
    index: checkpoint.index,
    sentence: checkpoint.sentence,
    triggeredAt: checkpoint.triggeredAt.toISOString(),
    triggerType: checkpoint.triggerType as 'auto' | 'manual',
    status: checkpoint.status as 'pending' | 'completed',
  };
}

export async function uploadRecording(
  checkpointId: string,
  memberId: string,
  file: Express.Multer.File
): Promise<RecordingResult> {
  const diskPath = file.path;
  const publicAudioUrl = multerFileToPublicRelativePath(file);
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
  });

  if (!checkpoint) {
    throw AppError.notFound('핑이타임을 찾을 수 없어요');
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { baseline: true },
  });

  if (!member) {
    throw AppError.notFound('멤버를 찾을 수 없어요');
  }

  if (!member.baseline) {
    throw AppError.badRequest('베이스라인 녹음을 먼저 해주세요');
  }

  const existingRecording = await prisma.recording.findFirst({
    where: {
      checkpointId,
      memberId,
    },
  });

  if (existingRecording) {
    throw AppError.conflict('이미 녹음을 제출했어요');
  }

  const previousLevel = member.currentLevel;
  const recordingId = generateId('recording');

  // Recording을 먼저 생성 (AI 서비스가 결과를 업데이트함)
  await prisma.recording.create({
    data: {
      id: recordingId,
      checkpointId,
      memberId,
      audioUrl: publicAudioUrl,
      score: 0,
      level: 0,
      previousLevel,
      changeRate: 0,
    },
  });

  // AI 서비스 호출 → DB에 score/level/changeRate 업데이트
  const analysis = await analyzeRecording(
    publicAudioUrl,
    member.baseline,
    checkpoint.sentence,
    previousLevel,
    recordingId,
    memberId,
  );

  const delta = analysis.level - previousLevel;

  // AI 서비스 응답으로 Recording 업데이트
  await prisma.recording.update({
    where: { id: recordingId },
    data: {
      score: analysis.score,
      level: analysis.level,
      changeRate: analysis.changeRate,
    },
  });

  await updateMemberLevel(memberId, analysis.level);

  const cpWithRoom = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: { room: { include: { members: true } } },
  });
  if (cpWithRoom) {
    const submittedCount = await prisma.recording.count({ where: { checkpointId } });
    emitRecordingProgress(cpWithRoom.room.code, {
      checkpointId,
      submittedCount,
      totalCount: cpWithRoom.room.members.length,
    });
  }

  await finalizeCheckpointIfQuiet(checkpointId);

  return {
    id: recordingId,
    score: analysis.score,
    level: analysis.level,
    previousLevel,
    delta,
    levelDescription: analysis.levelDescription,
    isFakeActing: analysis.isFakeActing,
    status: analysis.status,
  };
}

/** 방 멤버 수만큼 녹음이 모이면 체크포인트 완료 처리 후 `checkpoint_result` 브로드캐스트 */
async function finalizeCheckpointIfQuiet(checkpointId: string): Promise<void> {
  const cp = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: {
      room: { include: { members: true } },
      recordings: true,
    },
  });

  if (!cp) return;

  const memberCount = cp.room.members.length;
  if (memberCount === 0 || cp.recordings.length < memberCount) {
    return;
  }

  await prisma.checkpoint.update({
    where: { id: checkpointId },
    data: { status: 'completed' },
  });

  const result = await getCheckpointResults(checkpointId);
  emitCheckpointResult(cp.room.code, result);
}

export async function getCheckpoint(checkpointId: string) {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: {
      recordings: {
        include: { member: true },
      },
    },
  });

  if (!checkpoint) {
    throw AppError.notFound('핑이타임을 찾을 수 없어요');
  }

  return checkpoint;
}

export async function getCheckpointsByRoom(roomId: string) {
  return prisma.checkpoint.findMany({
    where: { roomId },
    include: {
      recordings: {
        include: { member: true },
      },
    },
    orderBy: { index: 'asc' },
  });
}

export async function getCheckpointResults(checkpointId: string) {
  const checkpoint = await getCheckpoint(checkpointId);
  
  const rankings = checkpoint.recordings
    .map((r) => {
      const level = r.level ?? 0;
      const prev = r.previousLevel ?? 0;
      return {
        memberId: r.memberId,
        nickname: r.member.nickname,
        breed: r.member.breed,
        level,
        previousLevel: prev,
        delta: level - prev,
      };
    })
    .sort((a, b) => b.level - a.level);

  const topDrunk = rankings[0]?.memberId ?? '';

  const warnings: { type: string; memberId: string; message: string }[] = [];
  
  for (const r of checkpoint.recordings) {
    if (r.member.hungerLevel >= 3 && (r.level ?? 0) >= 3) {
      warnings.push({
        type: 'hunger',
        memberId: r.memberId,
        message: `공복인 ${r.member.nickname}님, 안주를 드세요!`,
      });
    }
  }

  return {
    checkpointId: checkpoint.id,
    index: checkpoint.index,
    rankings,
    topDrunk,
    warnings,
  };
}

export async function acknowledgeCheckpointResult(
  checkpointId: string,
  memberId: string
): Promise<{ ackedCount: number; totalCount: number; allConfirmed: boolean }> {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: { room: { include: { members: true } } },
  });

  if (!checkpoint) {
    throw AppError.notFound('핑이타임을 찾을 수 없어요');
  }

  if (checkpoint.status !== 'completed') {
    throw AppError.conflict('아직 모든 멤버의 녹음이 끝나지 않았어요');
  }

  const isMember = checkpoint.room.members.some((m) => m.id === memberId);
  if (!isMember) {
    throw AppError.forbidden('이 방의 멤버만 확인할 수 있어요');
  }

  if (!acksByCheckpoint.has(checkpointId)) {
    acksByCheckpoint.set(checkpointId, new Set());
  }
  acksByCheckpoint.get(checkpointId)!.add(memberId);

  const totalCount = checkpoint.room.members.length;
  const ackedCount = acksByCheckpoint.get(checkpointId)!.size;

  emitResultAckProgress(checkpoint.room.code, {
    checkpointId,
    ackedCount,
    totalCount,
  });

  const allConfirmed = ackedCount >= totalCount;
  if (allConfirmed) {
    acksByCheckpoint.delete(checkpointId);
    const nextPingiEndsAt = new Date(Date.now() + PINGI_ROUND_INTERVAL_MS);
    emitPingiLiveResumed(checkpoint.room.code, {
      checkpointId,
      nextPingiEndsAt: nextPingiEndsAt.toISOString(),
    });
  }

  return { ackedCount, totalCount, allConfirmed };
}
