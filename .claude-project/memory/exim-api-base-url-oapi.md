---
name: exim-api-base-url-oapi
description: 수출입은행 API 베이스 도메인 — oapi.koreaexim.go.kr (구 www 도메인 폐기)
type: reference
created: 2026-05-03
---

수출입은행 환율/금융 API의 베이스 도메인은 `oapi.koreaexim.go.kr`이다.
구 도메인 `www.koreaexim.go.kr`은 사용하지 않는다.

**엔드포인트 예시**:
- `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON`

**적용 파일**: `src/exim-api.ts`, `src/exim-types.ts`

리다이렉트(`location` 헤더) 처리 시에도 `oapi.koreaexim.go.kr` 기준으로 URL을 조립한다.

**Why:** 구 도메인으로 요청하면 API 응답이 실패한다. 도메인 변경 이력이 있으므로 코드에 www 도메인이 남아 있으면 즉시 교체해야 한다.
**How to apply:** `exim-api.ts`에서 `BASE_URL` 상수 또는 URL 문자열이 `www.koreaexim.go.kr`이면 `oapi.koreaexim.go.kr`로 변경한다.
