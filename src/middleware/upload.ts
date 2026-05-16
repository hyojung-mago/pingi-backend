/**
 * @file middleware/upload.ts - 파일 업로드 미들웨어
 *
 * Multer를 사용하여 오디오 파일 업로드를 처리한다.
 * WAV, WebM, OGG, MP4, MP3 형식을 지원하며 최대 500KB 제한이 있다.
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { generateId } from '../utils';
import { AppError } from './errorHandler';

if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.wav';
    const filename = `${generateId('recording')}_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg',
  ];
  const allowedExts = ['.wav', '.webm', '.ogg', '.mp4', '.mp3'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'INVALID_FILE_TYPE', '지원하지 않는 오디오 형식이에요'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

export const uploadSingle = upload.single('audio');

export const uploadBaseline = upload.fields([
  { name: 'audio_1', maxCount: 1 },
  { name: 'audio_2', maxCount: 1 },
  { name: 'audio_3', maxCount: 1 },
]);
