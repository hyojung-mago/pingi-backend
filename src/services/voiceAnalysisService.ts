/**
 * @file services/voiceAnalysisService.ts - 음성 분석 서비스
 *
 * 베이스라인 대비 현재 발음의 변화율을 계산하여 취도 레벨을 판정한다.
 * 현재는 Mock 구현이며, 추후 Google Speech-to-Text 등으로 교체 가능하다.
 */
import { calculateLevel, calculateChangeRate } from '../utils';
import type { Baseline } from '@prisma/client';

export interface AnalysisResult {
  score: number;
  level: number;
  changeRate: number;
}

const PINGI_SENTENCES = [
  '오늘 날씨가 참 좋네요 저녁은 뭘 먹을까요',
  '간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 장 공장장이다',
  '저기 계신 저 분이 박 법학박사이시고 여기 계신 이 분이 백 법학박사이시다',
  '경찰청 철창살은 외철창살이냐 쌍철창살이냐',
  '들의 콩깍지는 깐 콩깍지인가 안 깐 콩깍지인가',
  '고려고 교복은 고급 교복이고 고려고 교복은 고급 원단이다',
  '상표 붙인 큰 깡통은 깐 깡통인가 안 깐 깡통인가',
  '저분은 백 법학박사이고 이분은 박 법학박사이시다',
];

export function getRandomSentence(): string {
  return PINGI_SENTENCES[Math.floor(Math.random() * PINGI_SENTENCES.length)] ?? PINGI_SENTENCES[0]!;
}

export async function analyzeRecording(
  _audioPath: string,
  baseline: Baseline,
  _sentence: string,
  previousLevel: number
): Promise<AnalysisResult> {
  const baselineVector = baseline.featureVector as Record<string, number> | null;
  const baselineClarity = baselineVector?.clarity ?? 0.9;
  
  const currentClarity = generateMockCurrentClarity(baselineClarity, previousLevel);
  
  const changeRate = calculateChangeRate(baselineClarity, currentClarity);
  const level = calculateLevel(changeRate);
  
  const score = Math.max(0, Math.min(1, changeRate / 100));

  return {
    score: Math.round(score * 100) / 100,
    level,
    changeRate: Math.round(changeRate * 100) / 100,
  };
}

function generateMockCurrentClarity(baselineClarity: number, previousLevel: number): number {
  const levelFactor = previousLevel * 0.05;
  const randomFactor = (Math.random() - 0.3) * 0.15;
  const timeFactor = Math.random() * 0.1;
  
  const degradation = levelFactor + randomFactor + timeFactor;
  const currentClarity = baselineClarity - degradation;
  
  return Math.max(0.1, Math.min(1, currentClarity));
}

export async function analyzeBaseline(
  _audioPaths: string[],
  _sentences: string[]
): Promise<Record<string, number>> {
  return {
    clarity: 0.85 + Math.random() * 0.1,
    speed: 0.9 + Math.random() * 0.1,
    pitch: 0.8 + Math.random() * 0.15,
    consistency: 0.88 + Math.random() * 0.1,
  };
}
