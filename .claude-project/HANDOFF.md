---
created: 2026-10-09T21:58:00+09:00
project: k-public-data-mcp
summary: 로컬 /k-shopping 쿠팡 검색이 'Tool product_review not found' — YouTube 키 없으면 도구를 통째로 빼던 등록 게이트 수정(4d478c2) · 이전 세션 YouTube 429 캐스케이드 수정(1cbb608) 인계 유지
---

## Session Digest

사용자 `/k-shopping` 쿠팡 검색이 모든 질의에서 실패. 로컬 kpd 클라이언트(`~/.agents/skills/k-public-data/scripts/kpd.py`)는 YouTube 를 일부러 빼려고 `YOUTUBE_API_KEY` 를 서버에 넘기지 않는데, `registerProductReviewSkill` 이 YouTube 키 없으면 도구 전체를 스킵 → `coupang_search` 까지 사라짐. 게이트를 「YouTube 키 또는 쿠팡 키 쌍」으로 완화. kpd.py(repo 밖)는 `isError` 때 서버 문구를 같이 출력하도록 고침.

이전 세션(09:15): YouTube 서버 자막 RATE_LIMITED — 429 를 캐스케이드 사유로 바꾸는 수정 배포(1cbb608), 재배포 뒤 라이브 복구.

## Progress

- [x] `4d478c2` fix(product-review) — 새 등록 조건 테스트는 고치기 전 코드에서 red 확인
- [x] CI 동일 검사 로컬 통과(typecheck·lint·verify-docs·dead-code·verify-harness-meta·test:coverage·build) → push
- [x] 로컬 kpd 로 `coupang_search` 「와인 칠러 코퍼」 5건 라이브 성공, query 누락 시 서버 문구 출력 확인
- [x] (이전) `1cbb608` YouTube 429 캐스케이드 — CI·Railway 배포·라이브 확인

## Next Steps

- 10-20 전후 런북 A1b 판정 — 09-27 이후 `get_transcript` 81건(ok 32·fail 49)으로 이미 기준(≥20) 초과. 사용자 결정 필요
- 다시 429 가 나면 Railway 로그 `yt-dlp 시도 실패` 원문으로 쿠키 클라이언트도 429 인지 확인

## Watch Out

- 운영 Railway 는 YouTube 키가 있어 4d478c2 로 동작이 바뀌지 않는다 — 로컬 stdio(kpd) 경로 전용 수정
- kpd.py 는 git 밖(`~/.agents/skills/k-public-data/scripts/`) — 수정 이력은 이 인계서에만 있다
- `SYNC_SKIP_REDEPLOY=1` 이라 쿠키 env 는 매일 갱신돼도 컨테이너는 배포 때까지 옛 상태

## Files Touched

- src/tools/skills/product-review.ts · src/tools/skills/product-review.test.ts · (repo 밖) ~/.agents/skills/k-public-data/scripts/kpd.py · .claude-project/
