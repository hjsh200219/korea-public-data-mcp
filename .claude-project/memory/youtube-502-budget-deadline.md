---
name: youtube-502-budget-deadline
description: youtube 도구 502 원인(캐스케이드 90s+ > 게이트웨이 한도) + 전역 데드라인/시도당 타임아웃 수정
type: project
created: 2026-06-24
---

## 증상
remote(Railway) youtube 도구 호출이 **Cloudflare 502 Bad Gateway**(`origin_bad_gateway`, retryable)로 실패. `get_transcript`/`summarize`/`video_info`(yt-dlp 폴백 시) 등 yt-dlp 경유 액션 전부. MCP 핸드셰이크(initialize/tools_list)는 200 — **서버 프로세스는 정상**, 특정 도구 실행만 502.

## 원인
`getTranscript` 캐스케이드 = 쿠키 있을 때 클라이언트 `["android_vr","tv","web"]` 3회, 각 yt-dlp **시도당 30s** + Python 폴백. 데이터센터 IP([[railway-region-youtube-blocking]])에서 전부 봇차단되면 worst-case **90s+** 소요 → claude.ai/Cloudflare 게이트웨이(~60-100s)가 먼저 끊음 → 오리진 불완전 응답 = 502. yt-dlp는 계속 돌지만 응답이 클라이언트에 안 닿음.

## 수정 (2026-06-24, 커밋 c727042)
`src/youtube-api.ts`:
- `YTDLP_ATTEMPT_TIMEOUT_MS`(env, 기본 **8000**) — 기존 하드코딩 30_000 대체, `tryYtDlpClient` 파라미터화.
- `YOUTUBE_TOTAL_BUDGET_MS`(env, 기본 **25000**) — `getTranscript` 시작 시 deadline 계산.
- `BUDGET_FLOOR_MS`(3000) — 각 클라이언트 시도 전 남은 예산이 floor 미만이면 캐스케이드 중단(break), per-attempt 타임아웃 = `min(8000, 남은예산)` 클램프, Python 폴백도 예산 가드.
- 핸들러가 **항상 ~25s 내 반환** → 게이트웨이 한도 밑 → 502 대신 깔끔한 한국어 `isError`.
- 종단/예산소진 throw 경로에서 `recordFailure` 호출(CB 연동, [[youtube-circuit-breaker-thresholds]]).

env 문서: `docs/env.md`. 검증: test 1067 passed. 배포 후 라이브 재검증 OK(get_transcript 정상).

**Why:** 추출 실패 자체(데이터센터 IP 봇차단)는 별개 문제(프록시/PO토큰/residential 워커 필요)지만, 그것이 **불투명 502**로 나타나면 진단·UX 최악. 예산 캡으로 빠른 명확 에러 + CB 정상 오픈 확보.

**How to apply:** remote 도구가 502(origin_bad_gateway)면 (1) 서버 다운 아님 — 도구 실행이 게이트웨이 한도 초과하는지 의심. (2) 장시간 subprocess(yt-dlp 등)는 전역 데드라인 < 게이트웨이 한도로 캡하고 깔끔한 에러 반환. 관련: [[railway-youtube-429-transient]], [[youtube-yt-dlp-client-selection]].
