/**
 * @file utils/codeGenerator.ts - 방 코드 생성기
 *
 * 6자리 영문+숫자 조합의 방 입장 코드를 생성한다.
 * 혼동하기 쉬운 문자(0, O, I, 1)를 제외한 문자셋을 사용한다.
 */
const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    code += CHARACTERS[randomIndex];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== 6) return false;
  return /^[A-Z0-9]{6}$/.test(code);
}
