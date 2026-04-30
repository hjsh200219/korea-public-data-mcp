---
name: tdd-api-plus-skill-test-split
description: API client 테스트와 skill 테스트를 파일 분리하는 패턴 (tourism: 21 + 22개)
type: reference
created: 2026-04-30
---

신규 도메인 통합 시 테스트를 두 파일로 분리한다:
- `src/{domain}-api.test.ts` — HTTP client 레벨 단위 테스트: fetch mock, 파라미터 직렬화, 에러 처리
- `src/tools/skills/{domain}.test.ts` — MCP skill dispatcher 레벨 통합 테스트: action 라우팅, 필수 파라미터 검증, isError 응답

이전 도메인들(courtlistener, openlegaldata, tourism 등)도 동일 패턴을 따른다.

**Why:** API client와 skill dispatcher의 관심사가 다르므로 분리해야 실패 위치 파악이 빠르다.
**How to apply:** `{domain}-api.test.ts` + `tools/skills/{domain}.test.ts` 두 파일을 동시에 작성하며
TDD Red → Green → Refactor 사이클을 각각 독립적으로 돌린다.
