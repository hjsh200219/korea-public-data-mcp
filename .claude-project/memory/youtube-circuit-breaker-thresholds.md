---
name: youtube-circuit-breaker-thresholds
description: YoutubeCircuitBreaker 임계값 — 연속 실패 3회 초과(4회째) open, 60초 후 half-open
type: project
created: 2026-05-03
---

`YoutubeCircuitBreaker`: 연속 인프라 실패 `FAILURE_THRESHOLD`(=3) 초과 시(4회째) open 전환, `OPEN_DURATION_MS`(60초) 후 half-open 자동 복구. `NO_SUBTITLES`는 카운터 미포함(영상별 정상 상태). `YOUTUBE_CIRCUIT_BREAKER_ENABLED=false`로 kill switch.

구현 위치: `src/youtube-circuit-breaker.ts` — `YoutubeCircuitBreaker` 클래스, `youtubeCircuitBreaker` 싱글톤.
`getTranscript`에서 진입 시 `isOpen()` 체크, 성공 시 `recordSuccess()`, 실패 시 `recordFailure(code)`.

**2026-06-24 변경 (threshold 6→3 + 누락 버그 수정):**
- 데이터센터 IP 봇차단은 대부분 `tryYtDlpClient`가 `{kind:"cascade"}`로 **반환**(throw 아님). 기존엔 종단 폴백 실패 throw(getTranscript 말미)에서 `recordFailure`를 **안 불러** BOT_DETECTED/PO_TOKEN 캐스케이드가 CB 카운터를 못 올렸음 → CB가 봇차단에 사실상 안 열림 → 502 무한 반복.
- 수정: `finalize()` 헬퍼가 종단 throw + 예산소진 조기 throw 경로에서 `recordFailure(finalReason)` 1회 호출(이중 카운트 금지 — cascade는 per-client catch 미경유). + threshold 6→3.
- 함께 도입된 데드라인: [[youtube-502-budget-deadline]].

**Why:** yt-dlp 연속 실패 시 모든 요청 ~90초 블로킹 + Cloudflare 502 해소. open 상태에서 즉시 에러 반환.

**How to apply:** 장애 시 `YOUTUBE_CIRCUIT_BREAKER_ENABLED=false`로 즉시 비활성화(재배포 불필요). half-open 회복(recordSuccess의 half-open→closed)·probe 하트빗과 결합되어 있으니 임계값 조정 시 회복 메커니즘 깨지지 않게 주의.
