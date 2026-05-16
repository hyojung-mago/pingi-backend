/**
 * @file utils/levelCalculator.ts - 취도 레벨 계산기
 *
 * 베이스라인 대비 발음 정확도 변화율을 0~5 레벨로 변환한다.
 * 레벨에 따른 한글 설명('멀쩡해요' ~ '만취')도 제공한다.
 */
export function calculateLevel(changeRate: number): number {
  const absRate = Math.abs(changeRate);
  
  if (absRate < 5) return 0;
  if (absRate < 15) return 1;
  if (absRate < 30) return 2;
  if (absRate < 50) return 3;
  if (absRate < 70) return 4;
  return 5;
}

export function calculateChangeRate(
  baselineAccuracy: number,
  currentAccuracy: number
): number {
  if (baselineAccuracy === 0) return 0;
  return ((baselineAccuracy - currentAccuracy) / baselineAccuracy) * 100;
}

export function getLevelDescription(level: number): string {
  const descriptions: Record<number, string> = {
    0: '멀쩡해요',
    1: '살짝 취기',
    2: '기분 좋은 취기',
    3: '제법 취함',
    4: '많이 취함',
    5: '만취',
  };
  return descriptions[level] || '알 수 없음';
}
