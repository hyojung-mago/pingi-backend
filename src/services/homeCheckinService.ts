/**
 * @file services/homeCheckinService.ts - 귀가 체크인 서비스
 *
 * 술자리 종료 후 멤버의 무사 귀가를 확인하고 후기를 저장한다.
 * 음성 녹음과 STT 변환 텍스트를 저장하며, WebSocket으로 실시간 알림을 보낸다.
 */
import { prisma } from '../lib/prisma';
import { generateId } from '../utils';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { transcribeWithGoogleCloud, isGoogleSttConfigured } from './sttService';

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
    throw AppError.notFound('멤버를 찾을 수 없어요');
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
    throw AppError.notFound('귀가 체크인을 찾을 수 없어요');
  }

  return {
    arrivedAt: homeCheckin.arrivedAt.toISOString(),
    transcript: homeCheckin.transcript,
    audioUrl: homeCheckin.audioUrl,
  };
}

async function transcribeAudio(storedPath: string): Promise<string | null> {
  if (isGoogleSttConfigured()) {
    const text = await transcribeWithGoogleCloud(storedPath);
    if (text) return text;
    console.warn('[STT] Google STT 결과가 비었거나 실패했어요. 클라이언트 transcript만 있다면 그걸 쓰세요.');
    return null;
  }

  if (config.isDev) {
    console.warn(
      '[STT] GOOGLE_APPLICATION_CREDENTIALS 가 없어 개발용 목(mock) 전사를 씁니다. 스웨거/문서와 달리 실제 STT는 GCP 설정 후 동작합니다.'
    );
    return mockTranscriptPhrase();
  }

  return null;
}

function mockTranscriptPhrase(): string {
  const mockPhrases = [
    '무사히 집에 도착했어요!',
    '오늘 정말 재밌었어요~',
    '다들 집에 잘 들어가세요!',
    '내일 또 해요!',
    '택시 타고 가는 중이에요',
  ];
  return mockPhrases[Math.floor(Math.random() * mockPhrases.length)] ?? mockPhrases[0]!;
}
