/**
 * MVP 시연용 인메모리 상태 관리.
 * roomId 기반으로 mock 멤버 ID 및 핑이타임 회차를 관리한다.
 */

interface MockRoomState {
  roomId: string;
  roomCode: string;
  hostMemberId: string;
  mockMemberIds: string[];
  allMemberIds: string[];
  nicknames: string[];
}

const roomStates = new Map<string, MockRoomState>();

export function registerMockRoom(state: MockRoomState): void {
  roomStates.set(state.roomId, state);
  roomStates.set(state.roomCode, state);
}

export function getMockRoomState(roomIdOrCode: string): MockRoomState | undefined {
  return roomStates.get(roomIdOrCode);
}

export function isMockMember(memberId: string): boolean {
  for (const state of roomStates.values()) {
    if (state.mockMemberIds.includes(memberId)) return true;
  }
  return false;
}

export function getMemberIndex(roomIdOrCode: string, memberId: string): number {
  const state = roomStates.get(roomIdOrCode);
  if (!state) return -1;
  return state.allMemberIds.indexOf(memberId);
}
