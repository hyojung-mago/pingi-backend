/**
 * @file routes/checkpoints.ts - 체크포인트(핑이타임) API 라우트
 *
 * /v1/checkpoints 하위의 엔드포인트를 정의한다.
 * 핑이타임 녹음 업로드 API를 제공한다.
 */
import { Router } from 'express';
import * as checkpointController from '../controllers/checkpointController';
import { authMiddleware } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { validateParams, checkpointIdSchema } from '../middleware/validation';

const router = Router();

router.post(
  '/:checkpointId/recordings',
  validateParams(checkpointIdSchema),
  authMiddleware,
  uploadSingle,
  checkpointController.uploadRecording
);

router.get(
  '/:checkpointId/results',
  validateParams(checkpointIdSchema),
  checkpointController.getCheckpointResults
);

router.post(
  '/:checkpointId/ack',
  validateParams(checkpointIdSchema),
  authMiddleware,
  checkpointController.acknowledgeCheckpointResult
);

export default router;
