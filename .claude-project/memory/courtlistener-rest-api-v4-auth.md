---
name: courtlistener-rest-api-v4-auth
description: CourtListener v4 — search anon OK, detail 401 without token, public domain
type: reference
created: 2026-04-28
---

CourtListener REST API v4 (`https://www.courtlistener.com/api/rest/v4/`)
- 검색 엔드포인트(`/search/?q=...`)는 토큰 없이 anonymous 호출 가능 (live 검증)
- 단건 조회(`/opinions/{id}/`)는 토큰 없으면 **401 Unauthorized** 반환 (live 검증)
- 토큰 발급: https://www.courtlistener.com/profile/api/
- 인증 헤더: `Authorization: Token <token>`
- 레이트리밋: 인증 시 시간당 5,000건
- 라이선스: Public Domain Mark — 재배포·상용 이용 가능
- 환경변수: `COURTLISTENER_API_TOKEN` (없으면 검색만 동작)

**Why:** 검색만 anon이고 상세는 토큰이 필요해서 동작은 하지만 일부만 되는 헷갈리는 상황을 막기 위함.
**How to apply:** 외국 판례(미국) 통합 시 두 엔드포인트의 인증 차이를 처음부터 명시. 토큰 없으면 detail 도구는 비활성화.
