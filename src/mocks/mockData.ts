import type { CharacterBreed, Award, Badge, TimelineEntry, FinalReport } from '../types';

export interface MockParticipant {
  index: number;
  breed: CharacterBreed;
  pattern: string;
  patternLabel: string;
  hungerLevel: number;
}

export const MOCK_PARTICIPANTS: MockParticipant[] = [
  {
    index: 0,
    breed: 'retriever',
    pattern: 'gradual_rise',
    patternLabel: '점진적 상승형',
    hungerLevel: 1,
  },
  {
    index: 1,
    breed: 'bulldog',
    pattern: 'rapid_drunk',
    patternLabel: '급상승 후 만취 유지형',
    hungerLevel: 3,
  },
  {
    index: 2,
    breed: 'shiba',
    pattern: 'recovery',
    patternLabel: '초반 폭주 후 회복형',
    hungerLevel: 0,
  },
  {
    index: 3,
    breed: 'poodle',
    pattern: 'stable',
    patternLabel: '안정형',
    hungerLevel: 2,
  },
];

export const MOCK_MEMBER_NICKNAMES = ['', '폭주기관차', '회복의아이콘', '텐션유지왕'];

/**
 * 회차별 취도 레벨 (행: 회차, 열: 참가자 인덱스)
 * 인덱스 0은 시작 시점(모두 0)
 */
export const MOCK_LEVELS: number[][] = [
  [0, 0, 0, 0],
  [1, 3, 5, 1],
  [2, 5, 4, 1],
  [3, 5, 3, 2],
];

export const MOCK_SCORES: number[][] = [
  [0, 0, 0, 0],
  [0.15, 0.52, 0.88, 0.12],
  [0.35, 0.91, 0.72, 0.14],
  [0.55, 0.93, 0.48, 0.30],
];

export const MOCK_DRINK_RECORDS = [
  { soju: 2, beer: 1, somaek: 0, wine: 0, liquor: 0 },
  { soju: 5, beer: 2, somaek: 1, wine: 0, liquor: 0 },
  { soju: 4, beer: 0, somaek: 2, wine: 1, liquor: 0 },
  { soju: 1, beer: 1, somaek: 0, wine: 0, liquor: 0 },
];

export function buildMockAwards(memberIds: string[], nicknames: string[], breeds: (CharacterBreed | null)[]): Award[] {
  return [
    {
      type: 'top_drunk',
      memberId: memberIds[1]!,
      nickname: nicknames[1]!,
      breed: breeds[1]!,
      description: '최종 레벨 5로 오늘의 주량왕!',
    },
    {
      type: 'liver_guardian',
      memberId: memberIds[3]!,
      nickname: nicknames[3]!,
      breed: breeds[3]!,
      description: '최종 레벨 2로 간 지키미!',
    },
    {
      type: 'pacemaker',
      memberId: memberIds[3]!,
      nickname: nicknames[3]!,
      breed: breeds[3]!,
      description: '꾸준한 페이스로 마신 페이스메이커!',
    },
    {
      type: 'accelerator',
      memberId: memberIds[1]!,
      nickname: nicknames[1]!,
      breed: breeds[1]!,
      description: '5레벨 급상승! 오늘의 액셀러레이터!',
    },
  ];
}

export function buildMockBadges(nicknames: string[]): Badge[] {
  return [
    {
      emoji: '🍺',
      name: '음주량 1위',
      winner: nicknames[1]!,
      reason: '소주 8.3잔 상당 섭취',
    },
    {
      emoji: '⏰',
      name: '센스왕',
      winner: nicknames[3]!,
      reason: '가장 먼저 도착!',
    },
    {
      emoji: '🔥',
      name: '폭주 경고',
      winner: nicknames[2]!,
      reason: '1회차에 레벨 5 달성!',
    },
    {
      emoji: '💪',
      name: '회복왕',
      winner: nicknames[2]!,
      reason: '레벨 5에서 3으로 회복!',
    },
  ];
}

export function buildMockTimeline(memberIds: string[]): TimelineEntry[] {
  return [1, 2, 3].map((round) => ({
    time: new Date(Date.now() - (3 - round) * 15 * 60 * 1000).toISOString(),
    checkpointIndex: round,
    levels: memberIds.map((id, idx) => ({
      memberId: id,
      level: MOCK_LEVELS[round]![idx]!,
    })),
  }));
}

export function buildMockStats(nicknames: string[]): FinalReport['stats'] {
  return {
    pingiTimeCount: 3,
    maxLevelMember: {
      nickname: nicknames[1]!,
      level: 5,
    },
    totalDrinks: 19.8,
  };
}

export interface MockHomeCheckin {
  status: 'arrived' | 'moving' | 'no_response';
  transcript: string | null;
  label: string;
}

export const MOCK_HOME_CHECKINS: MockHomeCheckin[] = [
  { status: 'moving', transcript: '택시 타고 가는 중이에요~', label: '이동 중' },
  { status: 'arrived', transcript: '무사히 도착했어요! 오늘 너무 재밌었다~', label: '도착 완료' },
  { status: 'no_response', transcript: null, label: '응답 없음' },
  { status: 'arrived', transcript: '택시 타고 잘 도착했습니다!', label: '도착 완료' },
];

export const MOCK_MEMBER_COMMENTS = [
  '처음엔 멀쩡하더니 슬슬 눈이 풀리기 시작했어요. 전형적인 점진적 상승형!',
  '초반부터 과속... 2회차부터 만취 상태 고정! 오늘의 MVP(?)입니다.',
  '1회차에 레벨 5를 찍고 회복하는 놀라운 간 기능의 소유자. 리스펙.',
  '시종일관 안정적인 페이스. 다음에도 이 친구가 운전을 맡으면 안심!',
];
