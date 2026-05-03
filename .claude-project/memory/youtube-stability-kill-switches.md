---
name: youtube-stability-kill-switches
description: YouTube 자막 추출 안정화 레이어의 환경변수 kill switch 3종 세트
type: reference
created: 2026-05-03
---

| 기능 | 환경변수 | 비활성값 | 재배포 필요 |
|------|----------|---------|-----------|
| 서킷 브레이커 | `YOUTUBE_CIRCUIT_BREAKER_ENABLED` | `false` | 불필요 |
| 합성 프로브 | `YOUTUBE_PROBE_ENABLED` | `false` | 불필요 |
| 쿠키 풀 | `YOUTUBE_COOKIES_POOL` | 환경변수 삭제 | 불필요 |

환경변수 변경은 Railway 재배포 없이 다음 요청부터 즉시 적용됨.

전체 롤백 절차 (`docs/runbook-youtube.md` 참조):
1. `YOUTUBE_CIRCUIT_BREAKER_ENABLED=false` → 브레이커 비활성화
2. `YOUTUBE_COOKIES_POOL` 삭제 → 단일 `YOUTUBE_COOKIES` 폴백
3. 여전히 실패 시 → `YOUTUBE_PROBE_ENABLED=false` → 프로브 중단

**Why:** 각 레이어가 독립적으로 비활성화 가능해야 장애 격리와 롤백이 신속함.

**How to apply:** 장애 시 서킷 브레이커부터 끄고, 그래도 안 되면 쿠키 풀 제거 → 단일 쿠키 폴백.
