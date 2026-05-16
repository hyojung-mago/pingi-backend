/**
 * @file middleware/errorHandler.ts - 전역 에러 핸들러
 *
 * AppError 클래스와 Express 에러 핸들러 미들웨어를 제공한다.
 * 모든 에러를 일관된 JSON 형식으로 클라이언트에 반환한다.
 */
import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../types';
import { config } from '../config';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const response: { error: ApiError } = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if (err.details) {
      response.error.details = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  console.error('Unhandled error:', err);

  const response: { error: ApiError } = {
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isDev ? err.message : '서버 오류가 발생했어요',
    },
  };

  if (config.isDev && err.stack) {
    response.error.details = { stack: err.stack };
  }

  res.status(500).json(response);
}
