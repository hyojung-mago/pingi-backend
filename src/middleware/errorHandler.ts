/**
 * @file middleware/errorHandler.ts - 전역 에러 핸들러
 *
 * AppError 클래스와 Express 에러 핸들러 미들웨어를 제공한다.
 * 모든 에러를 일관된 JSON 형식으로 클라이언트에 반환한다.
 */
import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../types';
import { config } from '../config';
import multer from 'multer';

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

  // Static factory methods
  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message: string = '인증이 필요해요'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message: string = '권한이 없어요'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message: string = '찾을 수 없어요'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static rateLimit(message: string = '너무 자주 요청했어요'): AppError {
    return new AppError(429, 'RATE_LIMIT', message);
  }

  static internal(message: string = '서버 오류가 발생했어요'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: '음성 파일이 너무 커요. 더 짧게 녹음하거나 화질을 낮춰 주세요.',
        },
      });
      return;
    }
    res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message || '파일 업로드에 실패했어요',
      },
    });
    return;
  }

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
