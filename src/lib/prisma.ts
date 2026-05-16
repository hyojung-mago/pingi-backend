/**
 * @file lib/prisma.ts - Prisma 클라이언트 싱글톤
 *
 * Prisma Client 인스턴스를 전역 싱글톤으로 관리한다.
 * 개발 환경에서는 Hot Reload 시 중복 인스턴스 생성을 방지한다.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
