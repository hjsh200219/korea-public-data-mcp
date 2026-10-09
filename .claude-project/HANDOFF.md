---
created: 2026-10-09T09:15:00+09:00
project: k-public-data-mcp
summary: YouTube 서버 자막 RATE_LIMITED — 429 를 캐스케이드 사유로 바꾸는 수정 배포(1cbb608), 재배포 뒤 한·영 영상 자막·요약 라이브 복구
---

## Session Digest

사용자 보고: Claude Chat 의 K-Data MCP 에서 유튜브 요약이 `RATE_LIMITED` 로 실패. 운영에 직접 호출해 재현(한국어 `0K52Ex714NU`·영어 `uLqBKa2dCUA` 모두 429). 같은 영상·같은 yt-dlp 인자로 로컬은 정상 → 서버 출구 문제. 영어 영상의 `BOT_DETECTED` 는 열린 서킷 브레이커가 붙인 사유였다.

코드 결함: `tryYtDlpClient` 가 429 에서 즉시 throw → 쿠키 받는 `tv_embedded`/`web_embedded`·Python 폴백 미실행, 실패 로그 0줄. `RATE_LIMITED` 를 캐스케이드 사유(우선순위 최상)로 바꾸고 429 판정을 `stripCommandEcho` 뒤 `http error 429` 로 좁혔다.

## Progress

- [x] `1cbb608` fix(youtube): 429 캐스케이드 — 새 테스트(android_vr 429 → tv_embedded 성공)는 고치기 전 코드에서 red 확인
- [x] CI 동일 검사 로컬 통과(typecheck·lint·verify-docs·dead-code·verify-harness-meta·test:coverage 1132 passed·build), GitHub CI success
- [x] push → Railway 자동 배포 `81f2697e` SUCCESS → 두 영상 `get_transcript`(721·68 세그먼트)·`summarize` 라이브 성공
- 주의: 복구 시점 로그에 `yt-dlp 시도 실패` 0줄 = `android_vr` 가 바로 성공. 새 코드 경로가 아니라 재배포(09-28 이후 첫 배포)가 복구시킨 것

## Next Steps

- 10-20 전후 런북 A1b 판정 — 09-27 이후 `get_transcript` 81건(ok 32·fail 49)으로 이미 기준(≥20) 초과. 사용자 결정 필요
- 다시 429 가 나면 Railway 로그 `yt-dlp 시도 실패` 원문으로 쿠키 클라이언트도 429 인지 확인

## Watch Out

- `SYNC_SKIP_REDEPLOY=1` 이라 쿠키 env 는 매일 갱신돼도 컨테이너는 배포 때까지 옛 상태

## Files Touched

- src/youtube-api.ts · src/youtube-api.test.ts · docs/runbook-youtube.md · AGENTS.md · .claude-project/
