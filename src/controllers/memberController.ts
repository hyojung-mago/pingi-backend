/**
 * @file controllers/memberController.ts - 멤버(Member) 관련 API 컨트롤러
 *
 * 멤버 정보 수정, 음주량 기록, 베이스라인 업로드, 귀가 체크인 등
 * 개별 멤버와 관련된 모든 HTTP 요청을 처리한다.
 */
import type { Request, Response, NextFunction } from 'express';
import * as memberService from '../services/memberService';
import * as baselineService from '../services/baselineService';
import * as homeCheckinService from '../services/homeCheckinService';
import { AppError } from '../middleware/errorHandler';
import type { UpdateMemberRequest, AddDrinkRequest } from '../types';
import { emitMemberUpdated, emitAllBaselineComplete, emitHomeCheckinResult } from '../websocket';

export async function updateMember(
  req: Request<{ memberId: string }, object, UpdateMemberRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { memberId } = req.params;

    if (req.user!.memberId !== memberId) {
      throw AppError.forbidden('자신의 정보만 수정할 수 있어요');
    }

    const member = await memberService.updateMember(memberId, req.body);
    
    // WebSocket: 멤버 정보 업데이트 알림
    const roomCode = req.user!.roomCode;
    emitMemberUpdated(roomCode, {
      id: member.id,
      nickname: member.nickname,
      breed: member.breed,
      arrived: member.arrived,
      etaPreset: member.etaPreset,
    });

    res.json(member);
  } catch (error) {
    next(error);
  }
}

export async function addDrink(
  req: Request<{ memberId: string }, object, AddDrinkRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { memberId } = req.params;
    const { type, delta } = req.body;

    if (req.user!.memberId !== memberId) {
      throw AppError.forbidden('자신의 음주량만 기록할 수 있어요');
    }

    const drinkStatus = await memberService.addDrink(memberId, type, delta);
    res.json(drinkStatus);
  } catch (error) {
    next(error);
  }
}

export async function uploadBaseline(
  req: Request<{ memberId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { memberId } = req.params;

    if (req.user!.memberId !== memberId) {
      throw AppError.forbidden('자신의 베이스라인만 업로드할 수 있어요');
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (!files || !files.audio_1 || !files.audio_2 || !files.audio_3) {
      throw AppError.badRequest('3개의 오디오 파일이 필요해요');
    }

    const sentence1 = req.body.sentence_1 as string;
    const sentence2 = req.body.sentence_2 as string;
    const sentence3 = req.body.sentence_3 as string;

    if (!sentence1 || !sentence2 || !sentence3) {
      throw AppError.badRequest('3개의 문장이 필요해요');
    }

    const result = await baselineService.uploadBaseline({
      memberId,
      audioUrls: [
        files.audio_1[0]!.path,
        files.audio_2[0]!.path,
        files.audio_3[0]!.path,
      ],
      sentences: [sentence1, sentence2, sentence3],
    });

    // 모든 멤버가 베이스라인 완료했으면 WebSocket 이벤트 전송
    if (result.allCompleted) {
      emitAllBaselineComplete(result.roomCode);
    }

    res.status(201).json({
      baselineId: result.baselineId,
      featureVector: result.featureVector,
      allCompleted: result.allCompleted,
    });
  } catch (error) {
    next(error);
  }
}

export async function completeBaseline(
  req: Request<{ memberId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { memberId } = req.params;

    if (req.user!.memberId !== memberId) {
      throw AppError.forbidden('자신의 베이스라인만 완료할 수 있어요');
    }

    const result = await baselineService.markBaselineComplete(memberId);

    // 모든 멤버가 베이스라인 완료했으면 WebSocket 이벤트 전송
    if (result.allCompleted) {
      emitAllBaselineComplete(result.roomCode);
    }

    res.json({ allCompleted: result.allCompleted });
  } catch (error) {
    next(error);
  }
}

export async function homeCheckin(
  req: Request<{ memberId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { memberId } = req.params;

    if (req.user!.memberId !== memberId) {
      throw AppError.forbidden('자신만 귀가 체크인할 수 있어요');
    }

    const file = req.file;
    const clientTranscript = req.body.transcript as string | undefined;
    
    const result = await homeCheckinService.createHomeCheckin(
      memberId,
      file?.path,
      clientTranscript
    );

    // WebSocket: 귀가 체크인 알림
    emitHomeCheckinResult(result.roomCode, result.member, result.arrivedAt);

    res.json({
      arrivedAt: result.arrivedAt,
      transcript: result.transcript,
    });
  } catch (error) {
    next(error);
  }
}
