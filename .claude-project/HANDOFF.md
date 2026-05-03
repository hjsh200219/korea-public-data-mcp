---
created: 2026-05-03T15:35:00+09:00
project: k-public-data-mcp
summary: YouTube 자막 추출 안정화 (서킷 브레이커 + 쿠키 풀 + 헬스 프로브) 구현 완료
---

## Session Digest

YouTube 자막 추출 안정화를 위한 6개 US 전체 구현 완료. `TranscriptErrorCode` enum + `TranscriptError` 클래스로 오류를 구조화하고(US-001), `YoutubeCircuitBreaker`로 연속 실패 시 자동 차단(US-002), `YoutubeCookiePool`로 쿠키 로테이션(US-003), `YoutubeProbe` + `/health/youtube` 엔드포인트로 실시간 헬스 체크(US-004), CI 브랜치 + yt-dlp 버전 고정 + canary 테스트(US-005), `refresh-youtube-cookies.ts` 스크립트 + `runbook-youtube.md`(US-006) 추가. 추가로 `product_review` `find_reviews`의 description 매칭 개선 및 `YOUTUBE_COOKIES` Netscape 헤더 자동 추가 수정도 이번 세션에 포함.

## Progress

- **완료**:
  - US-001: `TranscriptErrorCode` enum + `TranscriptError` 클래스 — 구조화된 오류 타입
  - US-002: `YoutubeCircuitBreaker` — 연속 실패 시 자동 차단 + 복구 로직
  - US-003: `YoutubeCookiePool` — 다중 쿠키 로테이션 (`YOUTUBE_COOKIES_POOL` 환경변수)
  - US-004: `YoutubeProbe` + `/health/youtube` REST 엔드포인트
  - US-005: CI 브랜치 설정 + yt-dlp 버전 고정 (`2026.03.17`) + canary 테스트
  - US-006: `scripts/refresh-youtube-cookies.ts` + `docs/runbook-youtube.md`
  - `product_review` `find_reviews` description 매칭 개선 (`matchesQuery()` 토큰 분리) — `fd73857`
  - `YOUTUBE_COOKIES` Netscape 헤더 자동 추가 수정
  - 빌드 + 테스트 통과, push 완료

- **미완료 (인계)**:
  - Smithery 마켓플레이스 등록 승인 대기
  - `awesome-mcp-servers` GitHub PR 미제출
  - `youtube-api.ts` 파일 분리 (622줄 → transcript/data-api/channel 분리) — follow-up 티켓

## Next Steps

1. Railway 재배포 후 `/health/youtube` 엔드포인트 동작 확인
2. `YOUTUBE_COOKIES_POOL`에 쿠키 2개 설정 (현재 단일 쿠키로 동작 중)
3. Smithery 대시보드에서 등록 승인 상태 확인 → 승인 시 README/CLAUDE.md에 배지·링크 추가
4. `awesome-mcp-servers` GitHub 리포 PR 제출
5. `youtube-api.ts` 파일 분리 follow-up 티켓 생성

## Blockers

- Smithery 마켓플레이스 등록: 외부 심사 대기 (액션 불필요, 확인만)
- `YOUTUBE_COOKIES_POOL`: Railway 환경변수에 실제 쿠키 2개 이상 설정 필요 (현재 단일 동작)

## Watch Out

- **yt-dlp 버전 고정**: Dockerfile에 `2026.03.17` 고정. 업그레이드 시 nightly canary 통과 후 Dockerfile 수동 범프 필요. 임의 업그레이드 금지.
- **`YOUTUBE_COOKIES_POOL`**: Railway 환경변수 32KB 이내 유지. 쿠키 파일 크기 주의.
- **`/health/youtube`**: Railway 배포 후 `GET /health/youtube` 응답 확인 권장. 서킷 브레이커 상태(open/closed) 포함 반환.
- **prompts.ts prompt 수**: 현재 7개. e2e count 단순 숫자 비교 방식이므로 prompt 추가/삭제 시 `mcp-server.e2e.test.ts` count 값 동기화 필요.
- **쿠키 3종 변수 구분**:
  - `YOUTUBE_COOKIES_FROM_BROWSER` — 로컬 stdio 전용
  - `YOUTUBE_COOKIES` — Railway 배포 단일 쿠키
  - `YOUTUBE_COOKIES_POOL` — 다중 쿠키 로테이션 (새 변수, US-003)
- **쿠키 갱신 SOP** (만료 시):
  1. `yt-dlp --cookies-from-browser chrome --cookies /tmp/yt_cookies.txt --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`
  2. `.youtube.com` / `.google.com` 라인만 필터링 (~6KB)
  3. `railway variables --set YOUTUBE_COOKIES="$(cat /tmp/yt_filtered.txt)"` 후 재배포
  4. 또는 `scripts/refresh-youtube-cookies.ts` 사용 (US-006 산출물)
- **`matchesQuery()` 변경**: title exact match 제거됨 — 토큰 단위 매칭으로 전환. 매우 짧은 쿼리(1글자 등) 오탐 가능성 주의.
- **`youtube.md`**: `product_review` 스킬 채널 소스 — 삭제·이동 시 `find_reviews` 동작 불가. `#` 주석 줄은 `parseYoutubeMdChannels()`가 자동 무시.
- **`registerSkillTool()` 사용**: `outputSchema` 자동 주입 → `structuredContent`도 함께 반환됨. 직접 `server.registerTool()` 사용 시 수동 처리 필요.
- **smithery.yaml title/description 형식**: `"English / 한글"` (영문 우선, ` / ` 구분자 고정).
- **수출입은행 도메인**: `oapi.koreaexim.go.kr` 고정. `www.*` 잔재 없는지 grep 권장.
- **쿠키 만료 알림 Remote 루틴**: `trig_013jaxkLuRLDkpk71g49tJxB` (매주 월요일 09:00 KST)

## Files Touched

- `src/tools/youtube/transcript-error.ts` — `TranscriptErrorCode` enum + `TranscriptError` 클래스 (US-001)
- `src/tools/youtube/circuit-breaker.ts` — `YoutubeCircuitBreaker` (US-002)
- `src/tools/youtube/cookie-pool.ts` — `YoutubeCookiePool` (US-003)
- `src/tools/youtube/probe.ts` — `YoutubeProbe` (US-004)
- `src/routes/health-youtube.ts` — `/health/youtube` REST 엔드포인트 (US-004)
- `Dockerfile` — yt-dlp 버전 고정 `2026.03.17` (US-005)
- `scripts/refresh-youtube-cookies.ts` — 쿠키 갱신 스크립트 (US-006)
- `docs/runbook-youtube.md` — YouTube 운영 런북 (US-006)
- `src/tools/skills/product-review.ts` — `matchesQuery()` description 매칭 개선, YouTube 키워드 강화
- `src/tools/skills/prompts.ts` — `제품리뷰_워크플로` MCP Prompt 추가 (prompt 수: 7개)
- `src/tools/skills/product-review.test.ts` — description 매칭 테스트 케이스 추가
- `src/__tests__/mcp-server.e2e.test.ts` — prompt count 업데이트
