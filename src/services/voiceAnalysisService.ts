/**
 * @file services/voiceAnalysisService.ts - 음성 분석 서비스
 *
 * 핑이 AI 서비스(FastAPI)를 호출하여 음성 취도를 분석한다.
 * AI 서비스가 DB에 결과를 직접 기록하고, 이 서비스는 응답을 반환한다.
 *
 * 흐름:
 *   1. 백엔드 → POST AI_API/analyze (recording_id, audio_url, member_id)
 *   2. AI 서비스 → openSMILE + SVM 분석 → DB 기록
 *   3. 백엔드 ← 결과 응답
 */

import { config } from '../config';
import { getPingiPromptSentence } from '../constants/sentences';

const AI_API_URL = config.ai.apiUrl;

export interface AnalysisResult {
  score: number;
  level: number;
  changeRate: number;
  levelDescription: string;
  isFakeActing: boolean;
  status: 'normal' | 'fake_acting' | 'drunk';
}

interface AIAnalyzeResponse {
  score: number;
  level: number;
  level_description: string;
  change_rate: number;
  is_drunk: boolean;
  confidence: string;
  probability: number;
  feature_changes: Record<string, number> | null;
  is_fake_acting?: boolean;
  status?: 'normal' | 'fake_acting' | 'drunk';
  fake_probability?: number;
}

/** 핑이타임·베이스라인과 동일한 통일 문장 */
export function getRandomSentence(): string {
  return getPingiPromptSentence();
}

/**
 * AI 서비스에 녹음 분석 요청.
 * AI 서비스가 Recording/Member 테이블을 직접 업데이트한다.
 */
export async function analyzeRecording(
  audioPath: string,
  _baseline: unknown,
  _sentence: string,
  previousLevel: number,
  recordingId: string,
  memberId: string,
): Promise<AnalysisResult> {
  const response = await fetch(`${AI_API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recording_id: recordingId,
      member_id: memberId,
      audio_url: audioPath,
      previous_level: previousLevel,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 422) {
      throw new Error('녹음에서 음성이 감지되지 않았어요. 문장을 소리 내어 읽어주세요.');
    }
    throw new Error(`AI 분석 실패 (${response.status}): ${error}`);
  }

  const data = (await response.json()) as AIAnalyzeResponse;

  return {
    score: data.score,
    level: data.level,
    changeRate: data.change_rate,
    levelDescription: data.level_description,
    isFakeActing: data.is_fake_acting ?? false,
    status: data.status ?? (data.is_drunk ? 'drunk' : 'normal'),
  };
}

/**
 * 베이스라인 녹음 분석 요청.
 * AI 서비스가 3개 오디오에서 피처 추출 → 평균 → DB 저장.
 */
export async function analyzeBaseline(
  audioPaths: string[],
  _sentences: string[],
  memberId: string,
): Promise<void> {
  const response = await fetch(`${AI_API_URL}/analyze-baseline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      member_id: memberId,
      audio_urls: audioPaths,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`베이스라인 분석 실패 (${response.status}): ${error}`);
  }

  const data = (await response.json()) as { message?: string };
  console.log(`[VoiceAnalysis] 베이스라인 저장 완료: ${data.message}`);
}

/**
 * AI 서비스 헬스 체크.
 */
export async function isAIServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}
