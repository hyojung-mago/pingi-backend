/**
 * @file utils/idGenerator.ts - 고유 ID 생성기
 *
 * nanoid를 사용하여 리소스별 고유 ID를 생성한다.
 * 리소스 타입에 따라 접두사(r_, m_, cp_ 등)가 붙은 형식을 사용한다.
 */
import { nanoid } from 'nanoid';

type IdPrefix = 'r' | 'm' | 't' | 'd' | 'b' | 'cp' | 'rec' | 'rpt' | 'hc';

const prefixMap: Record<string, IdPrefix> = {
  room: 'r',
  member: 'm',
  token: 't',
  drink: 'd',
  baseline: 'b',
  checkpoint: 'cp',
  recording: 'rec',
  report: 'rpt',
  homeCheckin: 'hc',
};

export function generateId(type: keyof typeof prefixMap): string {
  const prefix = prefixMap[type];
  const id = nanoid(12);
  return `${prefix}_${id}`;
}
