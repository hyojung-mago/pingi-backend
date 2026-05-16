/**
 * @file app.ts - Express 애플리케이션 설정
 *
 * Express 앱을 생성하고 미들웨어(CORS, JSON 파싱, 정적 파일)를 설정한다.
 * API 라우트(/v1), Swagger 문서(/api-docs), 업로드 파일(/uploads)을 서빙한다.
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api-docs', express.static(path.join(process.cwd(), 'docs')));
app.get('/api-docs', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'docs', 'swagger-ui.html'));
});

app.use('/v1', routes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Pingi API',
    version: '1.0.0',
    docs: '/api-docs',
    health: '/v1/health',
  });
});

app.use(errorHandler);

app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: '요청한 리소스를 찾을 수 없어요',
    },
  });
});

export default app;
