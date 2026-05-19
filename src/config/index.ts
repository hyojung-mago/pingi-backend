/**
 * @file config/index.ts - 환경 설정 모듈
 *
 * .env 파일에서 환경 변수를 로드하고 애플리케이션 설정을 내보낸다.
 * 포트, DB URL, JWT 설정, 업로드 설정, CORS 등을 관리한다.
 */
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/pingi',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'pingi-dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  
  frontendUrl: process.env.FRONTEND_URL || 'https://pingi.app',
  
  google: {
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
} as const;
