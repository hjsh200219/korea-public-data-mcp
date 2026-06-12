---
name: youtube-health-probe-endpoint
description: /health/youtube 엔드포인트 + YoutubeProbe 5분 주기 합성 프로브
type: project
created: 2026-05-03
updated: 2026-06-12
---

`YoutubeProbe`가 5분 주기(`setInterval`)로 `YOUTUBE_PROBE_VIDEO_ID`(기본 `jNQXAC9IVRw`) 영상에 대해 **실제 도구 `getTranscript(id, "en")`를 그대로 호출**해 헬스 체크 (2026-06-12 변경, 커밋 1d47f5d).
`/health/youtube` REST 엔드포인트(GET): `status`, `lastSuccess`, `consecutiveFailures`, `lastErrorCode`, `cookiePool[n].expiresIn`, `ytdlpVersion`, `circuitBreaker` 반환.
연속 3회 실패 시 `console.error` (Railway Observability 알림 연동).
`YOUTUBE_PROBE_ENABLED=false`로 비활성화. 영상 교체 `YOUTUBE_PROBE_VIDEO_ID`, 언어 `YOUTUBE_PROBE_LANG`(기본 en).

구현: `src/youtube-probe.ts` — `YoutubeProbe`, `youtubeProbe` 싱글톤. `_runProbe()`가 `getTranscript` 호출.
`src/remote.ts`: `/health/youtube` 엔드포인트, 서버 시작 시 `youtubeProbe.start()`.

**Why:** 쿠키 만료/봇 차단 선제 감지(TTD < 5분). **프로브는 반드시 서빙 경로(getTranscript)와 동일해야** "실제 tool은 멀쩡한데 프로브만 down"인 늑대소년이 안 생긴다.

**과거 버그(2026-06-12 수정):** 프로브가 쿠키없는 web `yt-dlp --dump-json`(video formats 요구)을 돌려서 Railway 데이터센터 IP에서 **항상** 봇 차단(`"No title found in player responses"`)을 맞아 `status:down` 오보 — 실제 youtube 툴(android_vr→tv→web 캐스케이드)은 정상이었음. android_vr 단독 자막 추출도 부족(실측 degraded): 실제 도구는 캐스케이드·쿠키 폴백으로 살아남기 때문. → `getTranscript` 직접 호출로 일원화. 서킷 브레이커 결합은 의도적(프로브=실제 추출=half-open 회복 하트비트). 관련 [[youtube-yt-dlp-client-selection]] [[yt-dlp-partial-write-on-exit1]] [[youtube-transcript-error-code-priority]].

**How to apply:** 장애 감지 1단계: `GET /health/youtube`에서 `status: "down"` 확인. 주의 — `cookiePool[n].warning: "expired"`는 `status`와 무관한 cosmetic 메트릭일 수 있음(단일 `YOUTUBE_COOKIES` 모드에선 POOL이 vestigial, 실제 쿠키는 미래만료여도 expired로 표기). 진짜 신호는 `status`/`consecutiveFailures`/`lastErrorCode`(TranscriptError.code).
