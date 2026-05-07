---
name: youtube-fallback-langs-rate-limit-risk
description: 9-lang FALLBACK 일괄 요청은 timedtext 429 빈도 증가 리스크 — 운영 모니터 후 좁히기 검토 (PRD 후보)
type: project
created: 2026-05-07
---

`src/youtube-api.ts`의 `FALLBACK_LANGS = ["en", "en-US", "en-GB", "ja", "zh-Hans", "zh-Hant", "zh-TW", "zh-CN"]` (8개) + 요청 lang = 총 9개 언어를 한 번에 yt-dlp `--sub-lang`로 요청.

**리스크**: yt-dlp는 sub-lang을 순차 처리 → timedtext API 호출이 9배로 증가 → HTTP 429 빈도 상승. 본 세션(2026-05-07) 실측: 같은 영상 9-lang 요청은 첫 자막부터 429, 2-lang(ko,en)도 IP rate limit 누적 시 429.

**연관 메모리**: `yt-dlp-partial-write-on-exit1.md`의 "later language hits 429 → exit 1" 케이스가 이미 mitigation 처리됨 (부분 자막 파일이 있으면 반환). 그러나 발생 빈도는 lang 개수에 비례.

**Why:** 누락 없이 자막을 잡기 위한 broad fallback이지만, RATE_LIMITED/PO_TOKEN_REQUIRED 발생 빈도가 잦아지면 ROI 악화 + Circuit Breaker 잦은 트리거.

**How to apply:**
- 운영 메트릭에서 PO_TOKEN_REQUIRED/RATE_LIMITED 비율 모니터링
- 임계 이상이면 후속 PRD 작성 옵션:
  - (A) FALLBACK_LANGS를 ko/en/ja 3개로 좁히기 (일본어/중국어 자동자막 needs 검증 필요)
  - (B) per-language 분할 호출 (1차 ko 실패 → 2차 en 단독 호출)
  - (C) 요청 lang만 시도하고 fallback은 명시적 요청 시에만
- 현재(2026-05-07)는 monitor-only — production 배포 후 데이터 기반 결정
