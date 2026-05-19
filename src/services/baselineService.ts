/**
 * @file services/baselineService.ts - 베이스라인 녹음 서비스
 *
 * 술자리 시작 전 멤버의 기준 발음(베이스라인)을 저장하고 관리한다.
 * 동일 문장 3회 녹음하여 이후 핑이타임 비교의 기준으로 사용한다.
 */
import { prisma } from '../lib/prisma';
import { generateId } from '../utils';
import { AppError } from '../middleware/errorHandler';
import { analyzeBaseline } from './voiceAnalysisService';
import type { BaselineResult } from '../types';

export interface BaselineUploadData {
  memberId: string;
  audioUrls: [string, string, string];
  sentences: [string, string, string];
}

export async function uploadBaseline(data: BaselineUploadData): Promise<BaselineResult> {
  const member = await prisma.member.findUnique({
    where: { id: data.memberId },
    include: { room: { include: { members: true } } },
  });

  if (!member) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', '멤버를 찾을 수 없어요');
  }

  const existingBaseline = await prisma.baseline.findUnique({
    where: { memberId: data.memberId },
  });

  let baselineId: string;

  if (existingBaseline) {
    await prisma.baseline.update({
      where: { memberId: data.memberId },
      data: {
        audioUrl1: data.audioUrls[0],
        audioUrl2: data.audioUrls[1],
        audioUrl3: data.audioUrls[2],
        sentence1: data.sentences[0],
        sentence2: data.sentences[1],
        sentence3: data.sentences[2],
        recordedAt: new Date(),
      },
    });
    baselineId = existingBaseline.id;
  } else {
    const baseline = await prisma.baseline.create({
      data: {
        id: generateId('baseline'),
        memberId: data.memberId,
        audioUrl1: data.audioUrls[0],
        audioUrl2: data.audioUrls[1],
        audioUrl3: data.audioUrls[2],
        sentence1: data.sentences[0],
        sentence2: data.sentences[1],
        sentence3: data.sentences[2],
      },
    });
    baselineId = baseline.id;
  }

  await prisma.member.update({
    where: { id: data.memberId },
    data: { baselineCompleted: true },
  });

  try {
    await analyzeBaseline(
      [data.audioUrls[0], data.audioUrls[1], data.audioUrls[2]],
      [data.sentences[0], data.sentences[1], data.sentences[2]],
      data.memberId,
    );
  } catch (err) {
    console.warn('[Baseline] AI 분석 건너뜀 (AI 서버 미실행?):', (err as Error).message);
  }

  const updatedRoom = await prisma.room.findUnique({
    where: { id: member.roomId },
    include: { members: true },
  });

  const allCompleted = updatedRoom!.members.every((m) => m.baselineCompleted);

  return {
    baselineId,
    allCompleted,
    roomCode: member.room.code,
  };
}

export async function getBaseline(memberId: string) {
  const baseline = await prisma.baseline.findUnique({
    where: { memberId },
  });

  if (!baseline) {
    throw new AppError(404, 'BASELINE_NOT_FOUND', '베이스라인을 찾을 수 없어요');
  }

  return baseline;
}

export async function markBaselineComplete(memberId: string): Promise<{
  allCompleted: boolean;
  roomCode: string;
}> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { room: { include: { members: true } } },
  });

  if (!member) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', '멤버를 찾을 수 없어요');
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { baselineCompleted: true },
  });

  const updatedRoom = await prisma.room.findUnique({
    where: { id: member.roomId },
    include: { members: true },
  });

  const allCompleted = updatedRoom!.members.every((m) => m.baselineCompleted);

  return {
    allCompleted,
    roomCode: member.room.code,
  };
}
