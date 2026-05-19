/**
 * @file controllers/checkpointController.ts - 체크포인트(핑이타임) API 컨트롤러
 *
 * 핑이타임 녹음 업로드 및 결과 처리를 담당한다.
 * 멤버가 체크포인트에서 녹음을 제출하면 음성을 분석하고 취도를 계산한다.
 */
import type { Request, Response, NextFunction } from 'express';
import * as checkpointService from '../services/checkpointService';
import { AppError } from '../middleware/errorHandler';

export async function uploadRecording(
  req: Request<{ checkpointId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { checkpointId } = req.params;
    const memberId = req.user!.memberId;

    const file = req.file;
    if (!file) {
      throw AppError.badRequest('오디오 파일이 필요해요');
    }

    const result = await checkpointService.uploadRecording(
      checkpointId,
      memberId,
      file
    );

    res.status(201).json({ recording: result });
  } catch (error) {
    next(error);
  }
}

export async function getCheckpointResults(
  req: Request<{ checkpointId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { checkpointId } = req.params;
    const results = await checkpointService.getCheckpointResults(checkpointId);
    res.json(results);
  } catch (error) {
    next(error);
  }
}

export async function acknowledgeCheckpointResult(
  req: Request<{ checkpointId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { checkpointId } = req.params;
    const memberId = req.user!.memberId;
    const result = await checkpointService.acknowledgeCheckpointResult(checkpointId, memberId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
