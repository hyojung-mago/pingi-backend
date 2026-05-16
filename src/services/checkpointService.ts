/**
 * @file services/checkpointService.ts - 체크포인트(핑이타임) 비즈니스 로직
 *
 * 핑이타임 생성, 녹음 제출, 결과 분석 등을 담당한다.
 * 음성 분석 결과를 바탕으로 멤버의 취도 레벨을 업데이트한다.
 */
import { prisma } from '../lib/prisma';
import { generateId } from '../utils';
import { AppError } from '../middleware/errorHandler';
import { getRandomSentence, analyzeRecording } from './voiceAnalysisService';
import { updateMemberLevel } from './memberService';
import type { Checkpoint, RecordingResult } from '../types';

const MIN_PINGI_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export async function createCheckpoint(roomId: string, hostMemberId: string): Promise<Checkpoint> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { checkpoints: { orderBy: { index: 'desc' }, take: 1 } },
  });

  if (!room) {
    throw AppError.notFound('방');
  }

  if (room.hostMemberId !== hostMemberId) {
    throw AppError.forbidden('방장만 핑이타임을 시작할 수 있어요');
  }

  if (room.status !== 'live') {
    throw AppError.conflict('진행 중인 술자리에서만 핑이타임을 시작할 수 있어요');
  }

  const lastCheckpoint = room.checkpoints[0];
  if (lastCheckpoint) {
    const timeSinceLastPingi = Date.now() - lastCheckpoint.startedAt.getTime();
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
    startedAt: checkpoint.startedAt.toISOString(),
  };
}

export async function uploadRecording(
  checkpointId: string,
  memberId: string,
  audioPath: string
): Promise<RecordingResult> {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
  });

  if (!checkpoint) {
    throw AppError.notFound('핑이타임');
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { baseline: true },
  });

  if (!member) {
    throw AppError.notFound('멤버');
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

  const previousLevel = member.level;
  
  const analysis = await analyzeRecording(
    audioPath,
    member.baseline,
    checkpoint.sentence,
    previousLevel
  );

  const recordingId = generateId('recording');
  const delta = analysis.level - previousLevel;

  await prisma.recording.create({
    data: {
      id: recordingId,
      checkpointId,
      memberId,
      audioUrl: audioPath,
      score: analysis.score,
      level: analysis.level,
      previousLevel,
      delta,
    },
  });

  await updateMemberLevel(memberId, analysis.level);

  return {
    recording: {
      id: recordingId,
      score: analysis.score,
      level: analysis.level,
      previousLevel,
      delta,
    },
  };
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
    throw AppError.notFound('핑이타임');
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
    .map((r) => ({
      memberId: r.memberId,
      nickname: r.member.nickname,
      breed: r.member.breed,
      level: r.level ?? 0,
      previousLevel: r.previousLevel ?? 0,
      delta: r.delta ?? 0,
    }))
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
