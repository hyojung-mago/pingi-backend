# 핑이 (Pingi) — Backend

> 발음·음성 기반 술자리 로그 API (Express + Prisma + Socket.io)

## API 문서

| 항목 | 위치 |
|------|------|
| OpenAPI 스펙 | `docs/openapi.yaml` |
| Swagger UI | 서버 실행 후 **http://localhost:8000/api-docs** (YAML 로드) |
| 구현 체크리스트 | `BACKEND-CHECKLIST.md` |
| 도메인 상세 명세 | [pingi-docs `07-API.md`](https://github.com/hyojung-mago/pingi-docs) (별도 레포 시 로컬 경로 참고) |

## 베이스 URL

```
REST:       http://localhost:8000/v1   (프로덕션: https://api.pingi.app/v1)
헬스:       GET  /v1/health
WebSocket:  Socket.io — `http://localhost:8000` + path `/v1/ws` (쿼리 `room`, `token`)
정적 재생:  GET  /uploads/...
```

## Quick Start

```bash
# 의존성
npm install

# DB (Docker)
docker compose up -d

# 환경 변수 (.env — .env.example 참고)
cp .env.example .env

# 스키마 반영
npx prisma generate
npm run db:push

# 개발 서버 (기본 포트 8000)
npm run dev
```

### 선택: 귀가 음성 서버 STT (Google Cloud)

`.env`에 서비스 계정 JSON 경로:

```env
GOOGLE_APPLICATION_CREDENTIALS=./your-credentials.json
```

없으면 개발 환경에서는 귀가 전사가 목(mock) 동작할 수 있습니다. 클라이언트가 `transcript`를 보내면 그 값이 우선입니다.

## 주요 REST 라우트 (모두 `/v1` 접두사)

| 구분 | 메서드 | 경로 |
|------|--------|------|
| 방 | POST | `/rooms` |
| 방 | GET | `/rooms/:code` |
| 입장 | POST | `/rooms/:code/members` |
| 시작/종료 | POST | `/rooms/:code/start`, `/end` |
| 핑이 트리거 | POST | `/rooms/:code/pingi-time`, `/pingi` (동일) |
| 리포트 | GET | `/rooms/:code/report`, `/share-card` |
| 멤버 | PATCH | `/members/:id` |
| 음주 | POST | `/members/:id/drinks` |
| 베이스라인 | POST | `/members/:id/baseline`, `/baseline/complete` |
| 귀가 | POST | `/members/:id/home` |
| 핑이 녹음 | POST | `/checkpoints/:id/recordings` |
| 핑이 결과 | GET | `/checkpoints/:id/results` |

## WebSocket 이벤트 (서버 → 클라이언트)

`member_joined`, `member_updated`, `room_started`, `all_baseline_complete`, `pingi_time_started`, `checkpoint_result`, `room_ended`, `home_checkin_result` 등 — 상세는 `docs/openapi.yaml` 및 `BACKEND-CHECKLIST.md`.

## 스크립트

```bash
npm run dev          # tsx watch
npm run build        # tsc
npm run start        # node dist/server.js
npm run db:push      # prisma db push
npm run db:migrate   # prisma migrate dev
npm run db:studio    # prisma studio
```

## 프론트엔드

https://github.com/hyojung-mago/pingi-front  

프론트 `.env` 예:

```env
VITE_API_URL=http://localhost:8000/v1
VITE_WS_URL=http://localhost:8000
```

(Socket.io 클라이언트는 베이스 URL에 `path`만 `/v1/ws`로 맞추는 방식이 일반적입니다.)
