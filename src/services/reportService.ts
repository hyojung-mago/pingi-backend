/**
 * @file services/reportService.ts - 최종 리포트 생성 서비스
 *
 * 술자리 종료 후 최종 리포트를 생성한다.
 * 4대 고정상(주량왕, 최고레벨, 최저레벨, 센스왕), 조건부 뱃지, 타임라인을 계산한다.
 */
import { prisma } from '../lib/prisma';
import { generateId, aggregateDrinks, toSojuEquivalent } from '../utils';
import { AppError } from '../middleware/errorHandler';
import type { FinalReport, Award, Badge, TimelineEntry, ShareCardData, AwardType, CharacterBreed } from '../types';

function mapReportRow(
  roomId: string,
  row: {
    id: string;
    awards: unknown;
    badges: unknown;
    timeline: unknown;
    stats: unknown;
    generatedAt: Date;
  }
): FinalReport {
  return {
    id: row.id,
    roomId,
    awards: row.awards as Award[],
    badges: row.badges as Badge[],
    timeline: row.timeline as TimelineEntry[],
    stats: row.stats as FinalReport['stats'],
    generatedAt: row.generatedAt.toISOString(),
  };
}

export async function generateReport(roomId: string): Promise<FinalReport> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: { drinks: true },
      },
      checkpoints: {
        include: {
          recordings: {
            include: { member: true },
          },
        },
        orderBy: { index: 'asc' },
      },
    },
  });

  if (!room) {
    throw AppError.notFound('방을 찾을 수 없어요');
  }

  const members = room.members.map((m) => ({
    id: m.id,
    nickname: m.nickname,
    breed: m.breed,
    currentLevel: m.currentLevel,
    arrivalEta: m.arrivalEta,
    joinedAt: m.joinedAt,
    drinks: m.drinks,
  }));

  const checkpoints = room.checkpoints.map((cp) => ({
    id: cp.id,
    index: cp.index,
    triggeredAt: cp.triggeredAt,
    recordings: cp.recordings.map((r) => ({
      memberId: r.memberId,
      level: r.level,
      member: { nickname: r.member.nickname },
    })),
  }));

  const awards = calculateAwards(members, checkpoints);
  const badges = calculateBadges(members, checkpoints);
  const timeline = generateTimeline(checkpoints);
  const stats = calculateStats(members, checkpoints);

  const existing = await prisma.report.findUnique({ where: { roomId } });

  let reportRow;
  if (existing) {
    reportRow = await prisma.report.update({
      where: { roomId },
      data: {
        awards: awards as unknown as object,
        badges: badges as unknown as object,
        timeline: timeline as unknown as object,
        stats: stats as unknown as object,
      },
    });
  } else {
    reportRow = await prisma.report.create({
      data: {
        id: generateId('report'),
        roomId,
        awards: awards as unknown as object,
        badges: badges as unknown as object,
        timeline: timeline as unknown as object,
        stats: stats as unknown as object,
      },
    });
  }

  return mapReportRow(roomId, reportRow);
}

export async function getReport(roomCode: string): Promise<FinalReport> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    include: { report: true },
  });

  if (!room) {
    throw AppError.notFound('방을 찾을 수 없어요');
  }

  if (!room.report) {
    return generateReport(room.id);
  }

  return mapReportRow(room.id, room.report);
}

export async function getShareCardData(roomCode: string, _aspect: string): Promise<ShareCardData> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    include: {
      members: true,
      report: true,
    },
  });

  if (!room) {
    throw AppError.notFound('방을 찾을 수 없어요');
  }

  const report = room.report;
  const awards = ((report?.awards as unknown) as Award[]) || [];
  const topDrunkAward = awards.find((a) => a.type === 'top_drunk');

  return {
    date: room.scheduledAt.toISOString().split('T')[0] ?? '',
    location: room.location,
    winner: topDrunkAward?.nickname ?? room.members[0]?.nickname ?? '',
    members: room.members.map((m) => ({
      nickname: m.nickname,
      breed: m.breed as CharacterBreed | null,
      level: m.currentLevel,
    })),
  };
}

type MemberWithDrinks = {
  id: string;
  nickname: string;
  breed: string | null;
  currentLevel: number;
  arrivalEta: Date | null;
  joinedAt: Date;
  drinks: { type: string; delta: number }[];
};

type CheckpointWithRecordings = {
  id: string;
  index: number;
  triggeredAt: Date;
  recordings: {
    memberId: string;
    level: number | null;
    member: { nickname: string };
  }[];
};

