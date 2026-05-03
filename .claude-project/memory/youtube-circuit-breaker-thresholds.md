---
name: youtube-circuit-breaker-thresholds
description: YoutubeCircuitBreaker 임계값 — 연속 실패 6회 open, 60초 후 half-open
type: project
created: 2026-05-03
---

`YoutubeCircuitBreaker`: 연속 실패 6회 초과 시 open 상태로 전환, 60초 후 half-open으로 자동 복구. `NO_SUBTITLES` 에러는 카운터 미포함(영상별 정상 상태). `YOUTUBE_CIRCUIT_BREAKER_ENABLED=false`로 kill switch 가능.

구현 위치: `src/youtube-circuit-breaker.ts` — `YoutubeCircuitBreaker` 클래스, `youtubeCircuitBreaker` 싱글톤.
`getTranscript`에서 진입 시 `isOpen()` 체크, 성공 시 `recordSuccess()`, TranscriptError 시 `recordFailure(code)`.

**Why:** yt-dlp가 연속 실패 시 모든 요청을 ~90초 블로킹하는 문제 해소. open 상태에서 즉시 에러 반환.

**How to apply:** 장애 시 `YOUTUBE_CIRCUIT_BREAKER_ENABLED=false` 설정으로 즉시 비활성화(재배포 불필요). 추가 외부 API 도구 구현 시 동일 패턴 참고.
