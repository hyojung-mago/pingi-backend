/**
 * @file routes/members.ts - 멤버(Member) API 라우트
 *
 * /v1/members 하위의 엔드포인트를 정의한다.
 * 멤버 정보 수정, 음주량 기록, 베이스라인 업로드, 귀가 체크인 등의 라우트를 포함한다.
 */
import { Router } from 'express';
import * as memberController from '../controllers/memberController';
import { authMiddleware } from '../middleware/auth';
import { uploadBaseline as uploadBaselineMiddleware, uploadSingle } from '../middleware/upload';
import {
  validateBody,
  validateParams,
  updateMemberSchema,
  addDrinkSchema,
  memberIdSchema,
} from '../middleware/validation';

const router = Router();

router.patch(
  '/:memberId',
  validateParams(memberIdSchema),
  authMiddleware,
  validateBody(updateMemberSchema),
  memberController.updateMember
);

router.post(
  '/:memberId/drinks',
  validateParams(memberIdSchema),
  authMiddleware,
  validateBody(addDrinkSchema),
  memberController.addDrink
);

router.post(
  '/:memberId/baseline',
  validateParams(memberIdSchema),
  authMiddleware,
  uploadBaselineMiddleware,
  memberController.uploadBaseline
);

router.post(
  '/:memberId/baseline/complete',
  validateParams(memberIdSchema),
  authMiddleware,
  memberController.completeBaseline
);

router.post(
  '/:memberId/home',
  validateParams(memberIdSchema),
  authMiddleware,
  uploadSingle,
  memberController.homeCheckin
);

export default router;
