# 핑이 (Pingi) 백엔드 API 구현 요청

## 📋 프로젝트 개요

**핑이**는 술자리에서 발음 변화로 취도를 측정하는 모바일 웹앱입니다.
로그인 없이 방 코드 기반으로 동작하며, 실시간 음성 분석 및 WebSocket 통신이 핵심입니다.

## 🎯 구현 목표

프론트엔드가 이미 완성되어 있으며, 아래 API 스펙과 체크리스트를 기반으로
**백엔드 REST API + WebSocket + 음성 분석 시스템**을 구현해주세요.

## 📚 필수 참고 문서

1. **API 스펙**: `/docs/openapi.yaml` (OpenAPI 3.0 형식)
2. **Swagger UI**: `/docs/swagger-ui.html` (브라우저에서 열어서 확인)
3. **구현 체크리스트**: `/BACKEND-CHECKLIST.md` (우선순위별 정리)
4. **프론트엔드 레포**: https://github.com/hyojung-mago/pingi-front

## 🛠 추천 기술 스택

### 백엔드 프레임워크
- **Node.js + Express** (빠른 개발)
- **NestJS** (타입 안전성 + 구조화)
- **Spring Boot** (엔터프라이즈급)
- 또는 선호하는 프레임워크 자유 선택

### 데이터베이스
- **PostgreSQL** 또는 **MySQL** (관계형)
- 세션 데이터는 단순하므로 가벼운 스키마 가능

### 음성 분석
- **Google Speech-to-Text API** (발음 정확도 분석)
- **IBM Watson** 또는 **Azure Speech**
- 또는 오픈소스 STT 라이브러리

### 실시간 통신
- **Socket.io** (Node.js)
- **WebSocket** (네이티브)
- **Redis Pub/Sub** (확장성 고려 시)

## 📌 구현 우선순위 (P0 → P1 → P2)

### P0 (MVP 필수 - 1주차)

1. **방 생성/참가 API**
   ```
   POST /api/rooms
   GET /api/rooms/:code  
   POST /api/rooms/:code/members
   ```
   - 6자리 방 코드 생성 (중복 체크)
   - 멤버 참가 시 memberId 발급
   - 방장(isHost) 구분

2. **베이스라인 녹음 저장**
   ```
   POST /api/voice/baseline
   ```
   - 멤버당 3개 음성 파일 저장
   - 기준 발음 데이터로 보관

3. **핑이타임 발음 분석**
   ```
   POST /api/voice/test
   ```
   - 현재 음성 파일 받기
   - 베이스라인과 비교하여 변화율 계산
   - 취도 레벨(LV0~5) 반환

4. **세션 결과 조회**
   ```
   GET /api/sessions/:id/results
   ```
   - 시상식 데이터 반환 (4대 고정상, 조건부 뱃지)

### P1 (실시간 기능 - 2주차)

5. **WebSocket 실시간 이벤트**
   ```
   ws://api.pingi.app/v1/ws?roomCode=ABC123&memberId=xxx
   ```
   - 멤버 입장/퇴장
   - ETA 업데이트
   - 핑이타임 발동 알림
   - 레벨 변경 브로드캐스트

6. **음주량 기록**
   ```
   POST /api/sessions/:id/drinks
   GET /api/sessions/:id/drinks/:memberId
   ```

### P2 (부가 기능 - 3주차)

7. **귀가 체크인**
   ```
   POST /api/sessions/:id/home-checkin
   POST /api/sessions/:id/reviews (음성 후기)
   ```

8. **통계 및 히스토리**
   ```
   GET /api/users/:id/history
   GET /api/users/:id/stats
   ```

## 🔑 핵심 비즈니스 로직

### 1. 발음 변화율 계산 알고리즘
```
changeRate = (현재 발음 정확도 - 베이스라인 정확도) / 베이스라인 정확도 × 100

레벨 판정:
- LV0: changeRate < 5%
- LV1: 5% ~ 15%
- LV2: 15% ~ 30%
- LV3: 30% ~ 50%
- LV4: 50% ~ 70%
- LV5: 70% 이상
```

### 2. 핑이타임 자동 발동
- 15분 간격 (프론트에서 타이머 관리)
- 백엔드는 발동 이벤트 수신 시 전체 멤버에게 WebSocket 브로드캐스트

### 3. 시상식 계산
- **주량왕**: 총 잔수 최다
- **최고 레벨**: 최종 레벨 가장 높음
- **최저 레벨**: 최종 레벨 가장 낮음
- **센스왕**: 가장 먼저 도착한 사람

## 📦 데이터베이스 스키마 (참고)

### rooms
```sql
id, code (6자리), location, scheduled_time, host_member_id, status, created_at
```

### members
```sql
id, room_id, nickname, character_breed, hunger_level, eta_status, is_host, created_at
```

### voice_recordings
```sql
id, member_id, type (baseline/test), round, audio_url, accuracy_score, created_at
```

### sessions
```sql
id, room_id, started_at, ended_at, status
```

### session_results
```sql
id, session_id, member_id, final_level, total_drinks, level_changes (JSON), awards (JSON)
```

## ✅ 완료 기준

1. **Swagger UI**에서 모든 API 테스트 가능
2. **Postman 컬렉션** 제공
3. **프론트엔드와 연동** 시 Mock 데이터 없이 실제 데이터 표시
4. **WebSocket** 실시간 이벤트 정상 동작
5. **음성 분석** 정확도 80% 이상

## 🚀 시작 가이드

```bash
# 1. 레포 클론
git clone git@github.com:hyojung-mago/pingi-backend.git
cd pingi-backend

# 2. 환경변수 설정
cp .env.example .env
# DB_URL, SPEECH_API_KEY 등 설정

# 3. 데이터베이스 마이그레이션
npm run db:migrate

# 4. 개발 서버 실행
npm run dev

# 5. Swagger UI 확인
open http://localhost:8080/api-docs
```

## 📞 협업

- **프론트엔드 레포**: 프론트 코드 참고하여 API 응답 형식 맞추기
- **API 스펙 변경 시**: openapi.yaml 수정 후 프론트팀에 공유
- **이슈/질문**: GitHub Issues에 등록

---

**현재 프론트엔드는 완성되어 있으며, Mock 데이터로 동작 중입니다.**
**백엔드 API 구현 완료 시 즉시 연동 가능합니다!** 🚀
