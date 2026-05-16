/**
 * @file middleware/auth.ts - JWT 인증 미들웨어
 *
 * Bearer 토큰에서 JWT를 검증하고 req.user에 페이로드를 주입한다.
 * 토큰 생성(generateToken)과 검증(authenticate) 기능을 제공한다.
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import type { JwtPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as string,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요해요');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'TOKEN_EXPIRED', '토큰이 만료됐어요'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'INVALID_TOKEN', '유효하지 않은 토큰이에요'));
    } else {
      next(new AppError(401, 'UNAUTHORIZED', '인증에 실패했어요'));
    }
  }
}

export function hostOnly(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user?.isHost) {
    return next(new AppError(403, 'FORBIDDEN', '방장만 할 수 있어요'));
  }
  next();
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch {
    next();
  }
}
