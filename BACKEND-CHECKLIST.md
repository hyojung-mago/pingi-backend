# 핑이 백엔드 구현 체크리스트

> 프론트엔드 준비 완료. 아래 API만 구현하면 바로 연동 가능.

---

## 🚀 Quick Start

```bash
# 프론트엔드 실행
cd Pingi-Front
npm install
npm run dev

# 환경변수 설정 (.env)
VITE_API_URL=http://localhost:8000/v1
VITE_WS_URL=ws://localhost:8000/v1/ws
```

---

## 📋 구현 우선순위

### Phase 1: 핵심 플로우 (MVP)

| 순서 | API | 설명 | 프론트 파일 |
|------|-----|------|-------------|
| 1 | `POST /rooms` | 방 생성 | `CreateSession.tsx` |
| 2 | `GET /rooms/{code}` | 방 정보 조회 | `JoinSession.tsx` |
| 3 | `POST /rooms/{code}/members` | 방 입장 | `JoinSession.tsx` |
| 4 | `PATCH /members/{id}` | 캐릭터/도착정보 저장 | `CharacterSelect.tsx`, `ArrivalInfo.tsx` |
| 5 | `POST /rooms/{code}/start` | 술자리 시작 | `WaitingRoom.tsx` |
| 6 | `POST /members/{id}/baseline` | 베이스라인 업로드 | `BaselineTest.tsx` |
| 7 | `POST /checkpoints/{id}/recordings` | 녹음 업로드 | `VoiceRecording.tsx` |
| 8 | `POST /rooms/{code}/end` | 술자리 종료 | `SessionDashboard.tsx` |

### Phase 2: 실시간 기능

| 순서 | WebSocket 이벤트 | 설명 |
|------|-----------------|------|
| 1 | `member_joined` | 새 멤버 입장 알림 |
| 2 | `member_updated` | 멤버 정보 변경 (캐릭터, 도착) |
| 3 | `member_eta_updated` | ETA 프리셋 변경 |
| 4 | `room_started` | 술자리 시작 |
| 5 | `pingi_time_started` | 핑이타임 시작 (모두 녹음 화면으로) |
| 6 | `checkpoint_result` | 핑이타임 결과 발표 |
| 7 | `room_ended` | 술자리 종료 |

### Phase 3: 부가 기능

| API | 설명 |
|-----|------|
| `POST /members/{id}/drinks` | 잔수 기록 |
| `GET /rooms/{code}/report` | 최종 리포트 |
| `POST /members/{id}/home` | 귀가 체크인 |
| `home_checkin_result` (WS) | 귀가 알림 |

---

## 📝 REST API 상세

### 1. 방 생성
```http
POST /v1/rooms
Content-Type: application/json

{
  "hostNickname": "민준",
  "location": "강남역 4번출구",
  "scheduledAt": "2026-05-16T19:30:00Z"
}
```
**응답**
```json
{
  "room": {
    "id": "r_xxx",
    "code": "ABCDEF",
    "shareUrl": "https://pingi.app/r/ABCDEF",
    "status": "waiting"
  },
  "host": {
    "id": "m_xxx",
    "nickname": "민준",
    "token": "eyJ..."
  }
}
```

### 2. 방 입장
```http
POST /v1/rooms/ABCDEF/members
Content-Type: application/json

{
  "nickname": "수진"
}
```
**응답**: 멤버 토큰 + 방 정보

### 3. 멤버 정보 업데이트
```http
PATCH /v1/members/m_xxx
Authorization: Bearer <token>
Content-Type: application/json

{
  "breed": "retriever",
  "arrivalEta": "2026-05-16T19:40:00Z",
  "hungerLevel": 2,
  "arrived": true
}
```

### 4. 베이스라인 업로드
```http
POST /v1/members/m_xxx/baseline
Authorization: Bearer <token>
Content-Type: multipart/form-data

audio_1: <wav blob>
audio_2: <wav blob>
audio_3: <wav blob>
sentence_1: "오늘 날씨가 참 좋네요..."
sentence_2: "..."
sentence_3: "..."
```

