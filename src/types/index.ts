/**
 * @file types/index.ts - TypeScript 타입 정의
 *
 * 프로젝트 전반에서 사용되는 인터페이스와 타입을 정의한다.
 * API 요청/응답, WebSocket 메시지, 도메인 모델 타입 등을 포함한다.
 */
export type RoomStatus = 'waiting' | 'live' | 'ended';

export type CharacterBreed = 
  | 'retriever' 
  | 'pomeranian' 
  | 'shiba' 
  | 'dachshund' 
  | 'poodle' 
  | 'bulldog';

export type DrinkType = 'soju' | 'beer' | 'somaek' | 'wine' | 'liquor';

export type EtaPreset = 'ontime' | 'late5' | 'late10' | 'late20';

export type AwardType = 'top_drunk' | 'liver_guardian' | 'pacemaker' | 'accelerator';

export interface JwtPayload {
  memberId: string;
  roomId: string;
  roomCode: string;
  isHost: boolean;
  iat?: number;
  exp?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CreateRoomRequest {
  hostNickname: string;
  location: string;
  scheduledAt: string;
}

export interface JoinRoomRequest {
  nickname: string;
}

export interface UpdateMemberRequest {
  breed?: CharacterBreed;
  arrivalEta?: string;
  etaPreset?: EtaPreset;
  hungerLevel?: number;
  arrived?: boolean;
}

export interface AddDrinkRequest {
  type: DrinkType;
  delta: number;
}

export interface DrinkStatus {
  drinks: Record<DrinkType, number>;
  sojuEquivalent: number;
}

export interface MemberResponse {
  id: string;
  nickname: string;
  breed: CharacterBreed | null;
  isHost: boolean;
  arrived: boolean;
  etaPreset: EtaPreset | null;
  hungerLevel: number;
  level: number;
  drinks: Record<DrinkType, number>;
  sojuEquivalent: number;
  homeCheckinAt: string | null;
  homeCheckinTranscript: string | null;
  homeCheckinAudioUrl: string | null;
}

export interface RoomResponse {
  id: string;
  code: string;
  location: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  status: RoomStatus;
  shareUrl: string;
  members: MemberResponse[];
}

export interface Checkpoint {
  id: string;
  roomId: string;
  index: number;
  sentence: string;
  triggeredAt: string;
  triggerType: 'auto' | 'manual';
  status: 'pending' | 'completed';
}

export interface RecordingResult {
  id: string;
  score: number;
  level: number;
  previousLevel: number;
  delta: number;
  levelDescription?: string;
  isFakeActing?: boolean;
  status?: 'normal' | 'fake_acting' | 'drunk';
}

export interface BaselineResult {
  baselineId: string;
  allCompleted: boolean;
  roomCode?: string;
}

export interface Award {
  type: AwardType;
  memberId: string;
  nickname: string;
  breed: CharacterBreed | null;
  description: string;
}

export interface Badge {
  emoji: string;
  name: string;
  winner: string;
  reason: string;
}

export interface TimelineEntry {
  time: string;
  checkpointIndex: number;
  levels: { memberId: string; level: number }[];
}

export interface FinalReport {
  id: string;
  roomId: string;
  awards: Award[];
  badges: Badge[];
  timeline: TimelineEntry[];
  stats: {
    pingiTimeCount: number;
    maxLevelMember: { nickname: string; level: number } | null;
    totalDrinks: number;
  };
  generatedAt: string;
}

export interface ShareCardData {
  date: string;
  location: string;
  winner: string | null;
  members: {
    nickname: string;
    breed: CharacterBreed | null;
    level: number;
  }[];
}

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}
