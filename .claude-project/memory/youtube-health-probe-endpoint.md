---
name: youtube-health-probe-endpoint
description: /health/youtube 엔드포인트 + YoutubeProbe 5분 주기 합성 프로브
type: project
created: 2026-05-03
---

`YoutubeProbe`가 5분 주기(`setInterval`)로 `YOUTUBE_PROBE_VIDEO_ID`(기본 `jNQXAC9IVRw`) 영상에서 yt-dlp `--dump-json` 실행.
`/health/youtube` REST 엔드포인트(GET): `status`, `lastSuccess`, `consecutiveFailures`, `lastErrorCode`, `cookiePool[n].expiresIn`, `ytdlpVersion`, `circuitBreaker` 반환.
연속 3회 실패 시 `console.error` (Railway Observability 알림 연동).
`YOUTUBE_PROBE_ENABLED=false`로 비활성화 가능.

구현: `src/youtube-probe.ts` — `YoutubeProbe`, `youtubeProbe` 싱글톤.
`src/remote.ts`: `/health/youtube` 엔드포인트, 서버 시작 시 `youtubeProbe.start()`.

**Why:** 쿠키 만료나 yt-dlp 봇 차단을 선제적으로 감지(TTD < 5분).

**How to apply:** 장애 감지 1단계: `GET /health/youtube` 응답에서 `cookiePool[n].warning: "expires_soon"` 또는 `status: "down"` 확인.
