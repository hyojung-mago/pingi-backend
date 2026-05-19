# 핑이 (Pingi) — Backend

> 발음·음성 기반 술자리 로그 API (Express + Prisma + Socket.io)

## 아키텍처

```
프론트엔드 (5173) ←→ 백엔드 (8000) ←→ AI 서버 (8001)
                      ↕                    ↕
                   PostgreSQL          openSMILE + SVM
                   Socket.io
```

## Quick Start

```bash
# 의존성
npm install

# PostgreSQL (로컬 또는 Docker)
brew services start postgresql    # macOS
# docker compose up -d            # Docker

# 환경 변수
cp .env.example .env
# DATABASE_URL, AI_API_URL 등 확인

# 스키마 반영
npx prisma generate
npm run db:push

# 개발 서버 (포트 8000)
npm run dev
```

### 환경 변수 (.env)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `DATABASE_URL` | — | PostgreSQL 연결 문자열 |
| `AI_API_URL` | `http://localhost:8001` | Pingi-AI 서버 주소 |
| `MAX_FILE_SIZE` | `5242880` | 업로드 파일 최대 크기 (5MB) |
| `JWT_SECRET` | — | JWT 서명 키 |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | (선택) 귀가 STT용 서비스 계정 |

## 베이스 URL

```
REST:       http://localhost:8000/v1
헬스:       GET /v1/health
WebSocket:  Socket.io — http://localhost:8000 + path /v1/ws (쿼리 room, token)
정적 파일:  GET /uploads/...
```

## REST 라우트 (`/v1`)

| 구분 | 메서드 | 경로 | 설명 |
|------|--------|------|------|
| 방 | POST | `/rooms` | 방 생성 |
| 방 | GET | `/rooms/:code` | 방 정보 조회 |
| 입장 | POST | `/rooms/:code/members` | 방 입장 |
| 시작 | POST | `/rooms/:code/start` | 술자리 시작 (방장) |
| 종료 | POST | `/rooms/:code/end` | 술자리 종료 (방장) |
| 핑이 트리거 | POST | `/rooms/:code/pingi` | 핑이타임 시작 |
| 리포트 | GET | `/rooms/:code/report` | 최종 리포트 |
| 공유카드 | GET | `/rooms/:code/share-card` | 인스타 카드 데이터 |
| 멤버 | PATCH | `/members/:id` | 멤버 정보 수정 |
| 음주 | POST | `/members/:id/drinks` | 잔수 추가 |
| 베이스라인 | POST | `/members/:id/baseline` | 베이스라인 녹음 업로드 |
| 베이스라인 완료 | POST | `/members/:id/baseline/complete` | 베이스라인 완료 알림 |
| 귀가 | POST | `/members/:id/home` | 귀가 체크인 |
| 핑이 녹음 | POST | `/checkpoints/:id/recordings` | 핑이타임 녹음 업로드 |
| 핑이 결과 | GET | `/checkpoints/:id/results` | 핑이타임 결과 조회 |
| 결과 확인 | POST | `/checkpoints/:id/ack` | 결과 확인 (동기화) |

## WebSocket 이벤트 (서버 → 클라이언트)

| 이벤트 | 페이로드 | 설명 |
|--------|----------|------|
| `member_joined` | `{ memberId, nickname }` | 새 멤버 입장 |
| `member_updated` | `{ memberId, ... }` | 멤버 정보 변경 |
| `room_started` | `{ status, startedAt }` | 술자리 시작 |
| `all_baseline_complete` | `{ roomCode }` | 모든 멤버 베이스라인 완료 |
| `pingi_time_started` | `{ checkpointId, index, sentence, countdownSeconds }` | 핑이타임 시작 |
| `recording_progress` | `{ checkpointId, submittedCount, totalCount }` | 녹음 제출 진행률 |
| `checkpoint_result` | `{ checkpointId, index, rankings, topDrunk, warnings }` | 핑이타임 결과 (전원 녹음 완료 시) |
| `result_ack_progress` | `{ checkpointId, ackedCount, totalCount }` | 결과 확인 진행률 |
| `pingi_live_resumed` | `{ checkpointId, nextPingiEndsAt }` | 전원 확인 완료 → 대시보드 복귀 |
| `room_ended` | `{ status, reportId }` | 술자리 종료 |
| `home_checkin_result` | `{ memberId, nickname, arrivedAt, transcript }` | 귀가 체크인 완료 |

## 핑이타임 동기화 흐름

```
1. 트리거 (수동 or 타이머) → pingi_time_started (전원 녹음 화면 이동)
2. 각자 녹음 제출 → recording_progress (N/M명 완료)
3. 전원 제출 완료 → checkpoint_result (전원 결과 화면 이동)
4. 각자 "확인" 버튼 → result_ack_progress (N/M명 확인)
5. 전원 확인 완료 → pingi_live_resumed (전원 대시보드 복귀)
```

- 쿨다운: 핑이타임 간 최소 30초 간격
- 타이머: 15분 주기 자동 핑이타임 (방장만 트리거)

## 스크립트

```bash
npm run dev          # tsx watch (개발)
npm run build        # tsc (빌드)
npm run start        # node dist/server.js (프로덕션)
npm run db:push      # prisma db push
npm run db:migrate   # prisma migrate dev
npm run db:studio    # prisma studio (DB GUI)
```

## 연관 서비스

| 서비스 | 경로 | 포트 |
|--------|------|------|
| 프론트엔드 | `../Pingi-Front` | 5173 |
| AI 서버 | `../Pingi-AI` | 8001 |
