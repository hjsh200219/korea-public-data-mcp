---
name: fetch-with-retry-429-test-timeout
description: 429 응답 모킹 테스트는 vitest 기본 5s 타임아웃을 늘려야 함 (재시도 백오프 7s 소요)
type: project
created: 2026-04-29
---

`http-client.ts` 의 `fetchWithRetry` 는 `RETRYABLE_STATUS_CODES = new Set([429, 503])` 에 따라 429 응답을 자동 재시도한다. 백오프는 `retryDelayMs * 2^attempt` 이고 기본 `MAX_RETRIES=3, RETRY_DELAY_MS=1000` 일 때 누적 1+2+4=7초 대기.

따라서 fetch mock 으로 항상 429 를 반환하는 테스트는 vitest 기본 5초 타임아웃을 초과해 실패한다. 해결: `it("...", async () => { ... }, 15000);` 형태로 테스트 수준 타임아웃 명시.

**Why:** `courtlistener-api.test.ts` C-2 통합 시 "HTTP 429 → 한도 안내 한글 에러" 테스트가 `Test timed out in 5000ms` 로 실패. 함수의 한도 초과 메시지 자체는 정상 작동했으나, 재시도가 끝날 때까지 throw 되지 않아 타임아웃 발생.

**How to apply:** 새 API 클라이언트의 429/503 한글 에러 메시지를 검증할 때마다 테스트 타임아웃을 백오프 합 + 1~2초 여유로 설정. 또는 mock 함수가 첫 호출만 429, 이후는 다른 결과를 반환하도록 하여 재시도 경로를 단축.
