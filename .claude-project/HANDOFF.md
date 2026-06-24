---
created: 2026-06-24T20:15:00+09:00
project: k-public-data-mcp
summary: youtube 도구 Cloudflare 502 수정 — 전역 데드라인(25s)+시도당 타임아웃(8s)+CB threshold 6→3+종단 recordFailure 누락 버그. 커밋 c727042 배포·라이브 검증 완료
---

## Session Digest
remote(Railway) youtube 도구가 모든 yt-dlp 경유 액션에서 Cloudflare **502 Bad Gateway**로 실패하던 문제 수정. 원인: 데이터센터 IP 봇차단 시 `getTranscript` 캐스케이드(클라이언트 3회×30s + Python 폴백)가 90s+ 걸려 claude.ai/Cloudflare 게이트웨이 한도(~60-100s)를 초과 → 오리진 불완전 응답 = 502. 부가로 데이터센터 봇차단은 대부분 `{kind:"cascade"}` 반환(throw 아님)이라 종단 폴백 실패 throw에서 `recordFailure`가 누락 → CB가 봇차단에 안 열려 502 무한 반복.

수정(옵션 A, "502 죽이기" — 추출 자체 복구 아님): 전역 예산 `YOUTUBE_TOTAL_BUDGET_MS`(25s) + 시도당 `YTDLP_ATTEMPT_TIMEOUT_MS`(8s) + `BUDGET_FLOOR_MS`(3s)로 핸들러를 항상 ~25s 내 반환시켜 502 대신 깔끔한 한국어 에러. `finalize()` 헬퍼로 종단/예산소진 throw에서 `recordFailure` 1회(이중 카운트 금지). CB `FAILURE_THRESHOLD` 6→3.

## Progress
- [x] 진단: MCP 호출 502(origin_bad_gateway) 확인, 핸드셰이크는 200(서버 정상) → 도구 실행만 502
- [x] 쿠키 동기화 정상 확인(당일 08:00 OK), 로컬 yt-dlp 정상(en 추출 성공) → 원인은 데이터센터 IP + 핸들러 타임아웃 구조
- [x] `src/youtube-api.ts` 전역 데드라인/시도당 타임아웃/예산 가드 (TDD)
- [x] `finalize()` 종단 recordFailure 누락 버그 수정 (TDD)
- [x] `src/youtube-circuit-breaker.ts` FAILURE_THRESHOLD 6→3 + `_reset()` 테스트 헬퍼
- [x] `docs/env.md` 신규 env 2개 문서화
- [x] 검증: lint/type/build/verify-docs/knip 클린, test 1067 passed/31 skipped/0 failed
- [x] 커밋 `c727042` 푸시 → Railway 자동 재배포(이미지 push 11:07 UTC)
- [x] **라이브 검증**: 배포 후 MCP `get_transcript` 정상(61세그먼트), 502 사라짐

## Next Steps
1. (선택) 추출 자체 복구 = 데이터센터 IP 봇차단 정공법: residential 프록시(`--proxy $YTDLP_PROXY` 한 줄) 또는 추출을 residential 워커로 오프로드. 옵션 B/C — 사용자 결정 대기.
2. ko 자막은 timedtext 429 영향이 더 큼 — 봇차단 심해지면 위 프록시 없이는 ko 추출 실패율 상승 가능. 모니터링.
3. `youtube-probe` 헬스 프로브가 새 threshold(3)에서 과민 오픈 안 하는지 운영 관찰.

## Blockers
- 없음. 옵션 A는 배포·검증 완료. 옵션 B/C(추출 복구)는 자원(프록시 비용/워커) 결정 필요.

## Watch Out
- 이번 수정은 **502→빠른 에러 전환**이지 데이터센터 봇차단 추출 복구가 아님. android_vr가 통하는 영상은 정상 추출되나, 강하게 봇차단되는 영상은 여전히 깔끔한 에러로 실패할 수 있음(설계대로).
- CB threshold 3은 half-open 회복(recordSuccess)·probe 하트빗과 결합 — 임계값 조정 시 회복 메커니즘 보존.
- YouTube 요약 표준 경로는 여전히 **로컬 yt-dlp**(residential IP). MCP youtube는 모바일/claude.ai 웹용.

## Files Touched
- src/youtube-api.ts (전역 데드라인/시도당 타임아웃/예산 가드/finalize recordFailure)
- src/youtube-api.test.ts (TDD 통합 케이스)
- src/youtube-circuit-breaker.ts (FAILURE_THRESHOLD 6→3, _reset)
- src/youtube-circuit-breaker.test.ts
- docs/env.md (env 2개)
- AGENTS.md(=CLAUDE.md) (컨벤션 2줄), .claude-project/memory/ (CB 갱신 + 502 신규 + MEMORY.md 인덱스)
