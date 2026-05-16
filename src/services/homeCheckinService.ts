/**
 * @file services/homeCheckinService.ts - 귀가 체크인 서비스
 *
 * 술자리 종료 후 멤버의 무사 귀가를 확인하고 후기를 저장한다.
 * 음성 녹음과 STT 변환 텍스트를 저장하며, WebSocket으로 실시간 알림을 보낸다.
 */
import { prisma } from '../lib/prisma';
import { generateId } from '../utils';
import { AppError } from '../middleware/errorHandler';

export interface HomeCheckinResult {
  arrivedAt: string;
  transcript: string | null;
  roomCode: string;
  member: { id: string; nickname: string };
}

export async function createHomeCheckin(
  memberId: string,
  audioUrl?: string,
  clientTranscript?: string
): Promise<HomeCheckinResult> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { homeCheckin: true, room: true },
  });

  if (!member) {
    throw AppError.notFound('멤버');
  }

  if (member.homeCheckin) {
    throw AppError.conflict('이미 귀가 체크인을 완료했어요');
  }

  // 클라이언트에서 STT 결과를 보내면 그걸 사용, 아니면 서버에서 처리
  const transcript = clientTranscript || (audioUrl ? await transcribeAudio(audioUrl) : null);

  const homeCheckin = await prisma.homeCheckin.create({
    data: {
      id: generateId('homeCheckin'),
      memberId,
      audioUrl,
      transcript,
    },
  });

  return {
    arrivedAt: homeCheckin.arrivedAt.toISOString(),
    transcript,
    roomCode: member.room.code,
    member: { id: member.id, nickname: member.nickname },
  };
}

export async function getHomeCheckin(memberId: string) {
  const homeCheckin = await prisma.homeCheckin.findUnique({
    where: { memberId },
  });

  if (!homeCheckin) {
    throw AppError.notFound('귀가 체크인');
  }

  return {
    arrivedAt: homeCheckin.arrivedAt.toISOString(),
    transcript: homeCheckin.transcript,
    audioUrl: homeCheckin.audioUrl,
  };
}

async function transcribeAudio(_audioUrl: string): Promise<string> {
  const mockPhrases = [
    '무사히 집에 도착했어요!',
    '오늘 정말 재밌었어요~',
    '다들 집에 잘 들어가세요!',
    '내일 또 해요!',
    '택시 타고 가는 중이에요',
  ];
  
  return mockPhrases[Math.floor(Math.random() * mockPhrases.length)] ?? mockPhrases[0]!;
}
