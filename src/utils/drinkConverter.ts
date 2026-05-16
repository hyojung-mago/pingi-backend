/**
 * @file utils/drinkConverter.ts - 음주량 변환 유틸리티
 *
 * 다양한 주류(맥주, 와인, 양주 등)를 소주 환산 잔수로 변환한다.
 * 음주 기록을 집계하고 통계를 계산하는 데 사용된다.
 */
import type { DrinkType } from '../types';

const SOJU_EQUIVALENT: Record<DrinkType, number> = {
  soju: 1.0,
  beer: 0.5,
  somaek: 0.8,
  wine: 1.2,
  liquor: 2.0,
};

export function toSojuEquivalent(drinks: Partial<Record<DrinkType, number>>): number {
  let total = 0;
  for (const [type, count] of Object.entries(drinks)) {
    const rate = SOJU_EQUIVALENT[type as DrinkType];
    if (rate && count) {
      total += rate * count;
    }
  }
  return Math.round(total * 10) / 10;
}

export function getDrinkRate(type: DrinkType): number {
  return SOJU_EQUIVALENT[type];
}

export function aggregateDrinks(
  drinkRecords: { type: string; delta: number }[]
): Record<DrinkType, number> {
  const totals: Record<DrinkType, number> = {
    soju: 0,
    beer: 0,
    somaek: 0,
    wine: 0,
    liquor: 0,
  };

  for (const record of drinkRecords) {
    const type = record.type as DrinkType;
    if (type in totals) {
      totals[type] += record.delta;
      if (totals[type] < 0) totals[type] = 0;
    }
  }

  return totals;
}
