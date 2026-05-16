# 핑이 (Pingi) - Backend
> 발음으로 측정하는 술자리 음주 로그 백엔드 API
## 📚 API 문서
- **OpenAPI 스펙**: `docs/openapi.yaml`
- **Swagger UI**: `docs/swagger-ui.html` (브라우저에서 열기)
- **구현 체크리스트**: `BACKEND-CHECKLIST.md`
## 🚀 Quick Start
### 필수 구현 API (우선순위)
1. **방 생성/참가** (P0)
   - POST /api/rooms
   - GET /api/rooms/:code
   - POST /api/rooms/:code/members
2. **베이스라인 측정** (P0)
   - POST /api/voice/baseline
3. **핑이타임 분석** (P0)
   - POST /api/voice/test
4. **WebSocket 실시간** (P1)
   - /ws 연결
   - member_joined, pingi_time_triggered 등
자세한 내용은 `BACKEND-CHECKLIST.md` 참고
## 🔗 프론트엔드 레포
https://github.com/hyojung-mago/pingi-front
