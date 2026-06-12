---
created: 2026-06-12T11:50:00+09:00
project: k-public-data-mcp
summary: /health/youtube 프로브 늑대소년 버그 수정 — getTranscript 직접 호출로 서빙 경로 일치 + yt-dlp 2026.06.09 업데이트, 배포 검증 완료
---

## Session Digest

"K-Data MCP youtube가 안 된다"는 신고 조사. 실제로는 **서버·youtube 툴 모두 정상**(라이브 get_transcript 성공). 이전 세션이 deferred MCP 툴을 ToolSearch로 안 불러 "서버 down"으로 오진한 것. 진짜 버그는 `/health/youtube` 합성 프로브가 쿠키없는 web `yt-dlp --dump-json`(video formats 요구)으로 돌아 Railway 데이터센터 IP에서 항상 봇 차단을 맞아 `status:down` 오보를 낸 것(늑대소년). 프로브를 실제 도구 `getTranscript()` 직접 호출로 바꿔 서빙 경로(android_vr→tv→web 캐스케이드+쿠키 폴백)와 100% 일치시킴. 동시에 yt-dlp 핀 3개월 묵은 것(2026.03.17→2026.06.09) 업데이트. 커밋 2개(defba0f, 1d47f5d) master push + 2회 Railway 재배포 검증 완료.

## Progress

### 완료
- 진단: `/health` ok(v6.0.0)이나 `/health/youtube` status:down. 배포 쿠키+yt-dlp로 로컬(가정 IP) 프로브 영상 정상 추출 → 쿠키·버전 문제 아님 확정. Railway 데이터센터 IP 봇탐지 + 프로브 자체 결함이 원인.
- `src/youtube-probe.ts` `_runProbe()` — 자체 yt-dlp 명령 제거, `getTranscript(PROBE_VIDEO_ID, PROBE_LANG)` 직접 호출. `PROBE_LANG`(기본 en), `YOUTUBE_PROBE_LANG` env 추가. errorCode는 `TranscriptError.code`로 기록.
- `src/youtube-probe.test.ts` — getTranscript 호출 검증(자체 yt-dlp 회귀 방지) + 성공/실패(code 추출) hoisted-mock 테스트 추가. 11/11 통과.
- `Dockerfile` — yt-dlp 2026.03.17 → 2026.06.09.
- 문서: AGENTS.md 프로브 컨벤션 1줄 추가, memory `youtube-health-probe-endpoint` 갱신 + MEMORY.md 인덱스 추가, 허브노트 `_vault/projects/k-public-data-mcp.md` 결정 기록.
- 검증: 빌드 clean, lint 0, 전체 1056 통과. 배포 후 첫 프로브 사이클(11:43:32) 성공 → status healthy 복귀, ytdlp 2026.06.09 확인. 라이브 get_transcript 정상.

### 중간 시행착오 (기록용)
- 1차(defba0f): 프로브를 android_vr 단독 자막 추출로 변경 → 실측 `degraded`(android_vr 단독은 데이터센터서 간헐 실패, 실제 도구는 캐스케이드로 살아남음). 2차(1d47f5d)에서 getTranscript 직접 호출로 바로잡음.
- android_vr + `--cookies` 동시 사용 시 yt-dlp가 `"Skipping client android_vr since it does not support cookies"`로 클라이언트 통째 스킵 → 실패. android_vr엔 쿠키 주면 안 됨.

## Next Steps (우선순위)
1. **쿠키 자동 sync 안정화** — `sync-youtube-cookies.sh`(launchd 08:00)가 06-10~12 3일 연속 FAIL(Chrome 로그아웃/Profile 4 미로그인). 오늘 08:07 수동 복구. 재발 방지: Chrome Profile 4 YouTube 로그인 상시 유지, 또는 sync FAIL 3연속 시 텔레그램 알림 강화. android_vr는 쿠키 불필요라 비치명적이나 tv/web 폴백엔 필요.
2. **cookiePool 메트릭 cosmetic 오표기 정리** — `/health/youtube`의 `cookiePool: expired -1d`는 단일 YOUTUBE_COOKIES 모드(POOL 미사용)에서 vestigial. `youtube-cookie-pool.ts getHealthInfo()`가 POOL 미설정 시 expired 기본값 반환하는 듯 — 단일 쿠키 모드면 실제 YOUTUBE_COOKIES 만료를 반영하거나 null 표기하도록 개선.
3. (이월) gov24-ai health/canary probe, multi-turn cnvrsId — 2026-06-03 핸드오프 유지.

## Blockers
없음.

## Watch Out
- **프로브 = 서빙 경로**: `youtube-probe._runProbe`는 반드시 `getTranscript`를 그대로 호출해야 함. 자체 yt-dlp 명령으로 복제하면 캐스케이드/쿠키 폴백 누락 → 늑대소년 재발. (AGENTS.md 컨벤션 추가됨)
- **서킷 브레이커 결합 의도적**: 프로브 실패가 브레이커에 기록됨. 흔한 실패(BOT/PO_TOKEN/RATE_LIMITED)는 실유저도 겪는 인프라 장애라 정상. NO_SUBTITLES는 트립 제외. 프로브 영상 영구 삭제 리스크는 `YOUTUBE_PROBE_VIDEO_ID` env 교체로 완화.
- **yt-dlp 핀**: Dockerfile에 버전 하드코딩. YouTube 봇탐지/`"No title found in player responses"` 반복 시 최신 stable로 재bump(런북 처방).
- **Railway 도메인**: 공개 URL은 `https://public-data.up.railway.app` (서비스명 korea-public-data-mcp). `korea-public-data-mcp-production.up.railway.app`은 존재 안 함(404).
- **verify-docs EXPECTED**: 19/16/16 (이번 변경은 도메인/스킬 증감 없음).

## Files Touched
- `src/youtube-probe.ts` — _runProbe getTranscript 호출로 재작성, PROBE_LANG 추가
- `src/youtube-probe.test.ts` — getTranscript mock 테스트
- `Dockerfile` — yt-dlp 2026.06.09
- `AGENTS.md` — 프로브 컨벤션
- `.claude-project/memory/youtube-health-probe-endpoint.md`, `.claude-project/MEMORY.md` — 메모리 갱신
