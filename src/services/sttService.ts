/**
 * Google Cloud Speech-to-Text (귀가 후기 음성 등).
 * GOOGLE_APPLICATION_CREDENTIALS(서비스 계정 JSON 경로)가 없거나 파일이 없으면 null을 반환한다.
 */
import fs from 'fs';
import path from 'path';
import { SpeechClient, protos } from '@google-cloud/speech';
import { config } from '../config';
import { resolveStoredUploadPath } from '../utils/uploadPaths';

const AudioEncoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding;

let speechClientInstance: SpeechClient | null | undefined;

function credentialsConfigured(): boolean {
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS || config.google.credentials;
  if (!p) return false;
  try {
    return fs.existsSync(path.resolve(p));
  } catch {
    return false;
  }
}

function getSpeechClient(): SpeechClient | null {
  if (!credentialsConfigured()) {
    return null;
  }
  if (speechClientInstance === undefined) {
    try {
      speechClientInstance = new SpeechClient();
    } catch (e) {
      console.error('[STT] SpeechClient 초기화 실패:', e);
      speechClientInstance = null;
    }
  }
  return speechClientInstance ?? null;
}

function buildConfigForExtension(ext: string): protos.google.cloud.speech.v1.IRecognitionConfig {
  const base: protos.google.cloud.speech.v1.IRecognitionConfig = {
    languageCode: 'ko-KR',
    enableAutomaticPunctuation: true,
  };

  switch (ext) {
    case '.webm':
      return {
        ...base,
        encoding: AudioEncoding.WEBM_OPUS,
        sampleRateHertz: 48000,
      };
    case '.wav':
      return {
        ...base,
        encoding: AudioEncoding.LINEAR16,
        sampleRateHertz: 16000,
      };
    case '.mp3':
      return {
        ...base,
        encoding: AudioEncoding.MP3,
        sampleRateHertz: 44100,
      };
    default:
      return {
        ...base,
        encoding: AudioEncoding.WEBM_OPUS,
        sampleRateHertz: 48000,
      };
  }
}

/**
 * 업로드 파일의 DB 상대 경로(예: uploads/xxx.webm)를 받아 텍스트로 변환.
 * 성공 시 문자열, 자격 없음/실패/무음 시 null
 */
export async function transcribeWithGoogleCloud(storedRelativePath: string): Promise<string | null> {
  const abs = resolveStoredUploadPath(storedRelativePath);
  if (!fs.existsSync(abs)) {
    console.warn('[STT] 파일 없음:', abs);
    return null;
  }

  const speech = getSpeechClient();
  if (!speech) {
    return null;
  }

  const content = fs.readFileSync(abs).toString('base64');
  const ext = path.extname(abs).toLowerCase();
  const recognitionConfig = buildConfigForExtension(ext);

  try {
    const [response] = await speech.recognize({
      audio: { content },
      config: recognitionConfig,
    });

    const text =
      response.results
        ?.map((r) => r.alternatives?.[0]?.transcript ?? '')
        .join(' ')
        .trim() ?? '';

    return text.length > 0 ? text : null;
  } catch (e) {
    console.error('[STT] Google Speech recognize 오류:', e);
    return null;
  }
}

export function isGoogleSttConfigured(): boolean {
  return credentialsConfigured();
}