### 5. 핑이타임 녹음 업로드
```http
POST /v1/checkpoints/cp_xxx/recordings
Authorization: Bearer <token>
Content-Type: multipart/form-data

audio: <wav blob>
```
**응답**
```json
{
  "recording": {
    "id": "rec_xxx",
    "score": 0.34,
    "level": 2,
    "previousLevel": 1,
    "delta": 1
  }
}
```

### 6. 잔수 기록
```http
POST /v1/members/m_xxx/drinks
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "soju",
  "delta": 1
}
```
**소주 환산 기준**: soju=1.0, beer=0.5, somaek=0.8, wine=1.2, liquor=2.0

---

## 🔌 WebSocket 이벤트 상세

### 연결
```javascript
const ws = new WebSocket('wss://api.pingi.app/v1/ws?room=ABCDEF&token=eyJ...');
```

### 메시지 포맷
```json
{
  "type": "이벤트명",
  "payload": { ... },
  "timestamp": "2026-05-16T19:35:00Z"
}
```

### 핑이타임 시작 (서버 → 클라이언트)
```json
{
  "type": "pingi_time_started",
  "payload": {
    "checkpointId": "cp_xxx",
    "index": 3,
    "sentence": "오늘 날씨가 참 좋네요 저녁은 뭘 먹을까요",
    "countdownSeconds": 5
  }
}
```

### 핑이타임 결과 (서버 → 클라이언트)
```json
{
  "type": "checkpoint_result",
  "payload": {
    "checkpointId": "cp_xxx",
    "index": 3,
    "rankings": [
      {
        "memberId": "m_xxx",
        "nickname": "민준",
        "breed": "retriever",
        "level": 4,
        "previousLevel": 2,
        "delta": 2
      }
    ],
    "topDrunk": "m_xxx",
    "warnings": [
      { "type": "hunger", "memberId": "m_yyy", "message": "공복인 수진..." }
    ]
  }
}
```

---

## 🎤 음성 파일 규격

```
포맷:     WAV (PCM)
샘플링:   16,000 Hz
채널:     1 (mono)
비트:     16-bit
길이:     5초
최대:     500 KB
```

프론트에서 Web Audio API로 변환 후 전송.

---

## 🗄️ 데이터 모델 (참고)

```
Room
├── id, code, location, scheduledAt, status
└── members[]
    ├── id, nickname, breed, isHost
    ├── arrived, etaPreset, hungerLevel
    ├── level, drinks{}
    └── baseline{}

Checkpoint (핑이타임)
├── id, roomId, index, sentence
├── recordings[]
└── results[]

FinalReport
├── awards[], badges[]
├── timeline[]
└── stats{}
```

상세: `pingi-docs/06-DATA-MODEL.md`

---

## ✅ 테스트 시나리오

1. **방 생성 → 입장 → 캐릭터 선택 → 대기**
2. **베이스라인 녹음 3회**
3. **술자리 시작 → 잔수 기록**
4. **핑이타임 자동/수동 트리거 → 녹음 → 결과**
5. **술자리 종료 → 시상식**
6. **인스타 카드 → 귀가 체크인**

---

## 📁 프론트엔드 코드 위치

| 기능 | 파일 |
|------|------|
| API 서비스 | `src/services/api.ts` |
| WebSocket | `src/services/websocket.ts` |
| 방 상태 관리 | `src/contexts/RoomContext.tsx` |
| 세션 상태 관리 | `src/contexts/SessionContext.tsx` |

---

## 🔗 관련 문서

- `pingi-docs/07-API.md` — 전체 API 명세
- `pingi-docs/06-DATA-MODEL.md` — 데이터 모델
- `pingi-docs/05-FEATURES.md` — 기능 명세
- `pingi-docs/10-EDGE-CASES.md` — 에러 처리
