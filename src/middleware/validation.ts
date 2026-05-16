/**
 * @file middleware/validation.ts - 요청 데이터 검증 미들웨어
 *
 * Zod 스키마를 사용하여 API 요청 바디를 검증한다.
 * 방 생성, 참가, 멤버 수정, 음주량 기록 등의 요청 형식을 정의한다.
 */
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const createRoomSchema = z.object({
  hostNickname: z.string().min(1).max(10),
  location: z.string().max(30),
  scheduledAt: z.string().datetime(),
});

export const joinRoomSchema = z.object({
  nickname: z.string().min(1).max(10),
});

export const updateMemberSchema = z.object({
  breed: z.enum(['retriever', 'pomeranian', 'shiba', 'dachshund', 'poodle', 'bulldog']).optional(),
  arrivalEta: z.string().datetime().optional(),
  etaPreset: z.enum(['ontime', 'late5', 'late10', 'late20']).optional(),
  hungerLevel: z.number().int().min(0).max(3).optional(),
  arrived: z.boolean().optional(),
});

export const addDrinkSchema = z.object({
  type: z.enum(['soju', 'beer', 'somaek', 'wine', 'liquor']),
  delta: z.number().int().refine((val) => val === 1 || val === -1, {
    message: 'delta must be 1 or -1',
  }),
});

export const roomCodeSchema = z.object({
  code: z.string().length(6).regex(/^[A-Z0-9]+$/),
});

export const memberIdSchema = z.object({
  memberId: z.string().min(1),
});

export const checkpointIdSchema = z.object({
  checkpointId: z.string().min(1),
});

export function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new AppError(400, 'VALIDATION_ERROR', '입력값이 올바르지 않아요', { errors: details }));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams<T extends z.ZodSchema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'INVALID_PARAMS', '잘못된 요청이에요'));
      } else {
        next(error);
      }
    }
  };
}