function calculateAwards(
  members: MemberWithDrinks[],
  checkpoints: CheckpointWithRecordings[]
): Award[] {
  const awards: Award[] = [];

  const sortedByLevel = [...members].sort((a, b) => b.currentLevel - a.currentLevel);
  const topDrunk = sortedByLevel[0];
  if (topDrunk) {
    awards.push({
      type: 'top_drunk',
      memberId: topDrunk.id,
      nickname: topDrunk.nickname,
      breed: topDrunk.breed as CharacterBreed | null,
      description: `최종 레벨 ${topDrunk.currentLevel}로 오늘의 주량왕!`,
    });
  }

  const liverGuardian = sortedByLevel[sortedByLevel.length - 1];
  if (liverGuardian && liverGuardian.id !== topDrunk?.id) {
    awards.push({
      type: 'liver_guardian',
      memberId: liverGuardian.id,
      nickname: liverGuardian.nickname,
      breed: liverGuardian.breed as CharacterBreed | null,
      description: `최종 레벨 ${liverGuardian.currentLevel}로 간 지키미!`,
    });
  }

  const levelChanges = new Map<string, number[]>();
  for (const checkpoint of checkpoints) {
    for (const recording of checkpoint.recordings) {
      const changes = levelChanges.get(recording.memberId) || [];
      changes.push(recording.level ?? 0);
      levelChanges.set(recording.memberId, changes);
    }
  }

  let minVariance = Infinity;
  let pacemakerMember: MemberWithDrinks | null = null;

  for (const member of members) {
    const changes = levelChanges.get(member.id) || [0];
    const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / changes.length;
    
    if (variance < minVariance) {
      minVariance = variance;
      pacemakerMember = member;
    }
  }

  if (pacemakerMember) {
    awards.push({
      type: 'pacemaker',
      memberId: pacemakerMember.id,
      nickname: pacemakerMember.nickname,
      breed: pacemakerMember.breed as CharacterBreed | null,
      description: '꾸준한 페이스로 마신 페이스메이커!',
    });
  }

  let maxIncrease = 0;
  let acceleratorMember: MemberWithDrinks | null = null;

  for (const member of members) {
    const changes = levelChanges.get(member.id) || [];
    if (changes.length >= 2) {
      const increase = (changes[changes.length - 1] ?? 0) - (changes[0] ?? 0);
      if (increase > maxIncrease) {
        maxIncrease = increase;
        acceleratorMember = member;
      }
    }
  }

  if (acceleratorMember) {
    awards.push({
      type: 'accelerator',
      memberId: acceleratorMember.id,
      nickname: acceleratorMember.nickname,
      breed: acceleratorMember.breed as CharacterBreed | null,
      description: `${maxIncrease}레벨 급상승! 오늘의 액셀러레이터!`,
    });
  }

  return awards;
}

function calculateBadges(
  members: MemberWithDrinks[],
  _checkpoints: CheckpointWithRecordings[]
): Badge[] {
  const badges: Badge[] = [];

  const sortedByDrinks = [...members].sort((a, b) => {
    const aDrinks = toSojuEquivalent(aggregateDrinks(a.drinks));
    const bDrinks = toSojuEquivalent(aggregateDrinks(b.drinks));
    return bDrinks - aDrinks;
  });

  const topDrinker = sortedByDrinks[0];
  if (topDrinker) {
    const total = toSojuEquivalent(aggregateDrinks(topDrinker.drinks));
    if (total > 0) {
      badges.push({
        emoji: '🍺',
        name: '음주량 1위',
        winner: topDrinker.nickname,
        reason: `소주 ${total}잔 상당 섭취`,
      });
    }
  }

  const sortedByArrival = [...members].sort((a, b) => {
    const aTime = a.arrivalEta?.getTime() ?? a.joinedAt.getTime();
    const bTime = b.arrivalEta?.getTime() ?? b.joinedAt.getTime();
    return aTime - bTime;
  });

  const firstArrival = sortedByArrival[0];
  if (firstArrival) {
    badges.push({
      emoji: '⏰',
      name: '센스왕',
      winner: firstArrival.nickname,
      reason: '가장 먼저 도착!',
    });
  }

  return badges;
}

function generateTimeline(checkpoints: CheckpointWithRecordings[]): TimelineEntry[] {
  return checkpoints.map((checkpoint) => ({
    time: checkpoint.triggeredAt.toISOString(),
    checkpointIndex: checkpoint.index,
    levels: checkpoint.recordings.map((r) => ({
      memberId: r.memberId,
      level: r.level ?? 0,
    })),
  }));
}

function calculateStats(
  members: MemberWithDrinks[],
  checkpoints: CheckpointWithRecordings[]
): FinalReport['stats'] {
  const sortedByLevel = [...members].sort((a, b) => b.currentLevel - a.currentLevel);
  const topMember = sortedByLevel[0];

  const totalDrinks = members.reduce(
    (sum, m) => sum + toSojuEquivalent(aggregateDrinks(m.drinks)),
    0
  );

  return {
    pingiTimeCount: checkpoints.length,
    maxLevelMember: topMember
      ? {
          nickname: topMember.nickname,
          level: topMember.currentLevel,
        }
      : null,
    totalDrinks: Math.round(totalDrinks * 10) / 10,
  };
}
