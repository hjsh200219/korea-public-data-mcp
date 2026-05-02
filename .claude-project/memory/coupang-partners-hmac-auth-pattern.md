---
name: coupang-partners-hmac-auth-pattern
description: 쿠팡 파트너스 API HMAC-SHA256 인증 헤더 구현 패턴
type: reference
created: 2026-05-03
---

쿠팡 파트너스 오픈 API는 CEA(Custom HMAC) 방식으로 인증한다.

**서명 메시지 구성**: `{yymmddTHHMMSSZ}{METHOD}{path}{queryString}`
- datetime: ISO 문자열에서 `slice`로 조합 (`yymmddTHHMMSSZ`, GMT 기준)
- queryString: `?` 없이 순수 쿼리 문자열만 포함
- Authorization 헤더: `CEA algorithm=HmacSHA256, access-key={ak}, signed-date={dt}, signature={hex}`

**환경변수**: `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`
**엔드포인트**: `https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/products/search`
**Rate Limit**: 시간당 10회 (429 처리 필요)
**캐시**: 1h TTL, 최대 100 엔트리 (Map 기반)

구현 위치: `src/coupang-api.ts` — `buildCoupangAuthHeader`, `formatCoupangDate`

**Why:** datetime 포맷이 표준 ISO와 다르고 queryString에 `?` 포함 여부가 서명 오류의 주요 원인.
**How to apply:** 새 쿠팡 API 엔드포인트 추가 시 동일한 `buildCoupangAuthHeader` 재사용. queryString은 항상 `?` 제거 후 전달.
