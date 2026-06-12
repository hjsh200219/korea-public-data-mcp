---
created: 2026-06-12T12:50:00+09:00
project: k-public-data-mcp
summary: Railway 재배포 후 인메모리 세션 소실 → claude.ai 게이트웨이 stale sid 404 포기 장애 수정 — stateless 폴백(mcp-stateless-fallback.ts) 도입, 커밋 95a6e32 배포 완료
---

## Session Digest

2026-06-12 12:25 Railway 재배포(직전 세션 프로브 수정 배포) 이후 인메모리 세션 Map이 초기화됨. 12:26:32 claude.ai 게이트웨이가 재배포 이전의 stale sid(787d89f1)로 `POST /mcp` tools/list를 요청 → 서버가 404 반환 → 게이트웨이가 재초기화 없이 포기 → 사용자의 claude.ai/code 클라우드 세션에서 K-Data 툴 0개(ToolSearch 결과에 youtube 미포함, higgsfield만 반환). Claude Code CLI는 같은 404에서 자동 재초기화+재시도로 회복하므로 CLI 사용자에겐 무증상.

수정: stale 세션 요청을 404로 거절하는 대신 1회성 stateless transport로 응답. `src/mcp-stateless-fallback.ts` 신규, `src/remote.ts`의 stale 404 분기를 폴백 호출로 교체. TDD 준수: `src/mcp-stateless-fallback.test.ts` 3케이스 작성(Red) 후 구현(Green). 기존 `session-health.e2e.test.ts`의 stale 404 기대값도 200 폴백+세션 미등록 검증으로 업데이트.

검증: lint 0, 전체 테스트 1059 통과(신규 3 포함), build clean, verify-docs 정상(19/16/16). 커밋 95a6e32 master push → Railway e6f784df 배포 SUCCESS(12:47) → 라이브 재현 검증: stale sid tools/list → HTTP 200 + 툴 18종 반환 확인.

부수 발견: CLAUDE.md가 AGENTS.md의 심링크 — 양쪽 모두 수정하면 컨벤션이 중복 삽입됨. AGENTS.md만 수정하면 양쪽에 적용. 이번 세션에 실수 후 dedupe 처리 완료.

## Progress

### 완료
- 장애 원인 분석: Railway 재배포 → 인메모리 세션 소실 → stale sid 요청 → 기존 코드 404 반환 → claude.ai 게이트웨이가 재초기화 없이 포기하는 동작을 railway logs 타임라인으로 확정.
- `src/mcp-stateless-fallback.ts` 신규: `handleStatelessMcpRequest()` — `sessionIdGenerator: undefined` 1회성 stateless StreamableHTTPServerTransport(세션 검증 생략), 세션 Map 미등록, `res` close 시 transport/server 정리.
- `src/remote.ts` stale 분기: 404 제거 → 폴백 호출 + warn 로그(`"stale session ... stateless fallback"`).
- `src/mcp-stateless-fallback.test.ts` 신규: tools/list·initialize·tools/call 3케이스.
- `src/__tests__/session-health.e2e.test.ts`: stale 404 기대 → 200 폴백 + 세션 미등록 검증.
- `AGENTS.md` 컨벤션 추가: stale 세션 stateless 폴백 정책 1줄.
- 검증·배포: 전체 1059 통과, lint 0, build clean, verify-docs 19/16/16. 95a6e32 push → Railway e6f784df SUCCESS(12:47) → 라이브 stale sid 재현 → HTTP 200 + 18종 툴 확인.
- 메모리 2건 신규: `mcp-stale-session-stateless-fallback`, `railway-stale-session-diagnosis`.

## Next Steps (우선순위)
1. **(이월) 쿠키 자동 sync 안정화** — `sync-youtube-cookies.sh`(launchd 08:00) 06-10~12 3일 연속 FAIL(Chrome Profile 4 미로그인). 재발 방지: FAIL 3연속 시 텔레그램 알림 강화, Chrome Profile 4 YouTube 로그인 상시 유지 점검.
2. **(이월) cookiePool 메트릭 cosmetic 오표기** — `/health/youtube`의 `cookiePool: expired -1d`는 단일 YOUTUBE_COOKIES 모드에서 vestigial. POOL 미설정 시 실제 YOUTUBE_COOKIES 만료 반영 또는 null 표기로 개선.
3. **(이월) gov24-ai health/canary probe, multi-turn cnvrsId** — 2026-06-03 핸드오프 이월 유지.

## Blockers
없음.

## Watch Out
- **CLAUDE.md = AGENTS.md 심링크**: 두 파일 모두 수정하면 중복 삽입. 항상 AGENTS.md만 수정.
- **stateless 폴백 오버헤드**: 요청당 `createServer()` + transport 신규 생성. claude.ai 게이트웨이가 stale sid를 계속 재사용하면 매 요청 폴백 동작 — Railway 로그 `"stale session ... stateless fallback"` 빈도 높으면 점검.
- **GET /mcp(SSE) stale 처리**: 폴백은 POST에만 적용. GET은 stale sid 시 여전히 400(SSE는 stateless 불가 — 의도적).
- **프로브 = 서빙 경로**: `youtube-probe._runProbe`는 반드시 `getTranscript()` 그대로 호출. 자체 yt-dlp 명령 복제 금지(늑대소년 재발).
- **yt-dlp 핀**: Dockerfile 하드코딩(2026.06.09). 봇탐지 반복 시 최신 stable 재bump.
- **Railway 도메인**: 공개 URL `https://public-data.up.railway.app` (서비스명 korea-public-data-mcp).
- **verify-docs EXPECTED**: 19/16/16 (이번 변경 도메인/스킬 증감 없음).

## Files Touched
- `src/mcp-stateless-fallback.ts` — 신규: handleStatelessMcpRequest() stateless 폴백
- `src/mcp-stateless-fallback.test.ts` — 신규: 3케이스 TDD
- `src/remote.ts` — stale 404 분기 → stateless 폴백 호출
- `src/__tests__/session-health.e2e.test.ts` — stale 기대값 404 → 200 + 세션 미등록
- `AGENTS.md` — stale 세션 폴백 컨벤션
- `.claude-project/memory/` — 메모리 2건 + MEMORY.md 인덱스
