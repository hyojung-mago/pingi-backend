/**
 * @file config/index.ts - 환경 설정 모듈
 *
 * .env 파일에서 환경 변수를 로드하고 애플리케이션 설정을 내보낸다.
 * 포트, DB URL, JWT 설정, 업로드 설정, CORS 등을 관리한다.
 */
import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`필수 환경변수 ${name}이(가) 설정되지 않았습니다.`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv,

  database: {
    url: isProd
      ? requireEnv('DATABASE_URL')
      : process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/pingi',
  },

  jwt: {
    secret: isProd
      ? requireEnv('JWT_SECRET')
      : process.env.JWT_SECRET || 'pingi-dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },

  ai: {
    apiUrl: process.env.AI_API_URL || 'http://localhost:8001',
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  google: {
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },

  isDev: !isProd,
  isProd,
} as const;
