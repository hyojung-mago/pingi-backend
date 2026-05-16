/**
 * @file services/memberService.ts - 멤버(Member) 비즈니스 로직
 *
 * 멤버 정보 수정, 음주량 기록/조회, 취도 레벨 업데이트 등
 * 개별 참가자와 관련된 핵심 비즈니스 로직을 담당한다.
 */
import { prisma } from '../lib/prisma';
import { generateId, aggregateDrinks, toSojuEquivalent } from '../utils';
import { AppError } from '../middleware/errorHandler';
import type { 
  UpdateMemberRequest, 
  MemberResponse, 
  DrinkType, 
  DrinkStatus,
  CharacterBreed,
  EtaPreset 
} from '../types';

export async function getMemberById(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { 
      drinks: true,
      room: true,
    },
  });

  if (!member) {
    throw AppError.notFound('멤버');
  }

  return member;
}

export async function updateMember(
  memberId: string,
  data: UpdateMemberRequest
): Promise<MemberResponse> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw AppError.notFound('멤버');
  }

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: {
      ...(data.breed && { breed: data.breed }),
      ...(data.arrivalEta && { arrivalEta: new Date(data.arrivalEta) }),
      ...(data.hungerLevel !== undefined && { hungerLevel: data.hungerLevel }),
      ...(data.arrived !== undefined && { arrived: data.arrived }),
      ...(data.etaPreset && { etaPreset: data.etaPreset }),
    },
    include: { drinks: true },
  });

  return formatMember(updated);
}

export async function addDrink(
  memberId: string,
  type: DrinkType,
  delta: number
): Promise<DrinkStatus> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { drinks: true },
  });

  if (!member) {
    throw AppError.notFound('멤버');
  }

  await prisma.drink.create({
    data: {
      id: generateId('drink'),
      memberId,
      type,
      delta,
    },
  });

  const updatedMember = await prisma.member.findUnique({
    where: { id: memberId },
    include: { drinks: true },
  });

  const drinks = aggregateDrinks(updatedMember!.drinks);
  const sojuEquivalent = toSojuEquivalent(drinks);

  return { drinks, sojuEquivalent };
}

export async function getDrinkStatus(memberId: string): Promise<DrinkStatus> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { drinks: true },
  });

  if (!member) {
    throw AppError.notFound('멤버');
  }

  const drinks = aggregateDrinks(member.drinks);
  const sojuEquivalent = toSojuEquivalent(drinks);

  return { drinks, sojuEquivalent };
}

export async function getMembersByRoomId(roomId: string) {
  return prisma.member.findMany({
    where: { roomId },
    include: { drinks: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateMemberLevel(memberId: string, level: number) {
  return prisma.member.update({
    where: { id: memberId },
    data: { level },
  });
}

function formatMember(member: {
  id: string;
  nickname: string;
  breed: string | null;
  isHost: boolean;
  arrived: boolean;
  etaPreset: string | null;
  hungerLevel: number;
  level: number;
  drinks: { type: string; delta: number }[];
}): MemberResponse {
  const drinks = aggregateDrinks(member.drinks);
  
  return {
    id: member.id,
    nickname: member.nickname,
    breed: member.breed as CharacterBreed | null,
    isHost: member.isHost,
    arrived: member.arrived,
    etaPreset: member.etaPreset as EtaPreset | null,
    hungerLevel: member.hungerLevel,
    level: member.level,
    drinks: drinks as Record<DrinkType, number>,
  };
}
