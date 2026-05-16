/**
 * @file routes/rooms.ts - 방(Room) API 라우트
 *
 * /v1/rooms 하위의 엔드포인트를 정의한다.
 * 방 생성, 조회, 입장, 시작, 종료, 핑이타임, 리포트 조회 등의 라우트를 포함한다.
 */
import { Router } from 'express';
import * as roomController from '../controllers/roomController';
import { authMiddleware, hostOnly } from '../middleware/auth';
import {
  validateBody,
  validateParams,
  createRoomSchema,
  joinRoomSchema,
  roomCodeSchema,
} from '../middleware/validation';

const router = Router();

router.post(
  '/',
  validateBody(createRoomSchema),
  roomController.createRoom
);

router.get(
  '/:code',
  validateParams(roomCodeSchema),
  roomController.getRoom
);

router.post(
  '/:code/members',
  validateParams(roomCodeSchema),
  validateBody(joinRoomSchema),
  roomController.joinRoom
);

router.post(
  '/:code/start',
  validateParams(roomCodeSchema),
  authMiddleware,
  hostOnly,
  roomController.startRoom
);

router.post(
  '/:code/end',
  validateParams(roomCodeSchema),
  authMiddleware,
  hostOnly,
  roomController.endRoom
);

router.post(
  '/:code/pingi-time',
  validateParams(roomCodeSchema),
  authMiddleware,
  roomController.triggerPingiTime
);

router.post(
  '/:code/pingi',
  validateParams(roomCodeSchema),
  authMiddleware,
  roomController.triggerPingiTime
);

router.get(
  '/:code/report',
  validateParams(roomCodeSchema),
  roomController.getReport
);

router.get(
  '/:code/share-card',
  validateParams(roomCodeSchema),
  roomController.getShareCard
);

export default router;
