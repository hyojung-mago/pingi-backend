/**
 * Multer가 저장한 파일 경로를 DB/API에 넣을 공개 상대 경로로 바꾼다.
 * express.static('/uploads')와 맞추기 위해 프로젝트 루트 기준 상대 경로를 사용한다.
 */
import path from 'path';
import type { Express } from 'express';
import { config } from '../config';

export function multerFileToPublicRelativePath(file: Express.Multer.File): string {
  const cwd = process.cwd();
  const abs = path.resolve(file.path);
  let rel = path.relative(cwd, abs).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..')) {
    const dirName = path.basename(path.resolve(config.upload.dir));
    rel = path.posix.join(dirName, file.filename);
  }
  return rel;
}

/** DB에 저장된 uploads 상대 경로(또는 과거 절대 경로)를 fs용 절대 경로로 */
export function resolveStoredUploadPath(stored: string): string {
  if (path.isAbsolute(stored)) {
    return stored;
  }
  return path.resolve(process.cwd(), stored);
}
