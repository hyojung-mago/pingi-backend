/**
 * @file routes/index.ts - 라우트 인덱스
 *
 * /v1 하위의 모든 API 라우트를 통합한다.
 * rooms, members, checkpoints 라우터를 마운트하고 health check 엔드포인트를 제공한다.
 */
import { Router } from 'express';
import roomsRouter from './rooms';
import membersRouter from './members';
import checkpointsRouter from './checkpoints';

const router = Router();

router.use('/rooms', roomsRouter);
router.use('/members', membersRouter);
router.use('/checkpoints', checkpointsRouter);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
